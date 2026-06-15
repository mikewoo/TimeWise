import { db, insertEvent, getTodayProductiveSeconds, pruneOldEvents } from './lib/db.js';

import { loadCustomDomains } from './lib/classifier.js';

import { settle, startSession, heartbeat } from './lib/tracker.js';

// Treat the browser losing OS focus the same as no active tab.
const NO_WINDOW = chrome.windows.WINDOW_ID_NONE;

async function handleTabSwitch(activeInfo) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab) return;
    // Non-http pages (chrome://, extensions, new tab) settle and idle the tracker.
    await startSession(tab);
    await refreshBadge();
  } catch (err) {
    // Tab may have closed mid-switch; ignore.
  }
}

// Re-read the active tab of the focused window and (re)start tracking it.
async function trackActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) {
      await startSession(tab);
    } else {
      await settle();
    }
    await refreshBadge();
  } catch (err) {
    // Query/tracking failed transiently; ignore.
  }
}

async function refreshBadge() {
  const seconds = await getTodayProductiveSeconds();
  const hours = (seconds / 3600).toFixed(1);
  chrome.action.setBadgeText({ text: parseFloat(hours) > 0 ? `${hours}h` : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#14b8a6' });
}

// --- Idle detection ---
let idleStartTs = null;

async function handleIdleSwitch(newState) {
  if (newState === 'idle' || newState === 'locked') {
    await settle();
    idleStartTs = Date.now() / 1000;
    await chrome.storage.local.set({ idleStartTs });
    await refreshBadge();
  } else if (newState === 'active') {
    const stored = await chrome.storage.local.get(['idleStartTs', 'toastCount', 'toastDate']);
    const today = new Date().toDateString();
    let toastCount = stored.toastDate === today ? (stored.toastCount || 0) : 0;

    if (stored.idleStartTs && toastCount < 4) {
      const idleDuration = (Date.now() / 1000) - stored.idleStartTs;
      if (idleDuration >= 900) {
        const mins = Math.round(idleDuration);
        // Use lastFocusedWindow — more reliable than currentWindow when the
        // system is just waking from idle/lock and window focus may be in flux.
        try {
          const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'showToast',
              idleDuration: mins
            }, () => {
              if (chrome.runtime.lastError) {
                // Content script not injected on this page → fall back to notification.
                showIdleReturnNotification(idleDuration);
              }
            });
          } else {
            showIdleReturnNotification(idleDuration);
          }
        } catch (_) {
          // Tab query failed momentarily after wake → notification fallback.
          showIdleReturnNotification(idleDuration);
        }
        toastCount++;
        await chrome.storage.local.set({ toastDate: today, toastCount });
      }
    }
    await chrome.storage.local.remove('idleStartTs');

    // Resume tracking the now-active tab.
    await trackActiveTab();
  }
}

chrome.idle.setDetectionInterval(60); // mark idle after 60s of no input
chrome.idle.onStateChanged.addListener(handleIdleSwitch);

// --- Event listeners ---
chrome.tabs.onActivated.addListener(handleTabSwitch);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // URL change or title arriving on the active tab → re-evaluate session.
  if ((changeInfo.url || changeInfo.title) && tab.active) {
    startSession(tab).then(refreshBadge).catch(() => {});
  }
});

// Window focus changes: leaving all Chrome windows pauses tracking;
// returning resumes on whatever tab is now active.
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === NO_WINDOW) {
    await settle();
    await refreshBadge();
  } else {
    await trackActiveTab();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'offlineCompensation') {
    handleOfflineCompensation(msg.tag, msg.idleDuration).catch(() => {});
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

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'ui/dashboard.html' });
});

// --- Chrome alarms for periodic tasks ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'heartbeat') {
    // Checkpoint the live session (credits proven time, drops dormant gaps)
    // then update the badge.
    await heartbeat();
    await refreshBadge();
  }
  if (alarm.name === 'distractionAlert') checkDistractionAlert();
  if (alarm.name === 'weeklyReport') sendWeeklyReport();
  if (alarm.name === 'pruneOldData') pruneOldEvents();
});

// --- Install / update hook ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.clear('refreshBadge'); // obsolete alarm from older versions
  chrome.alarms.clear('distractionCheck'); // migrate to 'distractionAlert' name
  refreshBadge();
  chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
  chrome.alarms.create('distractionAlert', { periodInMinutes: 5 });
  // Weekly report: Sunday at 19:00
  chrome.alarms.create('weeklyReport', { when: nextSunday19h(), periodInMinutes: 10080 });
  chrome.alarms.create('pruneOldData', { periodInMinutes: 1440 }); // daily retention sweep
  checkAndResetToast();
});

// Initial bootstrap on worker start
loadCustomDomains();
recoverAndResume();
ensureAlarm('heartbeat', 1);
ensureAlarm('distractionAlert', 5);
ensureAlarm('weeklyReport', 10080);
ensureAlarm('pruneOldData', 1440);
pruneOldEvents(); // sweep once on startup too
checkAndResetToast();

// On worker (re)start, settle any session left over from before the worker
// was killed — dormant gaps are capped by the tracker — then resume tracking
// whatever tab is currently active.
async function recoverAndResume() {
  try {
    await settle();
    await trackActiveTab();
  } catch (err) {
    // Recovery failed; fall back to refreshing the badge only.
    await refreshBadge();
  }
}

function ensureAlarm(name, periodMinutes) {
  chrome.alarms.get(name, (existing) => {
    if (!existing) {
      if (name === 'weeklyReport') {
        chrome.alarms.create(name, { when: nextSunday19h(), periodInMinutes: periodMinutes });
      } else {
        chrome.alarms.create(name, { periodInMinutes: periodMinutes });
      }
    }
  });
}

async function checkAndResetToast() {
  const storedToast = await chrome.storage.local.get(['toastDate']);
  if (storedToast.toastDate !== new Date().toDateString()) {
    await chrome.storage.local.set({ toastDate: new Date().toDateString(), toastCount: 0 });
  }
}

// --- Distraction alert ---
let distractionNotified = {}; // domain -> date, reset daily

async function checkDistractionAlert() {
  const today = new Date().toDateString();
  if (distractionNotified._date !== today) {
    distractionNotified = { _date: today };
  }

  const dayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const events = await db.events.where('timestamp').above(dayStart).toArray();

  const distractedTime = {};
  for (const e of events) {
    if (e.category === 'distracted' && e.domain) {
      distractedTime[e.domain] = (distractedTime[e.domain] || 0) + e.duration;
    }
  }

  for (const [domain, secs] of Object.entries(distractedTime)) {
    const mins = Math.floor(secs / 60);
    if (mins >= 30 && distractionNotified[domain] !== today) {
      distractionNotified[domain] = today;
      chrome.notifications.create(`dist-${domain}`, {
        type: 'basic',
        iconUrl: 'assets/icons/icon-128.png',
        title: chrome.i18n.getMessage('distraction_title') || 'TimeWise — Time check',
        message: (chrome.i18n.getMessage('distraction_body') || `You've spent $1 min on $2 today.`)
          .replace('$1', String(mins)).replace('$2', domain),
        priority: 1
      });
    }
  }
}

// --- Weekly report (Sunday evening) ---
function nextSunday19h() {
  const now = new Date();
  const sun = new Date(now);
  sun.setDate(now.getDate() + (7 - now.getDay()) % 7);
  sun.setHours(19, 0, 0, 0);
  if (sun <= now) sun.setDate(sun.getDate() + 7);
  return sun.getTime();
}

async function sendWeeklyReport() {
  const weekStart = Math.floor(Date.now() / 1000) - 7 * 86400;
  const events = await db.events.where('timestamp').above(weekStart).toArray();
  const totalFlow = events
    .filter(e => e.source === 'browser' && !e.idle_detected && e.category !== 'distracted')
    .reduce((s, e) => s + e.duration, 0);

  if (totalFlow < 600) return; // < 10 min total — not worth a notification

  const hours = (totalFlow / 3600).toFixed(1);

  // Best day
  const dailyFlow = {};
  for (const e of events) {
    if (e.category === 'distracted' || e.source !== 'browser') continue;
    const day = new Date(e.timestamp * 1000).toDateString();
    dailyFlow[day] = (dailyFlow[day] || 0) + e.duration;
  }
  let bestDay = '', maxSec = 0;
  for (const [d, s] of Object.entries(dailyFlow)) {
    if (s > maxSec) { maxSec = s; bestDay = d; }
  }

  chrome.notifications.create('weekly-report', {
    type: 'basic',
    iconUrl: 'assets/icons/icon-128.png',
    title: chrome.i18n.getMessage('weekly_report_title') || 'TimeWise Weekly Report',
    message: (chrome.i18n.getMessage('weekly_report_body') || '$1h deep flow this week. Best day: $2.')
      .replace('$1', hours).replace('$2', bestDay),
    priority: 2
  });
}

// --- Idle-return notification (fallback when toast can't reach the page) ---
function showIdleReturnNotification(idleDuration) {
  const minutes = Math.floor(idleDuration / 60);
  chrome.notifications.create('idle-return', {
    type: 'basic',
    iconUrl: 'assets/icons/icon-128.png',
    title: chrome.i18n.getMessage('idle_return_title') || 'Welcome back!',
    message: (chrome.i18n.getMessage('idle_return_body') || `You were away for $1 min. What were you doing?`)
      .replace('$1', String(minutes)),
    priority: 2
  });
}
