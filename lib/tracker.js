// --- Persistent, crash-safe activity tracker (MV3-aware) ---
//
// The Manifest V3 service worker is killed after ~30s idle, wiping any
// in-memory state. So the "active session" lives in chrome.storage.session
// (survives worker restarts, cleared on browser restart — which is correct:
// time while the browser is closed should never be counted).
//
// A 1-min heartbeat alarm advances a `lastSeen` checkpoint. Two guarantees:
//   1. Long focus sessions (no tab switch) are still credited — settle uses
//      elapsed time, and the heartbeat keeps the checkpoint fresh.
//   2. Dormancy (system sleep / alarm throttling) is NOT credited — if the
//      gap since lastSeen exceeds HEARTBEAT_GAP_LIMIT, we only credit up to
//      the last confirmed checkpoint, never the unproven dead period.
import { insertEvent } from './db.js';
import { extractDomain, classify } from './classifier.js';

const SESSION_KEY = 'tw_active_session';
const HEARTBEAT_GAP_LIMIT = 90; // s — beyond this, treat as dormancy (sleep/throttle)
const MIN_DURATION = 2;         // s — ignore sub-2s flickers

// --- Serialize all mutations so concurrent events can't double-settle ---
let _lock = Promise.resolve();
function withLock(fn) {
  const run = _lock.then(fn, fn);
  _lock = run.then(() => {}, () => {});
  return run;
}

async function readSession() {
  const r = await chrome.storage.session.get(SESSION_KEY);
  return r[SESSION_KEY] || null;
}
async function writeSession(s) {
  if (s) await chrome.storage.session.set({ [SESSION_KEY]: s });
  else await chrome.storage.session.remove(SESSION_KEY);
}

// Read-only peek (used by badge); does not mutate state.
export async function getActiveSession() {
  return await readSession();
}

// --- Write a settled event, splitting across midnight boundaries ---
// `start`/`end` are unix seconds. A session spanning midnight is recorded
// as one row per calendar day so per-day stats attribute time correctly.
async function commit(session, start, end) {
  if (!session || !session.domain) return;
  let cursor = start;
  while (cursor < end) {
    const dayEnd = nextMidnight(cursor);
    const segEnd = Math.min(end, dayEnd);
    const duration = Math.round(segEnd - cursor);
    if (duration >= MIN_DURATION) {
      await insertEvent({
        timestamp: Math.floor(cursor),
        duration,
        source: 'browser',
        domain: session.domain,
        title: session.title || '',
        idle_detected: false,
        offline_tag: null,
        category: classify(session.domain)
      });
    }
    cursor = segEnd;
  }
}

function nextMidnight(ts) {
  const d = new Date(ts * 1000);
  d.setHours(24, 0, 0, 0); // rolls into the next day at 00:00 local
  return Math.floor(d.getTime() / 1000);
}

// Cap the credited end time so dormant periods (sleep, throttled alarms)
// aren't counted. We trust time only up to the last confirmed checkpoint
// plus one grace window.
function cappedEnd(session, now) {
  const lastSeen = session.lastSeen || session.startTime;
  if (now - lastSeen > HEARTBEAT_GAP_LIMIT) {
    return lastSeen; // gap too large — credit only proven time
  }
  return now;
}

// --- Public API -------------------------------------------------------

// Close out the current session, crediting elapsed (capped) time, then clear.
export async function settle(now = Date.now() / 1000) {
  return withLock(async () => {
    const session = await readSession();
    if (!session || !session.domain || !session.startTime) {
      if (session) await writeSession(null);
      return;
    }
    const end = cappedEnd(session, now);
    if (end > session.startTime) {
      await commit(session, session.startTime, end);
    }
    await writeSession(null);
  });
}

// Begin tracking a tab. Settles any prior session first. If the domain is
// unchanged (e.g. only the title updated, or a same-site navigation), the
// existing session continues uninterrupted — we just refresh the title and
// checkpoint — so same-domain time is never fragmented into droppable bits.
export async function startSession(tab, now = Date.now() / 1000) {
  const url = tab?.url || tab?.pendingUrl;
  const domain = url && url.startsWith('http') ? extractDomain(url) : null;
  return withLock(async () => {
    const prev = await readSession();

    if (prev && prev.domain && domain && prev.domain === domain) {
      // Same site → keep the running segment intact (preserve startTime so
      // time keeps accumulating); just refresh title and the dormancy
      // checkpoint. The heartbeat alarm commits the accumulated time.
      // Guard against a dormant gap before the update.
      if (now - (prev.lastSeen || prev.startTime) > HEARTBEAT_GAP_LIMIT) {
        const end = cappedEnd(prev, now);
        if (end > prev.startTime) await commit(prev, prev.startTime, end);
        await writeSession({ domain, title: tab.title || prev.title || '', startTime: now, lastSeen: now });
      } else {
        await writeSession({ ...prev, title: tab.title || prev.title || '', lastSeen: now });
      }
      return;
    }

    if (prev && prev.domain && prev.startTime) {
      const end = cappedEnd(prev, now);
      if (end > prev.startTime) await commit(prev, prev.startTime, end);
    }
    if (!domain) {
      await writeSession(null);
      return;
    }
    await writeSession({
      domain,
      title: tab.title || '',
      startTime: now,
      lastSeen: now
    });
  });
}

// Heartbeat: split the live session at `now` (commit proven time, keep
// tracking from here). Also recovers gracefully if the worker was killed
// mid-session — dormant gaps are capped, not credited.
export async function heartbeat(now = Date.now() / 1000) {
  return withLock(async () => {
    const session = await readSession();
    if (!session || !session.domain || !session.startTime) return;
    const end = cappedEnd(session, now);
    if (end > session.startTime) {
      await commit(session, session.startTime, end);
    }
    // Restart the live segment at `now` regardless: if there was a dormant
    // gap we drop it; if not, we simply checkpoint with zero data loss.
    await writeSession({ ...session, startTime: now, lastSeen: now });
  });
}

