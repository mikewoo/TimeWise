// --- Focus event filter (shared) ---
// A "focus event" is any browser-tracked, non-idle event that isn't
// classified as a known distraction.  Unknown domains get the benefit
// of the doubt (category=null passes).
function isFocusEvent(e) {
  return e.source === 'browser' && !e.idle_detected && e.category !== 'distracted';
}

// --- Flow segment detection (for Hero highlight only) ---
// Merges adjacent focus events within MAX_GAP seconds, even across
// different domains — because real deep work jumps between tools
// (GitHub → StackOverflow → localhost → docs).
export function detectFlowSegments(events, minDuration = 600) {
  const flowSegments = [];
  let current = null;
  const MAX_GAP = 60;

  for (const e of events) {
    if (!isFocusEvent(e)) {
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
    } else if ((e.timestamp - current.endTs) <= MAX_GAP) {
      // Cross-domain merge: any focus event within MAX_GAP extends the flow
      current.endTs = eventEnd;
    } else {
      // Gap too large → close current, start new
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

// --- Fragmentation scoring (all browser events, including distracted) ---
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

// --- Golden focus hours (7-day × 24-hour heatmap) ---
// Builds a grid of the last `days` calendar days (oldest first, today last)
// × 24 clock hours, where each cell holds minutes of genuine deep flow
// (>=10min uninterrupted) in that day+hour. Today's future hours simply have
// no data, so they render empty. The peak hour (aggregated across all days)
// drives the headline "you focus best around HH:00" insight.
export function calcGoldenHours(events, opts = {}) {
  const days = opts.days || 7;
  const minSegment = opts.minSegment || 600;
  const segments = detectFlowSegments(events, minSegment);

  // Row scaffold: one entry per calendar day, oldest first.
  const now = new Date();
  const rows = [];
  const dayIndex = new Map(); // dateString -> row index
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toDateString();
    dayIndex.set(key, rows.length);
    rows.push({
      dateString: key,
      dayOfWeek: d.getDay(),     // 0=Sun .. 6=Sat
      isToday: i === 0,
      hours: new Array(24).fill(0) // seconds of flow per clock hour
    });
  }

  // Spread each flow segment across the day+hour cells it actually spans.
  for (const seg of segments) {
    let cursor = seg.startTs;
    while (cursor < seg.endTs) {
      const d = new Date(cursor * 1000);
      const rowIdx = dayIndex.get(d.toDateString());
      const hour = d.getHours();
      const nextHour = new Date(cursor * 1000);
      nextHour.setMinutes(60, 0, 0);
      const segEnd = Math.min(seg.endTs, Math.floor(nextHour.getTime() / 1000));
      if (rowIdx !== undefined) rows[rowIdx].hours[hour] += (segEnd - cursor);
      cursor = segEnd;
    }
  }

  // Aggregate per clock hour (across all days) for the peak insight.
  const hourTotals = new Array(24).fill(0);
  const flowDays = new Set();
  for (const row of rows) {
    let rowHasFlow = false;
    for (let h = 0; h < 24; h++) {
      if (row.hours[h] > 0) { hourTotals[h] += row.hours[h]; rowHasFlow = true; }
    }
    if (rowHasFlow) flowDays.add(row.dateString);
  }
  const daysCovered = Math.max(1, flowDays.size);
  const hourAvg = hourTotals.map(secs => secs / 60 / daysCovered); // avg min/day

  // Max single cell (minutes) for color scaling.
  let maxCell = 0;
  for (const row of rows) for (let h = 0; h < 24; h++) {
    const m = row.hours[h] / 60;
    if (m > maxCell) maxCell = m;
  }

  const hasData = segments.length > 0 && maxCell > 0;

  // Peak hour window from the aggregated averages (for the headline).
  let peak = null;
  if (hasData) {
    const maxAvg = Math.max(...hourAvg);
    let peakHour = 0;
    for (let h = 0; h < 24; h++) if (hourAvg[h] > hourAvg[peakHour]) peakHour = h;
    let startHour = peakHour, endHour = peakHour;
    const threshold = maxAvg * 0.7;
    if (peakHour + 1 <= 23 && hourAvg[peakHour + 1] >= threshold) endHour = peakHour + 1;
    else if (peakHour - 1 >= 0 && hourAvg[peakHour - 1] >= threshold) startHour = peakHour - 1;
    peak = { startHour, endHour: endHour + 1, avgMinutes: maxAvg };
  }

  const currentHour = now.getHours();
  return { rows, maxCell, peak, hasData, daysCovered, currentHour };
}


// --- Weekly report builder ---
// Key architectural decision:
//   - totalFlowSeconds & dailyFlow come from ALL focus events (simple sum)
//     → guarantees data visibility even with no flow segments
//   - flow segments are used ONLY for the Hero highlight
//     → rewards genuine deep-work streaks without blocking basic metrics
export function buildWeeklyReportData(events) {
  // Focus events: all productive-or-unknown browsing time
  const focusEvents = events.filter(isFocusEvent);

  // Total & daily from raw focus events (no threshold gating)
  const totalFlowSeconds = focusEvents.reduce((s, e) => s + e.duration, 0);

  const dailyFlow = {};
  for (const e of focusEvents) {
    const day = new Date(e.timestamp * 1000).toDateString();
    if (!dailyFlow[day]) dailyFlow[day] = { totalFlow: 0, segments: 0 };
    dailyFlow[day].totalFlow += e.duration;
    dailyFlow[day].segments++;
  }

  // Flow segments — only for highlight detection
  const flowSegments = detectFlowSegments(events, 600);
  const highlight = flowSegments.length > 0
    ? flowSegments.reduce((best, f) => f.duration > best.duration ? f : best, flowSegments[0])
    : null;

  // Fragmentation — all browser events
  const fragmentation = calcFragmentation(events);
  const avgSwitchesPerHour = fragmentation.length > 0
    ? (fragmentation.reduce((s, f) => s + f.switches, 0) / fragmentation.length).toFixed(1)
    : 0;

  // Golden focus hours — when deep flow reliably happens
  const goldenHours = calcGoldenHours(events);

  return {
    totalFlowSeconds,
    avgSwitchesPerHour,
    highlight,
    dailyFlow,
    flowSegmentsCount: flowSegments.length,
    fragmentation,
    goldenHours
  };
}
