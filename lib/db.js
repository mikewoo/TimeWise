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

export async function getRecentEvents(days = 7) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return await db.events
    .where('timestamp').above(since)
    .toArray();
}

// Delete events older than the retention window so the local DB doesn't grow
// without bound. Default 90 days — well beyond the 7-day UI window, leaving
// headroom for future long-range (30/90d) analysis. Returns the count purged.
export async function pruneOldEvents(retentionDays = 90) {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
  return await db.events
    .where('timestamp').below(cutoff)
    .delete();
}

// Legacy alias — still used by background.js for badge
export async function getThisWeekEvents() {
  return await getRecentEvents(7);
}

export function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return Math.floor(monday.getTime() / 1000);
}
