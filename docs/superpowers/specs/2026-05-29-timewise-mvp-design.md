# TimeWise MVP 技术设计说明书

**状态**: PROD-READY
**日期**: 2026-05-29
**技术栈**: Chrome Extension MV3 | Dexie.js (Vanilla ESM) | Chart.js | 纯原生 CSS | Chrome i18n

---

## 1. 核心设计决策

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | AI 实现 | MVP 纯规则模板引擎（"假 AI · 真体验"），Pro 预留 `window.ai` / BYOK |
| 2 | Dashboard 入口 | 全屏独立标签页 + Badge 被动拉 |
| 3 | 域名分类 | 二元（productive/distracted），预留 `category` 字段 |
| 4 | 离线补偿 | 智能切片：≤60min 全补，>60min 补 45min + 余量归 afk |
| 5 | 数据留存 | MVP 不管，靠 `timestamp` B-Tree 索引扛住 |
| 6 | Badge 计算 | 累计生产力域名总时长 + 离线结算动态回滚 |
| 7 | 国际化 | Chrome 原生 `chrome.i18n`，Week 1 锁死 |
| 8 | 架构模式 | 方案 C 渐进式拆分（Hybrid） |

---

## 2. 项目文件树

```
timewise/
├── manifest.json              # MV3, ESM SW, 默认语种 en, __MSG_ 占位符
├── _locales/
│   ├── en/messages.json       # 英语语言包（主语种）
│   └── zh_CN/messages.json    # 中文简体语言包
├── background.js              # Service Worker 入口 — 事件路由 + 状态机
├── lib/
│   ├── dexie.mjs              # Dexie ESM 单文件 (~40KB)
│   ├── chart.min.js           # Chart.js 传统单文件 (Dashboard 专用)
│   ├── db.js                  # Dexie Schema + 原子 CRUD (无状态)
│   ├── classifier.js          # 域名→二元分类 + 子域穿透 (Week 3 抽出)
│   └── aggregator.js          # 心流检测 / 打碎度 / 周报数据 (Week 3 抽出)
├── ui/
│   ├── dashboard.html         # 全屏周报页面
│   ├── dashboard.js           # Chart.js 渲染 + chrome.i18n 文案
│   ├── toast.css              # Toast 样式 (内联注入 Shadow DOM)
│   └── toast.js               # Content Script — Shadow DOM + 消逝交互
├── assets/
│   └── icons/                 # 16/32/48/128px 扩展图标
└── tests/
    └── manual-checklist.md    # 5分钟 GitHub 肉身测试用例
```

### 文件职责边界

| 文件 | 职责 | 依赖 |
|------|------|------|
| `manifest.json` | MV3 声明、权限、i18n 占位符 | 无 |
| `background.js` | 监听 tabs/idle、维护计时状态机、Badge 刷新 | db.js, classifier.js |
| `lib/db.js` | 暴露 `db` 实例 + 原子 CRUD，绝对无状态 | dexie.mjs |
| `lib/classifier.js` | `extractDomain()` + `classify()` → `"productive"` / `"distracted"` / `null` | 无 (纯函数) |
| `lib/aggregator.js` | `detectFlow()` / `calcFragmentation()` / `buildWeeklyReport()` | 无 (纯函数) |
| `ui/toast.js` | Content Script: Shadow DOM 挂载 → 8s 消逝 → 用户输入监听 → 回调 SW | 无 |
| `ui/dashboard.js` | 从 db 读数据 → 跑 aggregator → 绑 Chart.js → `chrome.i18n` 文案 | db.js, aggregator.js, chart.min.js |
| `_locales/*/messages.json` | Chrome 原生 i18n 语言包，支持 `$1`-`$9` 参数注入 | 无 |

---

## 3. manifest.json

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "description": "__MSG_extDesc__",
  "version": "1.0.0",
  "default_locale": "en",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "permissions": ["tabs", "storage", "idle"],
  "action": {
    "default_title": "TimeWise"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["ui/toast.js"]
  }]
}
```

---

## 4. 国际化 (i18n)

### 英语语言包 `_locales/en/messages.json`

```json
{
  "extName": { "message": "TimeWise - Your Browser Time Cardiogram" },
  "extDesc": { "message": "Privacy-first, local-only browser time tracker that captures your flow and mental energy without a single network request." },
  "toast_question": { "message": "You've been away for $1 minutes, what were you doing?" },
  "tag_meeting": { "message": "Sync & Meetings" },
  "tag_desktop_focus": { "message": "Desktop App Focus" },
  "tag_afk": { "message": "AFK / Recharge" },
  "hero_warrior": { "message": "On $1, you locked in on $2 for $3h $4min like a flow state machine! Recreate this powerhouse mode next week." },
  "hero_good": { "message": "On $1, you stayed focused on $2 for $4min without single interruption. That deep engagement is your most valuable time asset." },
  "metric_flow_label": { "message": "Total Flow Time" },
  "metric_switch_label": { "message": "Avg Context Switches" },
  "metric_best_day_label": { "message": "Best Focus Day" },
  "chart_title": { "message": "Daily Flow Trend" },
  "experiment_title": { "message": "Next Week's Micro-Experiment" },
  "experiment_switching": { "message": "Your context switching frequency is on the high side. Next week, try locking in 9-11 AM as a no-interruption deep work block and mute all IMs." },
  "experiment_good_flow": { "message": "You've developed a solid flow habit. Next week's experiment: when you feel the sudden urge to switch tabs, push through for just 5 more minutes." },
  "experiment_default": { "message": "Your focus rhythm is building up steadily. Keep using TimeWise and unlock your personalized micro-experiment next weekend." },
  "no_data_hero": { "message": "Your data is safely building up! Stay focused on your core tools, and unlock your first high-performance flow report here next weekend." },
  "footer_privacy": { "message": "100% Local Storage · Zero Network Requests" },
  "day_sunday": { "message": "Sunday" },
  "day_monday": { "message": "Monday" },
  "day_tuesday": { "message": "Tuesday" },
  "day_wednesday": { "message": "Wednesday" },
  "day_thursday": { "message": "Thursday" },
  "day_friday": { "message": "Friday" },
  "day_saturday": { "message": "Saturday" }
}
```

### 中文语言包 `_locales/zh_CN/messages.json`

```json
{
  "extName": { "message": "TimeWise - 浏览器时间心电图" },
  "extDesc": { "message": "隐私优先、数据绝不离线的纯本地时间追踪器。帮你捕捉深度心流，揪出打碎时间的真正凶手。" },
  "toast_question": { "message": "你刚离开了 $1 分钟，这段时间在做什么？" },
  "tag_meeting": { "message": "沟通对齐 / 线上开会" },
  "tag_desktop_focus": { "message": "本地客户端专注" },
  "tag_afk": { "message": "离开座位 / 离线回血" },
  "hero_warrior": { "message": "$1你像个战神一样在 $2 里闭关了 $3 小时 $4 分钟！下周请务必复刻这个超神状态！" },
  "hero_good": { "message": "$1你在 $2 上连续专注了 $4 分钟不被打断。这种深度投入，就是你最值钱的时间资产。" },
  "metric_flow_label": { "message": "深度心流总时长" },
  "metric_switch_label": { "message": "平均上下文切换" },
  "metric_best_day_label": { "message": "最佳专注日" },
  "chart_title": { "message": "每日心流趋势" },
  "experiment_title": { "message": "下周微实验" },
  "experiment_switching": { "message": "你的上下文切换频率偏高。下周试试：每天锁定上午 9:00-11:00 为免打扰深度工作时段，关掉所有 IM 通知。" },
  "experiment_good_flow": { "message": "你本周已经形成了出色的心流习惯。下周微实验：在每次打算关掉工作页面去冲浪的那一瞬间，强迫自己再多坚持 5 分钟。" },
  "experiment_default": { "message": "你的专注节奏正在稳步建立。继续正常使用 TimeWise，下周此时你会收到第一份个性化微实验建议。" },
  "no_data_hero": { "message": "这周的数据还在积累中。多在生产力网站专注，周末此时你会收到第一份超神高光周报。" },
  "footer_privacy": { "message": "数据 100% 存储于本地 · 0 网络请求" },
  "day_sunday": { "message": "周日" },
  "day_monday": { "message": "周一" },
  "day_tuesday": { "message": "周二" },
  "day_wednesday": { "message": "周三" },
  "day_thursday": { "message": "周四" },
  "day_friday": { "message": "周五" },
  "day_saturday": { "message": "周六" }
}
```

---

## 5. 底层数据模型 (lib/db.js)

### Schema

```javascript
import Dexie from './dexie.mjs';

export const db = new Dexie('TimeWiseLocalDB');

db.version(1).stores({
  events: '++id, timestamp'  // 仅 timestamp 建 B-Tree 索引，其余为冷数据体
});
```

### 字段定义

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| `id` | `++` (自增) | 主键 | Dexie 自动生成 |
| `timestamp` | `number` | **是** | 事件发生的 Unix 秒级时间戳 |
| `duration` | `number` | 否 | 该活动持续的秒数 |
| `source` | `string` | 否 | `"browser"` (自动) 或 `"manual"` (离线补偿) |
| `domain` | `string` | 否 | 清洗后的主域名，如 `"github.com"` |
| `title` | `string` | 否 | 页面完整 Title，用于长线语义分析 |
| `idle_detected` | `boolean` | 否 | Chrome Idle API 判定结果 |
| `offline_tag` | `string?` | 否 | `"meeting"` / `"desktop_focus"` / `"afk"` / `null` |
| `category` | `string?` | 否 | `"productive"` / `"distracted"` / `null` (Week 3 开始写入) |

**为什么只索引 `timestamp`**: 所有聚合查询（心流、打碎度、周报）都是基于时间窗口的。先通过 `timestamp` B-Tree 范围查询拉出本周/本日数据（~150-2000 条），然后在 JS 内存中做 `reduce` 归类。对 `domain`、`category`、`source` 建立额外索引只会增加写入时的 B-Tree 维护开销，无查询收益。

### 暴露的 API

```javascript
export async function insertEvent(event) { ... }
export async function queryByRange(startTs, endTs) { ... }
export async function getTodayProductiveSeconds() { ... }
export async function getThisWeekEvents() { ... }
export function getWeekStart() { ... }
```

### 防御性时间函数

```javascript
export function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);  // 修正周日 getDay()=0 的 JS 暗坑
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return Math.floor(monday.getTime() / 1000);
}
```

---

## 6. Service Worker 状态机 (background.js)

### 内存状态对象

```javascript
let currentState = {
  domain: null,      // 当前计时的域名
  title: null,       // 当前页面标题
  startTime: null    // 本段开始的秒级时间戳
};
```

### 事件路由

```
chrome.tabs.onActivated  ──→ handleTabSwitch()
chrome.tabs.onUpdated    ──→ handleTabSwitch() (仅 url 变化时)
chrome.idle.onStateChanged ──→ handleIdleSwitch()
chrome.runtime.onMessage ──→ handleOfflineCompensation() (Toast 按钮回调)
chrome.action.onClicked  ──→ 打开 dashboard.html
setInterval(60s)         ──→ updateBadge()
```

### 关键流程

**标签切换**: `flushEvent()` 结算上一个域名 → `startNewSession()` 开启新计时
**Idle → Active**: 判定离线 ≥ 15min → 向 Content Script 发 `showToast` → 恢复计时
**Toast 回调**: 智能切片算法（≤60min 全补，>60min 前 45min 归用户标签 + 余量归 afk）
**Badge 刷新**: 每 60s 调用 `getTodayProductiveSeconds()` → `chrome.action.setBadgeText()`

### SW 终止防御

所有需要跨 SW 生命周期持久化的状态（`toastCountToday`、`toastDate`）存储在 `chrome.storage.local`。`currentSession` 不持久化——SW 在被杀死前会先触发 30s 空闲，此时 idle 事件会先调用 `flushEvent()` 完成落盘。下次 SW 被 `onActivated` 唤醒时，内存 `currentState` 重新初始化为 `null`，不会产生虚假记录。

---

## 7. Content Script Toast (ui/toast.js)

### 架构

- **样式隔离**: Shadow DOM (`mode: 'open'`)，`all: unset` 重置按钮
- **CSS 注入**: 内联 `<style>` 字符串（避免 `chrome.runtime.getURL` 的 CSP 限制）
- **消逝机制**: 8s 自动滑出 + 3s 缓冲期后监听 `scroll`/`keydown`/`mousedown`（点击 Toast 外部触发消逝）
- **幂等保护**: 检查 `#timewise-toast-host` 是否存在
- **死区穿透**: `:host { pointer-events: none }` + `.tw-toast-card { pointer-events: auto }`
- **完整清理**: `cleanup()` 解除所有三个事件监听器（scroll, keydown, mousedown）
- **i18n**: 所有文案通过 `chrome.i18n.getMessage()` 动态读取

---

## 8. 分类器与聚合器 (lib/classifier.js & lib/aggregator.js)

### classifier.js

- 两个 `Set`（`PRODUCTIVE_DOMAINS` / `DISTRACTED_DOMAINS`），~30 条规则
- `extractDomain(url)`: URL → hostname → 去 `www.`
- `classify(domain)`: 先 O(1) 全字匹配 → 子域名后缀穿透（如 `gist.github.com` → `github.com`）
- 未知域名返回 `null`（无感不干预）

### aggregator.js

**心流检测**: `detectFlowSegments(events, minDuration=1800)`
- 连续生产力域名 + 非 idle + source=browser → 合并相邻同域记录
- `MAX_GAP = 60s`: 超过 60s 的时间断层强制切断（防止跨午休/跨夜虚假长心流）
- 中断条件：域名改变 OR 非生产力 OR idle OR manual事件 OR 超过 MAX_GAP

**打碎度**: `calcFragmentation(events)`
- 按小时桶聚合，统计 `switches` 和 `domains.size`
- 归一化指数: `score = switches / max(domains.size, 1)`（高横跳 + 低域名数 = 深度焦虑/打碎）

**周报构建**: `buildWeeklyReportData(events)`
- 返回 `{ totalFlowSeconds, flowSegments, avgSwitchesPerHour, highlight, dailyFlow, flowSegmentsCount }`

---

## 9. Dashboard 周报 (ui/dashboard.html & dashboard.js)

### 布局

```
┌─ Hero (高光时刻 · 心流时长分级文案) ─┐
├─ 3 指标卡 (心流总时长 / 切换频率 / 最佳日) ─┤
├─ Chart.js 柱状图 (每日心流趋势) ─┤
├─ 微实验卡片 (单条纯文本建议) ─┤
└─ Footer (隐私声明) ─┘
```

### 视觉基调

- 背景 `#0d0d12`（极暗灰黑）
- 强调色 `#14b8a6`（极客青，单色调，无红/橙/警告色）
- 卡片使用半透明表面 `rgba(255,255,255,0.03)` + 微边框
- Chart.js 容器固定 `position: relative; height: 240px`（防止响应式死循环）

### "假 AI" 文案引擎

- 心流时长分 3 档：≥90min / ≥60min / ≥30min
- 每档 2-3 个模板，随机抽取
- 通过 `chrome.i18n.getMessage(key, [day, domain, hours, mins])` 参数注入
- 微实验 5 条模板，按数据条件匹配（高切换频率、低心流时长、心流段数多等）

### Badge 清除

打开 Dashboard 时调用 `chrome.action.setBadgeText({ text: '' })`，用户已"签收"周报。

---

## 10. 渐进式拆分演进路径

```
Week 1: background.js (all-in-one) + lib/db.js + _locales/
Week 2: + ui/toast.js + ui/toast.css + idle 判定链
Week 3: 从 background.js 扯出 lib/classifier.js + lib/aggregator.js
        (dashboard.js 同时引用它们)
Week 4: Dashboard 视觉闭环 + 打包上架
```

---

## 11. 验证标准

### Week 1 验收
打开 Chrome DevTools → Application → IndexedDB，肉身切换网页时，数据实时正确插入。通过"5 分钟 GitHub 测试用例"。

### 关键非功能指标
- 内存 < 30MB
- 单日数据写入量 ~150 条，体积 ≈ 30KB
- `timestamp` B-Tree 索引，范围查询 < 30ms
- Toast 每日触发 ≤ 4 次
- 0 网络请求
