# TimeWise MVP 4-Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a privacy-first Chrome Extension that automatically tracks browsing time, detects flow states, and generates a weekly dopamine-boosting report — all with zero network requests.

**Architecture:** Progressive extraction (方案 C Hybrid). Week 1-2: monolithic `background.js` for velocity. Week 3: extract `classifier.js` + `aggregator.js` as pure functions when both SW and Dashboard need them. Week 4: visual closure with Dashboard.

**Tech Stack:** Chrome Extension MV3 (ESM SW) | Dexie.js (Vanilla ESM) | Chart.js | Native CSS | Chrome i18n

**Spec:** [2026-05-29-timewise-mvp-design.md](../specs/2026-05-29-timewise-mvp-design.md)

---

## File Map

| File | Create/Modify | Week |
|------|---------------|------|
| `manifest.json` | Create | 1 |
| `_locales/en/messages.json` | Create | 1 |
| `_locales/zh_CN/messages.json` | Create | 1 |
| `lib/dexie.mjs` | Download | 1 |
| `lib/db.js` | Create | 1 |
| `background.js` | Create (then slim down W3) | 1-3 |
| `ui/toast.js` | Create | 2 |
| `lib/classifier.js` | Create | 3 |
| `lib/aggregator.js` | Create | 3 |
| `lib/chart.min.js` | Download | 4 |
| `ui/dashboard.html` | Create | 4 |
| `ui/dashboard.js` | Create | 4 |
| `assets/icons/icon-16.png` | Create | 4 |
| `assets/icons/icon-32.png` | Create | 4 |
| `assets/icons/icon-48.png` | Create | 4 |
| `assets/icons/icon-128.png` | Create | 4 |
| `tests/manual-checklist.md` | Create | 1 |

---

## Week 1: Foundation & Data Capture

### Task 1.1: Project Scaffold & i18n Setup

**Files:**
- Create: `manifest.json`
- Create: `_locales/en/messages.json`
- Create: `_locales/zh_CN/messages.json`
- Create: `tests/manual-checklist.md`

- [ ] **Step 1: Create `manifest.json`**

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

- [ ] **Step 2: Create `_locales/en/messages.json`**

```json
{
  "extName": { "message": "TimeWise - Personal Time Auditor" },
  "extDesc": { "message": "Privacy-first, local-only time tracking and flow state analyzer." },
  "toast_question": { "message": "You've been away for $1 minutes, what were you doing?" },
  "tag_meeting": { "message": "Sync & Meetings" },
  "tag_desktop_focus": { "message": "Desktop App Focus" },
  "tag_afk": { "message": "Away / Recharge" },
  "hero_warrior": { "message": "On $1 morning, you locked in on $2 for $3h $4min like a flow state machine! Try to recreate this next week." },
  "hero_good": { "message": "On $1 you stayed focused on $2 for $3min without interruption. That deep engagement is your most valuable time asset." },
  "metric_flow_label": { "message": "Total Flow Time" },
  "metric_switch_label": { "message": "Avg Context Switches" },
  "metric_best_day_label": { "message": "Best Focus Day" },
  "chart_title": { "message": "Daily Flow Trend" },
  "experiment_title": { "message": "Next Week's Micro-Experiment" },
  "experiment_switching": { "message": "Your context switching frequency is on the high side. Next week, try locking in 9-11 AM as a no-interruption deep work block." },
  "experiment_good_flow": { "message": "You've developed a solid flow habit. Next week's experiment: when you feel the urge to switch tabs, push through for just 5 more minutes." },
  "experiment_default": { "message": "Your focus rhythm is building steadily. Keep using TimeWise and next week you'll receive a personalized micro-experiment." },
  "no_data_hero": { "message": "Data is still accumulating. Keep browsing and next week you'll receive your first flow state report." },
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

- [ ] **Step 3: Create `_locales/zh_CN/messages.json`**

```json
{
  "extName": { "message": "TimeWise - 个人时间审计工具" },
  "extDesc": { "message": "隐私优先、纯本地运行的数字时间追踪与心流分析器。" },
  "toast_question": { "message": "你刚离开了 $1 分钟，这段时间在做什么？" },
  "tag_meeting": { "message": "沟通对齐 / 线上开会" },
  "tag_desktop_focus": { "message": "本地客户端专注" },
  "tag_afk": { "message": "离开座位 / 离线回血" },
  "hero_warrior": { "message": "$1上午你像个战神一样在 $2 里闭关了 $3 小时 $4 分钟！下周请务必复刻这个超神状态！" },
  "hero_good": { "message": "$1你在 $2 上连续专注了 $3 分钟不被打断。这种深度投入，就是你最值钱的时间资产。" },
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

- [ ] **Step 4: Create `tests/manual-checklist.md`**

```markdown
# TimeWise Week 1 Manual Test

## Setup
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `timewise/` folder
4. Open the Service Worker console (click "service worker" link on the extension card)

## Test Steps

### Step 1: 5-min GitHub browsing
- Browse GitHub Issues/PR pages for 5 minutes continuously
- **Expected:** Console stays quiet, no errors

### Step 2: Switch to distraction site
- Open a new tab, go to twitter.com or bilibili.com
- **Expected:** Console prints `[TimeWise DB] Saved: github.com, <duration>s`

### Step 3: Check IndexedDB
- Open Chrome DevTools → Application → IndexedDB → TimeWiseLocalDB → events
- **Expected:** One complete record with `domain: "github.com"`, `idle_detected: false`

## Pass Criteria
- [ ] Data writes to IndexedDB in real-time when switching tabs
- [ ] No console errors
- [ ] JSON record structure matches schema (all fields present)
```

- [ ] **Step 5: Verify files exist**

Run: `ls -R timewise/`
Expected: manifest.json, _locales/en/messages.json, _locales/zh_CN/messages.json, tests/manual-checklist.md all exist.

- [ ] **Step 6: Commit**

```bash
git add manifest.json _locales/ tests/manual-checklist.md
git commit -m "feat: project scaffold with MV3 manifest and i18n language packs"
```

---

### Task 1.2: Download Dexie.js ESM Bundle

**Files:**
- Create: `lib/dexie.mjs`

- [ ] **Step 1: Create `lib/` directory**

```bash
mkdir -p lib
```

- [ ] **Step 2: Download Dexie ESM from official source**

The official Dexie ESM module is available from the npm package's `dist/modern/` directory.
Download from: `https://unpkg.com/dexie@4.0.8/dist/modern/dexie.mjs`

Run (PowerShell):
```powershell
Invoke-WebRequest -Uri "https://unpkg.com/dexie@4.0.8/dist/modern/dexie.mjs" -OutFile "lib/dexie.mjs"
```

- [ ] **Step 3: Verify the file**

Run: `wc -l lib/dexie.mjs` (or `(Get-Content lib/dexie.mjs | Measure-Object -Line).Lines`)
Expected: File is ~1000+ lines, contains `export` statements.

- [ ] **Step 4: Quick ESM import test**

Create a temporary test script `lib/test-dexie.html`:
```html
<!DOCTYPE html>
<html><body><script type="module">
import Dexie from './dexie.mjs';
const db = new Dexie('TestDB');
db.version(1).stores({ test: '++id' });
await db.open();
console.log('Dexie OK, version:', Dexie.version);
db.close();
await Dexie.delete('TestDB');
</script></body></html>
```

Open this HTML file in Chrome and check console for "Dexie OK".
Delete `lib/test-dexie.html` after verification.

- [ ] **Step 5: Commit**

```bash
git add lib/dexie.mjs
git commit -m "chore: add Dexie.js ESM bundle v4.0.8"
```

---

### Task 1.3: Database Access Layer (`lib/db.js`)

**Files:**
- Create: `lib/db.js`

- [ ] **Step 1: Write `lib/db.js`**

```javascript
import Dexie from './dexie.mjs';

export const db = new Dexie('TimeWiseLocalDB');

db.version(1).stores({
  events: '++id, timestamp'
});

export async function insertEvent(event) {
  return await db.events.add(event);
}

export async function queryByRange(startTs, endTs) {
  return await db.events
    .where('timestamp').between(startTs, endTs)
    .toArray();
}

export async function getTodayProductiveSeconds() {
  const dayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const events = await db.events
    .where('timestamp').above(dayStart)
    .toArray();
  return events
    .filter(e => e.category === 'productive')
    .reduce((sum, e) => sum + e.duration, 0);
}

export async function getThisWeekEvents() {
  const weekStart = getWeekStart();
  return await db.events
    .where('timestamp').above(weekStart)
    .toArray();
}

export function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return Math.floor(monday.getTime() / 1000);
}
```

- [ ] **Step 2: Verify the module loads without syntax errors**

Run in terminal: `node --check lib/db.js`
(May warn about top-level import — that's fine, we just want syntax to be valid.)

- [ ] **Step 3: Commit**

```bash
git add lib/db.js
git commit -m "feat: add Dexie database access layer with timestamp-indexed schema"
```

---

### Task 1.4: Inline Domain Extractor (Week 1-2 Temporary)

**Files:**
- Modify: `background.js` (create with inline extractor)

**Context:** classifier.js is formally extracted in Week 3. For Week 1-2, we embed a minimal `extractDomain()` directly in `background.js` to get the capture loop running fast.

- [ ] **Step 1: Write `background.js` with inline extractor and tab listeners**

```javascript
import { insertEvent, getTodayProductiveSeconds } from './lib/db.js';

// --- Temporary inline helpers (Week 3: move to lib/classifier.js) ---
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
// --- End temporary inline helpers ---

let currentState = {
  domain: null,
  title: null,
  startTime: null
};

async function settleCurrentEvent(endTime) {
  if (!currentState.domain || !currentState.startTime) return;
  const duration = endTime - currentState.startTime;
  if (duration < 2) return; // filter sub-2s flickers

  await insertEvent({
    timestamp: Math.floor(currentState.startTime),
    duration: Math.round(duration),
    source: 'browser',
    domain: currentState.domain,
    title: currentState.title || '',
    idle_detected: false,
    offline_tag: null,
    category: null // Week 3 will populate this
  });

  console.log(`[TimeWise DB] Saved: ${currentState.domain}, ${Math.round(duration)}s`);

  currentState = { domain: null, title: null, startTime: null };
  await refreshBadge();
}

async function startNewSession(tab) {
  const url = tab?.url || tab?.pendingUrl;
  if (!url || !url.startsWith('http')) {
    currentState = { domain: null, title: null, startTime: null };
    return;
  }
  currentState = {
    domain: extractDomain(url),
    title: tab.title || '',
    startTime: Date.now() / 1000
  };
}

async function handleTabSwitch(activeInfo) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

    const newDomain = extractDomain(tab.url);
    const newTitle = tab.title || '';

    if (currentState.domain === newDomain && currentState.title === newTitle) return;

    const now = Date.now() / 1000;
    await settleCurrentEvent(now);
    await startNewSession(tab);
  } catch (err) {
    console.error('[TimeWise] Tab switch error:', err);
  }
}

async function refreshBadge() {
  const seconds = await getTodayProductiveSeconds();
  const hours = (seconds / 3600).toFixed(1);
  chrome.action.setBadgeText({ text: parseFloat(hours) > 0 ? `${hours}h` : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#14b8a6' });
}

// --- Event listeners ---
chrome.tabs.onActivated.addListener(handleTabSwitch);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    handleTabSwitch({ tabId });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'ui/dashboard.html' });
});

// Initial badge refresh
refreshBadge();
setInterval(refreshBadge, 60000);

console.log('[TimeWise] Service Worker started');
```

- [ ] **Step 2: Verify syntax**

Run: `node --check background.js`

- [ ] **Step 3: Commit**

```bash
git add background.js
git commit -m "feat: add background.js with tab tracking and event capture loop"
```

---

### Task 1.5: Load Extension & Run Manual Test

- [ ] **Step 1: Load the extension in Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `timewise/` project root directory
5. Verify the extension card appears with name "TimeWise - Personal Time Auditor"

- [ ] **Step 2: Open Service Worker console**

Click the "service worker" link on the TimeWise extension card. A DevTools window opens.
Expected: Console shows `[TimeWise] Service Worker started`

- [ ] **Step 3: Run the 5-min GitHub test from `tests/manual-checklist.md`**

Execute all three test steps:
1. Browse GitHub for ~5 minutes
2. Switch to twitter.com/bilibili.com
3. Check IndexedDB for the saved record

- [ ] **Step 4: Verify the saved record structure**

In Chrome DevTools → Application → IndexedDB → TimeWiseLocalDB → events:
Expected record fields: `id`, `timestamp`, `duration`, `source`, `domain`, `title`, `idle_detected`, `offline_tag`, `category`
Expected values: `domain` = `"github.com"`, `source` = `"browser"`, `idle_detected` = `false`

- [ ] **Step 5: Commit (if any fixes were made)**

```bash
git add -A
git commit -m "fix: manual test adjustments for Week 1 data capture"
```

---

## Week 2: Idle Detection & Toast UI

### Task 2.1: Idle Detection in background.js

**Files:**
- Modify: `background.js`

- [ ] **Step 1: Add idle state handler to `background.js`**

Insert after the existing `refreshBadge()` function and before the event listeners section:

```javascript
// --- Idle detection ---
let idleStartTs = null;

async function handleIdleSwitch(newState) {
  if (newState === 'idle' || newState === 'locked') {
    const now = Date.now() / 1000;
    await settleCurrentEvent(now);
    idleStartTs = now;
    await chrome.storage.local.set({ idleStartTs });
  } else if (newState === 'active') {
    const stored = await chrome.storage.local.get(['idleStartTs', 'toastCount', 'toastDate']);
    const today = new Date().toDateString();
    let toastCount = stored.toastDate === today ? (stored.toastCount || 0) : 0;

    if (stored.idleStartTs && toastCount < 4) {
      const idleDuration = (Date.now() / 1000) - stored.idleStartTs;
      if (idleDuration >= 900) {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'showToast',
              idleDuration: Math.round(idleDuration)
            });
          }
        });
        toastCount++;
        await chrome.storage.local.set({ toastDate: today, toastCount });
      }
    }
    await chrome.storage.local.remove('idleStartTs');

    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (tab) await startNewSession(tab);
    });
  }
}

chrome.idle.onStateChanged.addListener(handleIdleSwitch);
```

- [ ] **Step 2: Add offline compensation message handler**

Insert before `chrome.action.onClicked.addListener`:

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'offlineCompensation') {
    handleOfflineCompensation(msg.tag, msg.idleDuration);
  }
});

async function handleOfflineCompensation(tag, idleDuration) {
  const now = Math.floor(Date.now() / 1000);
  const startTs = now - idleDuration;

  if (idleDuration <= 3600) {
    await insertEvent({
      timestamp: startTs,
      duration: idleDuration,
      source: 'manual',
      domain: '',
      title: '',
      idle_detected: false,
      offline_tag: tag,
      category: tag === 'afk' ? 'distracted' : 'productive'
    });
  } else {
    const focusSeconds = 2700;
    const restSeconds = idleDuration - focusSeconds;

    await insertEvent({
      timestamp: startTs,
      duration: focusSeconds,
      source: 'manual',
      domain: '',
      title: '',
      idle_detected: false,
      offline_tag: tag,
      category: tag === 'afk' ? 'distracted' : 'productive'
    });

    await insertEvent({
      timestamp: startTs + focusSeconds,
      duration: restSeconds,
      source: 'manual',
      domain: '',
      title: '',
      idle_detected: false,
      offline_tag: 'afk',
      category: 'distracted'
    });
  }

  await refreshBadge();
}
```

- [ ] **Step 3: Also reset toastCount at SW startup**

Add this right after the `console.log('[TimeWise] Service Worker started')` line:

```javascript
// Reset toast count if it's a new day
const storedToast = await chrome.storage.local.get(['toastDate']);
if (storedToast.toastDate !== new Date().toDateString()) {
  await chrome.storage.local.set({ toastDate: new Date().toDateString(), toastCount: 0 });
}
```

- [ ] **Step 4: Verify syntax**

Run: `node --check background.js`

- [ ] **Step 5: Commit**

```bash
git add background.js
git commit -m "feat: add idle detection and offline compensation with smart slicing"
```

---

### Task 2.2: Toast Content Script (`ui/toast.js`)

**Files:**
- Create: `ui/toast.js`

- [ ] **Step 1: Write `ui/toast.js` with Shadow DOM, i18n, and dismissal logic**

```javascript
// ui/toast.js

const TOAST_CSS = `
:host {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: none;
}
.tw-toast-card {
  pointer-events: auto;
  background: rgba(26, 26, 36, 0.94);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px 24px;
  width: 300px;
  color: #e8e8ed;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  animation: tw-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.tw-toast-card.tw-toast-exit {
  transform: translateX(120%);
  opacity: 0;
}
.tw-toast-question {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}
.tw-toast-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tw-toast-buttons button {
  all: unset;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  color: #d0d0d8;
  transition: background 0.15s;
}
.tw-toast-buttons button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
@keyframes tw-slide-in {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
`;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'showToast') {
    showToast(message.idleDuration);
  }
});

function showToast(idleDuration) {
  if (document.getElementById('timewise-toast-host')) return;

  const host = document.createElement('div');
  host.id = 'timewise-toast-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = TOAST_CSS;
  shadow.appendChild(style);

  const minutes = Math.floor(idleDuration / 60);
  const questionText = chrome.i18n.getMessage('toast_question', [String(minutes)]);
  const meetingText = chrome.i18n.getMessage('tag_meeting');
  const desktopText = chrome.i18n.getMessage('tag_desktop_focus');
  const afkText = chrome.i18n.getMessage('tag_afk');

  const card = document.createElement('div');
  card.className = 'tw-toast-card';
  card.innerHTML = `
    <p class="tw-toast-question">${questionText}</p>
    <div class="tw-toast-buttons">
      <button data-tag="meeting">${meetingText}</button>
      <button data-tag="desktop_focus">${desktopText}</button>
      <button data-tag="afk">${afkText}</button>
    </div>
  `;
  shadow.appendChild(card);

  setupDismissFlow(host, card, shadow, idleDuration);
}

function setupDismissFlow(host, card, shadow, idleDuration) {
  let dismissed = false;

  const triggerExit = () => {
    if (dismissed) return;
    dismissed = true;
    card.classList.add('tw-toast-exit');
    setTimeout(() => {
      if (host.parentNode) host.remove();
    }, 400);
  };

  const autoTimer = setTimeout(triggerExit, 8000);

  setTimeout(() => {
    const hostCheck = document.getElementById('timewise-toast-host');
    if (!hostCheck) return;

    const handleUserAction = (e) => {
      if (e.type === 'mousedown' && shadow.contains(e.target)) return;
      triggerExit();
      clearAndCleanup();
    };

    document.addEventListener('scroll', handleUserAction, { once: true, passive: true });
    document.addEventListener('keydown', handleUserAction, { once: true });
    document.addEventListener('mousedown', handleUserAction);

    function clearAndCleanup() {
      clearTimeout(autoTimer);
      document.removeEventListener('scroll', handleUserAction);
      document.removeEventListener('keydown', handleUserAction);
      document.removeEventListener('mousedown', handleUserAction);
    }
  }, 3000);

  const buttons = card.querySelectorAll('button[data-tag]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'offlineCompensation',
        tag: btn.dataset.tag,
        idleDuration: idleDuration
      });
      clearTimeout(autoTimer);
      triggerExit();
    });
  });
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check ui/toast.js`

- [ ] **Step 3: Commit**

```bash
git add ui/toast.js
git commit -m "feat: add Toast content script with Shadow DOM, 3s buffer, and auto-dismiss"
```

---

### Task 2.3: Manual Idle Test

- [ ] **Step 1: Reload extension in Chrome**

Go to `chrome://extensions/`, click the refresh icon on the TimeWise card.

- [ ] **Step 2: Test Toast appearance**

1. Browse any page for a few seconds
2. Leave the computer for 15+ minutes (or change system idle timeout for testing)
3. Return and move the mouse
4. **Expected:** Toast slides in from bottom-right within 2 seconds

- [ ] **Step 3: Test auto-dismiss by scrolling**

1. Trigger another Toast
2. Wait 3 seconds (reading buffer)
3. Scroll the page
4. **Expected:** Toast slides out to the right and disappears

- [ ] **Step 4: Test auto-dismiss by typing**

1. Trigger another Toast
2. Wait 3 seconds
3. Press any key
4. **Expected:** Toast slides out to the right

- [ ] **Step 5: Test button click + Badge rollback**

1. Browse a productive site (e.g., GitHub) for a few minutes — note the Badge number
2. Trigger idle for 15+ minutes by leaving
3. On return, click "🤝 Sync & Meetings"
4. **Expected:** Badge number changes (previously-inflated GitHub time is corrected)

- [ ] **Step 6: Verify IndexedDB has the manual event**

Check IndexedDB for a record with `source: "manual"` and `offline_tag: "meeting"`.

- [ ] **Step 7: Commit** (if any fixes)

```bash
git add -A
git commit -m "fix: Toast idle test adjustments"
```

---

## Week 3: Extraction & Algorithm Layer

### Task 3.1: Extract Classifier (`lib/classifier.js`)

**Files:**
- Create: `lib/classifier.js`
- Modify: `background.js` (remove inline extractor, import from classifier)

- [ ] **Step 1: Write `lib/classifier.js`**

```javascript
const PRODUCTIVE_DOMAINS = new Set([
  'github.com', 'gitlab.com', 'bitbucket.org',
  'docs.google.com', 'google.com', 'notion.so',
  'linear.app', 'jira.com', 'atlassian.net',
  'figma.com', 'sketch.com', 'zeplin.io',
  'stackoverflow.com', 'devdocs.io',
  'localhost', '127.0.0.1',
  'visualstudio.com', 'observablehq.com',
  'miro.com', 'excalidraw.com',
  'confluence.com', 'codesandbox.io', 'codepen.io',
  'colab.research.google.com', 'npmjs.com', 'pypi.org'
]);

const DISTRACTED_DOMAINS = new Set([
  'twitter.com', 'x.com', 'reddit.com', 'weibo.com', 'tieba.baidu.com',
  'bilibili.com', 'youtube.com', 'tiktok.com', 'douyin.com',
  'douban.com', 'zhihu.com', 'instagram.com', 'facebook.com',
  'taobao.com', 'jd.com', 'amazon.com', 'pinduoduo.com',
  'netflix.com', 'iqiyi.com', 'v.qq.com'
]);

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function classify(domain) {
  if (!domain) return null;
  if (PRODUCTIVE_DOMAINS.has(domain)) return 'productive';
  if (DISTRACTED_DOMAINS.has(domain)) return 'distracted';

  for (const prod of PRODUCTIVE_DOMAINS) {
    if (domain.endsWith('.' + prod)) return 'productive';
  }
  for (const dist of DISTRACTED_DOMAINS) {
    if (domain.endsWith('.' + dist)) return 'distracted';
  }

  return null;
}
```

- [ ] **Step 2: Refactor `background.js` to import classifier instead of inline**

Replace the "Temporary inline helpers" block at the top of `background.js`:
```javascript
// REMOVE:
// --- Temporary inline helpers (Week 3: move to lib/classifier.js) ---
// function extractDomain(url) { ... }
// --- End temporary inline helpers ---
```

Replace with:
```javascript
import { extractDomain, classify } from './lib/classifier.js';
```

- [ ] **Step 3: Update `settleCurrentEvent` to use `classify()`**

In `background.js`, change the line:
```javascript
category: null // Week 3 will populate this
```
To:
```javascript
category: classify(currentState.domain)
```

- [ ] **Step 4: Verify both files**

Run: `node --check lib/classifier.js`
Run: `node --check background.js`

- [ ] **Step 5: Commit**

```bash
git add lib/classifier.js background.js
git commit -m "feat: extract classifier with binary domain rules and subdomain matching"
```

---

### Task 3.2: Extract Aggregator (`lib/aggregator.js`)

**Files:**
- Create: `lib/aggregator.js`

- [ ] **Step 1: Write `lib/aggregator.js`**

```javascript
export function detectFlowSegments(events, minDuration = 1800) {
  const flowSegments = [];
  let current = null;
  const MAX_GAP = 60;

  for (const e of events) {
    if (e.source !== 'browser' || e.idle_detected || e.category !== 'productive') {
      if (current) {
        current.duration = current.endTs - current.startTs;
        if (current.duration >= minDuration) flowSegments.push(current);
        current = null;
      }
      continue;
    }

    const eventEnd = e.timestamp + e.duration;

    if (!current) {
      current = { domain: e.domain, startTs: e.timestamp, endTs: eventEnd };
    } else if (e.domain === current.domain && (e.timestamp - current.endTs) <= MAX_GAP) {
      current.endTs = eventEnd;
    } else {
      current.duration = current.endTs - current.startTs;
      if (current.duration >= minDuration) flowSegments.push(current);
      current = { domain: e.domain, startTs: e.timestamp, endTs: eventEnd };
    }
  }

  if (current) {
    current.duration = current.endTs - current.startTs;
    if (current.duration >= minDuration) flowSegments.push(current);
  }

  return flowSegments;
}

export function calcFragmentation(events) {
  const buckets = {};
  let prevDomain = null;

  for (const e of events) {
    if (e.source !== 'browser') continue;
    const hourKey = getHourBucket(e.timestamp);

    if (!buckets[hourKey]) {
      buckets[hourKey] = { switches: 0, domains: new Set() };
    }
    buckets[hourKey].domains.add(e.domain);
    if (prevDomain && e.domain !== prevDomain) {
      buckets[hourKey].switches++;
    }
    prevDomain = e.domain;
  }

  return Object.entries(buckets).map(([hour, data]) => ({
    hour,
    switches: data.switches,
    uniqueDomains: data.domains.size,
    score: data.switches / Math.max(data.domains.size, 1)
  }));
}

function getHourBucket(ts) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;
}

export function buildWeeklyReportData(events) {
  const flowSegments = detectFlowSegments(events);
  const fragmentation = calcFragmentation(events);

  const totalFlowSeconds = flowSegments.reduce((s, f) => s + f.duration, 0);
  const avgSwitchesPerHour = fragmentation.length > 0
    ? (fragmentation.reduce((s, f) => s + f.switches, 0) / fragmentation.length).toFixed(1)
    : 0;

  const highlight = flowSegments.length > 0
    ? flowSegments.reduce((best, f) => f.duration > best.duration ? f : best, flowSegments[0])
    : null;

  const dailyFlow = {};
  for (const f of flowSegments) {
    const day = new Date(f.startTs * 1000).toDateString();
    if (!dailyFlow[day]) dailyFlow[day] = { totalFlow: 0, segments: 0 };
    dailyFlow[day].totalFlow += f.duration;
    dailyFlow[day].segments++;
  }

  return {
    totalFlowSeconds,
    avgSwitchesPerHour,
    highlight,
    dailyFlow,
    flowSegmentsCount: flowSegments.length,
    fragmentation
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check lib/aggregator.js`

- [ ] **Step 3: Commit**

```bash
git add lib/aggregator.js
git commit -m "feat: add aggregator with flow detection (MAX_GAP 60s) and fragmentation scoring"
```

---

### Task 3.3: Cross-Validate Algorithms

- [ ] **Step 1: Create a temporary test script**

Create `lib/test-aggregator.html` (delete after testing):

```html
<!DOCTYPE html>
<html><body><script type="module">
import { buildWeeklyReportData } from './aggregator.js';

const now = Math.floor(Date.now() / 1000);
const hour = 3600;

// Simulate a day: morning flow on github, lunch gap, afternoon distractions
const testEvents = [
  // 2h continuous GitHub flow (4 x 30min segments — should merge to 1 flow)
  { timestamp: now - hour*8, duration: 1800, source: 'browser', domain: 'github.com', category: 'productive', idle_detected: false },
  { timestamp: now - hour*7.5, duration: 1800, source: 'browser', domain: 'github.com', category: 'productive', idle_detected: false },
  { timestamp: now - hour*7, duration: 1800, source: 'browser', domain: 'github.com', category: 'productive', idle_detected: false },
  { timestamp: now - hour*6.5, duration: 1800, source: 'browser', domain: 'github.com', category: 'productive', idle_detected: false },

  // Lunch gap (30min gap — should break flow)
  { timestamp: now - hour*4, duration: 1800, source: 'browser', domain: 'github.com', category: 'productive', idle_detected: false },

  // Afternoon twitter binge (should be excluded from flow)
  { timestamp: now - hour*2, duration: 600, source: 'browser', domain: 'twitter.com', category: 'distracted', idle_detected: false },
  { timestamp: now - hour*1.5, duration: 300, source: 'browser', domain: 'bilibili.com', category: 'distracted', idle_detected: false },
];

const report = buildWeeklyReportData(testEvents);

console.log('Flow segments:', report.flowSegmentsCount);
console.log('Total flow (h):', (report.totalFlowSeconds / 3600).toFixed(1));
console.log('Highlight domain:', report.highlight?.domain);
console.log('Highlight duration (h):', (report.highlight?.duration / 3600).toFixed(1));
console.log('Avg switches/h:', report.avgSwitchesPerHour);

// Validation checks
console.assert(report.flowSegmentsCount === 2, 'Should have 2 flow segments (morning + post-lunch)');
console.assert(report.totalFlowSeconds >= 7200, 'Should have at least 2h total flow (4x30min morning)');
console.assert(report.highlight.domain === 'github.com', 'Highlight should be github.com');

console.log('All assertions passed!');
</script></body></html>
```

- [ ] **Step 2: Run the test in browser**

Open `lib/test-aggregator.html` in Chrome. Check console for assertion results.

- [ ] **Step 3: Fix any failing assertions**

If the flow detection logic doesn't produce expected results, debug and fix `lib/aggregator.js`.

- [ ] **Step 4: Clean up temporary test file**

```bash
rm lib/test-aggregator.html
```

- [ ] **Step 5: Commit**

```bash
git add lib/aggregator.js
git commit -m "test: cross-validate flow detection and fragmentation algorithms"
```

---

## Week 4: Dashboard & Release

### Task 4.1: Download Chart.js

**Files:**
- Create: `lib/chart.min.js`

- [ ] **Step 1: Download Chart.js**

Run (PowerShell):
```powershell
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" -OutFile "lib/chart.min.js"
```

- [ ] **Step 2: Verify the file**

```bash
wc -c lib/chart.min.js
```
Expected: ~200KB file size (minified Chart.js).

- [ ] **Step 3: Commit**

```bash
git add lib/chart.min.js
git commit -m "chore: add Chart.js v4.4.0 UMD bundle for dashboard"
```

---

### Task 4.2: Dashboard HTML (`ui/dashboard.html`)

**Files:**
- Create: `ui/dashboard.html`

- [ ] **Step 1: Write `ui/dashboard.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TimeWise</title>
  <style>
    :root {
      --tw-bg: #0d0d12;
      --tw-surface: rgba(255, 255, 255, 0.03);
      --tw-border: rgba(255, 255, 255, 0.06);
      --tw-text: rgba(255, 255, 255, 0.85);
      --tw-text-muted: rgba(255, 255, 255, 0.45);
      --tw-accent: #14b8a6;
      --tw-accent-glow: rgba(20, 184, 166, 0.1);
      --tw-radius: 14px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--tw-bg);
      color: var(--tw-text);
      font-family: system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
    }
    .tw-dashboard {
      max-width: 680px;
      margin: 0 auto;
      padding: 48px 24px;
    }
    .tw-hero {
      background: var(--tw-surface);
      border: 1px solid var(--tw-border);
      border-radius: var(--tw-radius);
      padding: 32px;
      margin-bottom: 24px;
      text-align: center;
    }
    .tw-hero-emoji {
      font-size: 40px;
      margin-bottom: 16px;
    }
    .tw-hero-text {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.6;
    }
    .tw-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .tw-card {
      background: var(--tw-surface);
      border: 1px solid var(--tw-border);
      border-radius: var(--tw-radius);
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .tw-card-label {
      font-size: 12px;
      color: var(--tw-text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tw-card-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--tw-accent);
    }
    .tw-chart-section {
      position: relative;
      background: var(--tw-surface);
      border: 1px solid var(--tw-border);
      border-radius: var(--tw-radius);
      padding: 24px;
      margin-bottom: 24px;
    }
    .tw-chart-section h2 {
      font-size: 14px;
      color: var(--tw-text-muted);
      margin-bottom: 16px;
      font-weight: 500;
    }
    .tw-chart-wrapper {
      position: relative;
      height: 240px;
      width: 100%;
    }
    .tw-experiment {
      background: var(--tw-accent-glow);
      border: 1px solid rgba(20, 184, 166, 0.15);
      border-radius: var(--tw-radius);
      padding: 24px;
      margin-bottom: 24px;
    }
    .tw-experiment h2 {
      font-size: 14px;
      color: var(--tw-accent);
      margin-bottom: 8px;
      font-weight: 500;
    }
    .tw-experiment p {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.75);
    }
    .tw-footer {
      text-align: center;
      font-size: 11px;
      color: var(--tw-text-muted);
    }
  </style>
</head>
<body>
  <div class="tw-dashboard">
    <section class="tw-hero">
      <p class="tw-hero-emoji" id="heroEmoji">🌱</p>
      <h1 class="tw-hero-text" id="heroText"></h1>
    </section>

    <section class="tw-metrics">
      <div class="tw-card">
        <span class="tw-card-label" id="labelFlow"></span>
        <span class="tw-card-value" id="metricFlow">--</span>
      </div>
      <div class="tw-card">
        <span class="tw-card-label" id="labelSwitch"></span>
        <span class="tw-card-value" id="metricSwitch">--</span>
      </div>
      <div class="tw-card">
        <span class="tw-card-label" id="labelBestDay"></span>
        <span class="tw-card-value" id="metricBestDay">--</span>
      </div>
    </section>

    <section class="tw-chart-section">
      <h2 id="chartTitle"></h2>
      <div class="tw-chart-wrapper">
        <canvas id="flowChart"></canvas>
      </div>
    </section>

    <section class="tw-experiment">
      <h2 id="experimentTitle"></h2>
      <p id="experimentText"></p>
    </section>

    <footer class="tw-footer">
      <p id="footerText"></p>
    </footer>
  </div>

  <script src="../lib/chart.min.js"></script>
  <script type="module" src="dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the HTML loads in Chrome**

Open `ui/dashboard.html` directly in Chrome. Expected: a dark page with dashes for metrics. No 404 errors in console for chart.min.js or dashboard.js (dashboard.js doesn't exist yet so a 404 for it is expected).

- [ ] **Step 3: Commit**

```bash
git add ui/dashboard.html
git commit -m "feat: add dashboard HTML with dark geek aesthetic and Chart.js container"
```

---

### Task 4.3: Dashboard JS (`ui/dashboard.js`)

**Files:**
- Create: `ui/dashboard.js`

- [ ] **Step 1: Write `ui/dashboard.js`**

```javascript
import { getThisWeekEvents } from '../lib/db.js';
import { buildWeeklyReportData } from '../lib/aggregator.js';

document.addEventListener('DOMContentLoaded', async () => {
  chrome.action.setBadgeText({ text: '' });

  setI18nLabels();

  const events = await getThisWeekEvents();
  const report = buildWeeklyReportData(events);

  renderHero(report);
  renderMetrics(report);
  renderChart(report);
  renderExperiment(report);
});

// --- i18n label setup ---
function setI18nLabels() {
  document.getElementById('labelFlow').textContent = chrome.i18n.getMessage('metric_flow_label');
  document.getElementById('labelSwitch').textContent = chrome.i18n.getMessage('metric_switch_label');
  document.getElementById('labelBestDay').textContent = chrome.i18n.getMessage('metric_best_day_label');
  document.getElementById('chartTitle').textContent = chrome.i18n.getMessage('chart_title');
  document.getElementById('experimentTitle').textContent = chrome.i18n.getMessage('experiment_title');
  document.getElementById('footerText').textContent = chrome.i18n.getMessage('footer_privacy');
}

// --- Hero rendering ---
const HIGHLIGHT_TEMPLATES = [
  {
    condition: (f) => f.duration >= 5400,
    emojis: ['🔥', '🚀', '⚡'],
    key: 'hero_warrior'
  },
  {
    condition: (f) => f.duration >= 1800,
    emojis: ['🎯', '✨', '💎'],
    key: 'hero_good'
  }
];

function getDayName(date) {
  const dayMap = ['day_sunday', 'day_monday', 'day_tuesday', 'day_wednesday', 'day_thursday', 'day_friday', 'day_saturday'];
  return chrome.i18n.getMessage(dayMap[date.getDay()]);
}

function renderHero(report) {
  const textEl = document.getElementById('heroText');
  const emojiEl = document.getElementById('heroEmoji');

  if (!report.highlight) {
    textEl.textContent = chrome.i18n.getMessage('no_data_hero');
    return;
  }

  const f = report.highlight;
  const template = HIGHLIGHT_TEMPLATES.find(t => t.condition(f)) || HIGHLIGHT_TEMPLATES[1];
  const emoji = template.emojis[Math.floor(Math.random() * template.emojis.length)];

  const d = new Date(f.startTs * 1000);
  const day = getDayName(d);
  const domain = f.domain;
  const hours = String(Math.floor(f.duration / 3600));
  const mins = String(Math.floor((f.duration % 3600) / 60));

  emojiEl.textContent = emoji;
  textEl.textContent = chrome.i18n.getMessage(template.key, [day, domain, hours, mins]);
}

// --- Metrics ---
function renderMetrics(report) {
  document.getElementById('metricFlow').textContent = `${(report.totalFlowSeconds / 3600).toFixed(1)}h`;
  document.getElementById('metricSwitch').textContent = `${report.avgSwitchesPerHour}/h`;

  let bestDay = '--';
  let maxSec = 0;
  for (const [dayStr, data] of Object.entries(report.dailyFlow)) {
    if (data.totalFlow > maxSec) {
      maxSec = data.totalFlow;
      bestDay = getDayName(new Date(dayStr));
    }
  }
  document.getElementById('metricBestDay').textContent = bestDay;
}

// --- Chart ---
function renderChart(report) {
  const ctx = document.getElementById('flowChart').getContext('2d');

  const dayKeys = ['day_monday', 'day_tuesday', 'day_wednesday', 'day_thursday', 'day_friday', 'day_saturday', 'day_sunday'];
  const labels = [];
  const data = [];

  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(chrome.i18n.getMessage(dayKeys[d.getDay() === 0 ? 6 : d.getDay() - 1]));
    const dayData = report.dailyFlow[d.toDateString()];
    data.push(dayData ? parseFloat((dayData.totalFlow / 3600).toFixed(1)) : 0);
  }

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(v => v > 0 ? 'rgba(20, 184, 166, 0.65)' : 'rgba(255,255,255,0.04)'),
        borderColor: 'rgba(20, 184, 166, 1)',
        borderWidth: 1,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            callback: (v) => `${v}h`
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.4)' }
        }
      }
    }
  });
}

// --- Micro-experiment ---
const EXPERIMENTS = [
  {
    condition: (r) => r.avgSwitchesPerHour >= 8,
    key: 'experiment_switching'
  },
  {
    condition: (r) => r.flowSegmentsCount >= 5,
    key: 'experiment_good_flow'
  }
];

function renderExperiment(report) {
  const el = document.getElementById('experimentText');
  const match = EXPERIMENTS.find(e => e.condition(report));
  const key = match ? match.key : 'experiment_default';
  el.textContent = chrome.i18n.getMessage(key);
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check ui/dashboard.js`

- [ ] **Step 3: Reload extension and test Dashboard**

1. Go to `chrome://extensions/`, reload TimeWise
2. Click the TimeWise extension icon in the toolbar
3. **Expected:** A new tab opens with the dark dashboard, showing the weekly report

- [ ] **Step 4: Verify Dashboard renders without errors**

Open the dashboard page's DevTools console (F12 on the dashboard tab).
Expected: No errors. Metrics show data (or zeros if no data accumulated).

- [ ] **Step 5: Commit**

```bash
git add ui/dashboard.js
git commit -m "feat: add dashboard JS with i18n templates, Chart.js binding, and micro-experiment engine"
```

---

### Task 4.4: Icons & Extension Polish

**Files:**
- Create: `assets/icons/icon-16.png`
- Create: `assets/icons/icon-32.png`
- Create: `assets/icons/icon-48.png`
- Create: `assets/icons/icon-128.png`
- Modify: `manifest.json` (add icons)

- [ ] **Step 1: Generate placeholder icons**

For MVP, create simple SVG-based PNGs or use a solid-color square with the teal `#14b8a6` color.
The simplest approach: create a 128x128 PNG programmatically.

Run (PowerShell — creates minimal valid PNG placeholders):
```powershell
mkdir -p assets/icons
```

Since generating real PNGs from scratch requires a library, for MVP use a simple approach:
Create an SVG file and convert, or use any icon generator tool to create squared icons in teal `#14b8a6`.

Alternatively, create a single 128x128 PNG manually with any image editor (even MS Paint) — a teal square with "TW" text works for MVP.

Place the files:
- `assets/icons/icon-16.png` (16x16)
- `assets/icons/icon-32.png` (32x32)
- `assets/icons/icon-48.png` (48x48)
- `assets/icons/icon-128.png` (128x128)

- [ ] **Step 2: Add icons to `manifest.json`**

Add after the `"action"` block:
```json
"icons": {
  "16": "assets/icons/icon-16.png",
  "32": "assets/icons/icon-32.png",
  "48": "assets/icons/icon-48.png",
  "128": "assets/icons/icon-128.png"
}
```

Updated `manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "description": "__MSG_extDesc__",
  "version": "1.0.0",
  "default_locale": "en",
  "icons": {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  },
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

- [ ] **Step 3: Commit**

```bash
git add assets/icons/ manifest.json
git commit -m "feat: add extension icons and update manifest"
```

---

### Task 4.5: Final Integration Test & Package

- [ ] **Step 1: Run the full manual checklist from Week 1**

Repeat `tests/manual-checklist.md` after all changes. Verify data still writes correctly.

- [ ] **Step 2: Run the idle/Toast test from Week 2**

Verify Toast still works after refactoring.

- [ ] **Step 3: Verify Dashboard with accumulated data**

After a few days of usage, open Dashboard. Verify:
- Hero shows a flow highlight (if any >30min flow exists)
- Metrics cards show non-zero values
- Chart renders bars for each day
- Micro-experiment shows a relevant suggestion
- Badge clears when Dashboard opens

- [ ] **Step 4: Verify 0 network requests**

Open Dashboard DevTools → Network tab. Reload the page.
Expected: **Zero** network requests. All resources are local.

- [ ] **Step 5: Verify CSP compliance**

Dashboard should load without any Content Security Policy errors in console.

- [ ] **Step 6: Package for Chrome Web Store**

```bash
zip -r timewise-mvp-v1.0.0.zip . -x "*.git*" -x "node_modules/*" -x "docs/*" -x "lib/test-*"
```

- [ ] **Step 7: Quick load test of the packaged zip**

Load the zipped extension into Chrome via "Load unpacked" on a clean profile to verify nothing is missing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: final integration test pass and packaging for Chrome Web Store"
```

---

## Post-MVP: Validation Gates

| Week | Gate | Criteria |
|------|------|----------|
| 1 | Dogfooding | Memory < 30MB, data matches subjective time perception |
| 2 | Alpha (10 users) | 3-day retention >= 50%, Toast annoyance <= 1 person |
| 5-6 | Public Beta | 500+ installs, W1 retention > 30% |
