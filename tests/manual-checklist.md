# TimeWise 手动验证清单

## 环境准备

1. 打开 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」→ 选择项目根目录
4. 确认扩展卡片出现 "TimeWise"（中文/英文取决于浏览器语言）
5. 点击卡片上的 "service worker" 链接打开 DevTools，确认有 `[TimeWise] Service Worker started` 日志

---

## 1. 数据采集 (Week 1)

### 1.1 标签切换写入
- [ ] 浏览 GitHub 任意页面持续 1 分钟
- [ ] 切换到 twitter.com 或 bilibili.com
- **预期**: SW Console 输出 `[TimeWise DB] Saved: github.com, <duration>s`
- [ ] 打开 DevTools → Application → IndexedDB → TimeWiseLocalDB → events
- **预期**: 存在 `domain: "github.com"`, `source: "browser"` 的记录，所有 9 个字段完整

### 1.2 同域名内导航不结算
- [ ] 在 GitHub 内从 Issues 跳到 PR（不切换标签页）
- [ ] 再切换到 twitter.com
- **预期**: 仅切换出 GitHub 时触发一次 `Saved: github.com`（同域不结算）

### 1.3 chrome:// 页面过滤
- [ ] 切换到 `chrome://extensions/`
- [ ] 再切回普通网页
- **预期**: 无任何 `Saved` 输出（chrome:// 被忽略）

### 1.4 子域名刷动过滤 (< 2s)
- [ ] 在两个标签页间快速切换（每次 < 2s）
- **预期**: < 2s 的停留不产生记录

### 1.5 Badge 更新
- [ ] 浏览 GitHub 数分钟（生产性域名）
- **预期**: 工具栏图标 Badge 显示 `X.Xh` 青色文字
- [ ] 切换到 bilibili 数分钟（非生产性域名）
- **预期**: Badge 数字仅统计 productive 时长，不增加

---

## 2. 空闲检测 & Toast (Week 2)

### 2.1 离开 15min 触发 Toast
- [ ] 浏览任意页面 → 锁定电脑/离开 ≥ 15 分钟 → 回来解锁
- **预期**: 当前页面右下角滑入 Toast，显示离开分钟数

### 2.2 Toast 三个按钮
- [ ] 依次触发并点击三个按钮：
  - [ ] 「沟通对齐 / 线上开会」→ Toast 消失
  - [ ] 「本地客户端专注」→ Toast 消失
  - [ ] 「离开座位 / 离线回血」→ Toast 消失
- [ ] 检查 IndexedDB，确认 `source: "manual"` 记录：
  - 线上开会 → `offline_tag: "meeting"`, `category: "productive"`
  - 本地客户端 → `offline_tag: "desktop_focus"`, `category: "productive"`
  - 离线回血 → `offline_tag: "afk"`, `category: "distracted"`

### 2.3 Toast 消逝
- [ ] 等待 8 秒 → Toast 自动滑出
- [ ] 再次触发，等 3 秒后滚动页面 → Toast 滑出
- [ ] 再次触发，等 3 秒后按任意键 → Toast 滑出
- [ ] 再次触发，等 3 秒后点页面空白 → Toast 滑出

### 2.4 每日 Toast 上限 (≤ 4 次)
- [ ] 当天触发第 5 次空闲返回
- **预期**: 不弹 Toast

### 2.5 离线补偿智能切片 (> 60min)
- [ ] 空闲 > 60 分钟后回来，点击「线上开会」
- **预期**: IndexedDB 出现 2 条记录：前 45min productive + 余量 afk

### 2.6 Badge 离线回滚
- [ ] 浏览 GitHub 5 分钟 → 锁屏 15 分钟 → 回来点「离线回血」
- **预期**: 之前 GitHub 时间不变，离线补偿记录正确插入

---

## 3. 分类器 & 聚合器 (Week 3)

### 3.1 域名分类
- [ ] 浏览以下域名，检查 IndexedDB `category` 字段：
  - [ ] github.com / stackoverflow.com / docs.google.com → `"productive"`
  - [ ] twitter.com / bilibili.com / reddit.com → `"distracted"`
  - [ ] 不在规则中的域名（如 example.com）→ `null`

### 3.2 子域名穿透
- [ ] 浏览 gist.github.com 或 mail.google.com
- **预期**: 子域匹配父域规则，category 正确

---

## 4. Dashboard 周报 (Week 4)

### 4.1 打开 Dashboard
- [ ] 点击工具栏 TimeWise 图标
- **预期**: 新标签页打开暗色 Dashboard，Badge 数字消失

### 4.2 内容渲染
- [ ] **Hero 区块**: 有 ≥ 30min 心流 → emoji + 高光文案；无数据 → "积累中"文案
- [ ] **三指标卡**: 分别显示 `X.Xh`、`X.X/h`、星期名称
- [ ] **柱状图**: 最近 7 天每日心流趋势，青色 Chart.js 柱
- [ ] **微实验**: 根据数据匹配建议文案
- [ ] **页脚**: "数据 100% 存储于本地 · 0 网络请求"

### 4.3 中文本地化 (zh_CN)
- [ ] 中文浏览器下：
  - [ ] 扩展名「TimeWise - 浏览器时间心电图」
  - [ ] Dashboard 所有标签/图表为中文
  - [ ] Toast 按钮为中文
  - [ ] Hero 文案为中文周几

### 4.4 零网络请求
- [ ] Dashboard 页面 F12 → Network → 刷新
- **预期**: 0 个网络请求

### 4.5 无 Console 错误
- [ ] Dashboard 页面 F12 → Console
- **预期**: 无红色报错，无 404

---

## 5. Service Worker 生命周期

### 5.1 Inactive 正常行为
- [ ] `chrome://extensions` 等待 30 秒 → SW 显示 "Inactive"
- [ ] 切换到任意标签页
- **预期**: SW 自动唤醒，非错误状态，无红色提示

### 5.2 Alarm 心跳
- [ ] 停止一切操作等待 2 分钟
- **预期**: Badge 每分钟更新（`chrome.alarms` 正常唤醒 SW）

---

## 通过标准

| 检查项 | 条件 |
|--------|------|
| 数据采集 | 标签切换实时写 IndexedDB，JSON 结构完整 |
| 空闲检测 | Toast 弹出/消逝正确，按钮写入 manual 记录 |
| 分类 | 已知域名 100% 分类正确 |
| Dashboard | 无 JS 报错、无 404、0 网络请求 |
| 多语言 | 中英文切换正常 |
| SW 稳定性 | 无崩溃，空闲唤醒正常 |
