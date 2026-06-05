import { getRecentEvents } from '../lib/db.js';
import { buildWeeklyReportData } from '../lib/aggregator.js';

// Read a CSS custom property off :root so canvas/inline-styled colors follow
// the same light/dark theme tokens as the stylesheet (prefers-color-scheme).
function cssVar(name, fallback = '') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function cssVarNum(name, fallback) {
  const n = parseFloat(cssVar(name));
  return Number.isFinite(n) ? n : fallback;
}

// --- Smart duration formatter ---
// Macro (metrics/chart): decimal hours → "8.5h" (asset feel, geek aesthetic)
// Micro (hero/emotional): {hours, mins} → natural language via i18n (dopamine hit)
// Rank (rankings): adaptive unit so sub-hour values stay distinguishable —
//   <1min → "Ns", <1h → "Nm", else "H.Hh". Avoids everything collapsing to
//   "0.0h"/"0.1h" when domains differ by seconds or a few minutes.
function formatDuration(seconds, type = 'macro') {
  if (seconds <= 0) return type === 'micro' ? { hours: 0, mins: 0 } : (type === 'rank' ? '0m' : '0h');
  const totalHours = seconds / 3600;
  const hours = Math.floor(totalHours);
  const mins = Math.floor((seconds % 3600) / 60);
  if (type === 'micro') return { hours, mins };
  if (type === 'rank') {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${totalHours.toFixed(1)}h`;
  }
  return `${totalHours.toFixed(1)}h`;
}

document.addEventListener('DOMContentLoaded', async () => {
  chrome.action.setBadgeText({ text: '' });

  setI18nLabels();

  const events = await getRecentEvents(7);
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const todayEvents = events.filter(e => e.timestamp >= todayStart);

  const report = buildWeeklyReportData(events);

  renderHero(report);
  renderMetrics(report);
  renderChart(report);
  renderGoldenHours(report);
  renderGoal(events);
  renderRanking('rankingDaily', 'rankingDailyTitle', 'ranking_daily_title', "Today's App Usage", todayEvents);
  renderRanking('rankingWeekly', 'rankingWeeklyTitle', 'ranking_weekly_title', "This Week's App Usage", events);
  // Coffee link (locale-aware)
  const coffeeLink = document.getElementById('coffeeLink');
  coffeeLink.href = chrome.i18n.getMessage('coffee_link') || '#';
  coffeeLink.textContent = `☕ ${chrome.i18n.getMessage('coffee_text') || 'Buy me a coffee'}`;

  // Settings link
  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('settingsLink').textContent =
    chrome.i18n.getMessage('settings_link') || 'Settings';

  renderExperiment(report);
  setupGoalInput();
  setupExport(events);
  setupLegends();
});

// --- Color legend popover (hover ⓘ next to ranking titles) ---
function setupLegends() {
  setupLegend('legendBtnDaily');
  setupLegend('legendBtnWeekly');
  setupTextTip('goldenTipBtn', 'golden_tip');
}

// A lightweight hover popover that just shows an i18n text string (used for
// the golden-hours info button). Reuses the legend popover styling.
function setupTextTip(btnId, msgKey) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const wrap = btn.parentElement; // .tw-legend-wrap
  const section = btn.closest('.tw-chart-section');
  const pop = document.createElement('div');
  pop.className = 'tw-legend-pop';
  pop.hidden = true;
  pop.style.fontWeight = '400';
  pop.textContent = chrome.i18n.getMessage(msgKey) || '';
  wrap.appendChild(pop);

  let hideTimer = null;
  const open = () => { clearTimeout(hideTimer); showLegend(pop, section); };
  const scheduleClose = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideLegend(pop, section), 250);
  };
  wrap.addEventListener('mouseenter', open);
  wrap.addEventListener('mouseleave', scheduleClose);
  btn.addEventListener('focus', open);
  wrap.addEventListener('focusout', scheduleClose);
}

function showLegend(pop, section) {
  pop.hidden = false;
  if (section) section.classList.add('tw-section-elevated');
}
function hideLegend(pop, section) {
  pop.hidden = true;
  if (section) section.classList.remove('tw-section-elevated');
}

function legendHtml() {
  const m = (k) => chrome.i18n.getMessage(k) || '';
  return `
    <h3>${m('legend_title')}</h3>
    <div class="tw-legend-group">
      <div class="tw-legend-cap">${m('legend_dot_intro')}</div>
      <div class="tw-legend-item"><span class="tw-legend-swatch" style="background:var(--tw-accent)"></span>${m('legend_dot_prod')}</div>
      <div class="tw-legend-item"><span class="tw-legend-swatch" style="background:#f87171"></span>${m('legend_dot_dist')}</div>
      <div class="tw-legend-item"><span class="tw-legend-swatch" style="background:var(--tw-text-muted)"></span>${m('legend_dot_null')}</div>
    </div>
    <div class="tw-legend-group">
      <div class="tw-legend-cap">${m('legend_bar_intro')}</div>
      <div class="tw-legend-item"><span class="tw-legend-bar"></span></div>
    </div>
    <a class="tw-legend-link" data-settings>${m('legend_customize')}</a>
  `;
}

function setupLegend(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const wrap = btn.parentElement; // .tw-legend-wrap
  const section = btn.closest('.tw-chart-section');
  const pop = document.createElement('div');
  pop.className = 'tw-legend-pop';
  pop.hidden = true;
  pop.innerHTML = legendHtml();
  wrap.appendChild(pop);

  // Hover-anchored: show on enter, hide shortly after leaving. The grace
  // delay + listening on the whole wrap (icon + popover) lets the cursor
  // travel into the popover to click the Settings link without it vanishing.
  let hideTimer = null;
  const open = () => { clearTimeout(hideTimer); showLegend(pop, section); };
  const scheduleClose = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideLegend(pop, section), 250);
  };
  wrap.addEventListener('mouseenter', open);
  wrap.addEventListener('mouseleave', scheduleClose);
  // Keyboard accessibility: focus shows, blur hides.
  btn.addEventListener('focus', open);
  wrap.addEventListener('focusout', scheduleClose);

  pop.querySelector('[data-settings]').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

// --- i18n label setup ---
function setI18nLabels() {
  document.getElementById('labelFlow').textContent = chrome.i18n.getMessage('metric_flow_label');
  document.getElementById('labelSwitch').textContent = chrome.i18n.getMessage('metric_switch_label');
  document.getElementById('labelBestDay').textContent = chrome.i18n.getMessage('metric_best_day_label');
  document.getElementById('labelGoal').textContent = chrome.i18n.getMessage('goal_label');
  document.getElementById('goalSetBtn').textContent = chrome.i18n.getMessage('goal_set');
  document.getElementById('goalInput').placeholder = chrome.i18n.getMessage('goal_placeholder');
  document.getElementById('chartTitle').textContent = chrome.i18n.getMessage('chart_title');
  document.getElementById('experimentTitle').textContent = chrome.i18n.getMessage('experiment_title');
  document.getElementById('exportBtn').textContent = chrome.i18n.getMessage('export_csv');
  document.getElementById('footerText').textContent = chrome.i18n.getMessage('footer_privacy');

  // Metric card hover tooltips
  document.getElementById('tipFlow').textContent = chrome.i18n.getMessage('tip_flow');
  document.getElementById('tipSwitch').textContent = chrome.i18n.getMessage('tip_switch');
  document.getElementById('tipBestDay').textContent = chrome.i18n.getMessage('tip_bestday');
  document.getElementById('tipGoal').textContent = chrome.i18n.getMessage('tip_goal');
  document.getElementById('heroInfoBubble').textContent = chrome.i18n.getMessage('hero_info');

  // Golden focus hours
  document.getElementById('goldenTitle').textContent = chrome.i18n.getMessage('golden_title');
  document.getElementById('axisMorning').textContent = chrome.i18n.getMessage('golden_axis_morning');
  document.getElementById('axisNoon').textContent = chrome.i18n.getMessage('golden_axis_noon');
  document.getElementById('axisEvening').textContent = chrome.i18n.getMessage('golden_axis_evening');
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
  const infoEl = document.getElementById('heroInfo');

  if (!report.highlight) {
    textEl.textContent = chrome.i18n.getMessage('no_data_hero');
    if (infoEl) infoEl.style.display = 'none'; // no duration to explain yet
    return;
  }
  if (infoEl) infoEl.style.display = '';

  const f = report.highlight;
  const template = HIGHLIGHT_TEMPLATES.find(t => t.condition(f)) || HIGHLIGHT_TEMPLATES[1];
  const emoji = template.emojis[Math.floor(Math.random() * template.emojis.length)];

  const d = new Date(f.startTs * 1000);
  const day = getDayName(d);
  const domain = f.domain;
  const { hours, mins } = formatDuration(f.duration, 'micro');
  const hh = String(hours);
  const mm = String(mins);

  emojiEl.textContent = emoji;

  // Micro-granularity: < 1h shows minutes-only, >= 1h shows hours+minutes
  // hero_warrior always has hours >= 1 (threshold: 5400s); hero_good relies on $4 (minutes)
  if (hours === 0) {
    textEl.textContent = chrome.i18n.getMessage(template.key, [day, domain, '0', mm]);
  } else if (mins === 0) {
    textEl.textContent = chrome.i18n.getMessage(template.key, [day, domain, hh, '0']);
  } else {
    textEl.textContent = chrome.i18n.getMessage(template.key, [day, domain, hh, mm]);
  }
}

// --- Metrics ---
function renderMetrics(report) {
  document.getElementById('metricFlow').textContent = formatDuration(report.totalFlowSeconds, 'macro');
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

  const barColor = cssVar('--tw-chart-bar', 'rgba(20,184,166,0.65)');
  const barEmpty = cssVar('--tw-chart-bar-empty', 'rgba(255,255,255,0.04)');
  const gridColor = cssVar('--tw-chart-grid', 'rgba(255,255,255,0.03)');
  const tickColor = cssVar('--tw-chart-tick', 'rgba(255,255,255,0.40)');
  const accentSolid = cssVar('--tw-accent', '#14b8a6');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(v => v > 0 ? barColor : barEmpty),
        borderColor: accentSolid,
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
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            callback: (v) => `${v}h`
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: tickColor }
        }
      }
    }
  });
}

// --- Golden focus hours ---
// Format an hour number (0-23) as a localized clock label like "9 AM" / "14:00".
// We use 24h "HH:00" form — compact and unambiguous across locales.
function fmtHour(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

// Returns a window label like "10:00–11:00" from the peak's [startHour, endHour).
function goldenWindowLabel(peak) {
  return `${fmtHour(peak.startHour)}–${fmtHour(peak.endHour)}`;
}

function renderGoldenHours(report) {
  const gh = report.goldenHours;
  const resultEl = document.getElementById('goldenResult');
  const heatmap = document.getElementById('goldenHeatmap');
  heatmap.innerHTML = '';

  // Headline result (peak insight across the week).
  if (!gh || !gh.hasData || !gh.peak) {
    resultEl.textContent = chrome.i18n.getMessage('golden_empty');
    resultEl.classList.add('tw-golden-muted');
  } else {
    resultEl.classList.remove('tw-golden-muted');
    const windowLabel = goldenWindowLabel(gh.peak);
    const avgMin = Math.round(gh.peak.avgMinutes);
    const raw = chrome.i18n.getMessage('golden_result', [windowLabel, String(avgMin)]);
    resultEl.innerHTML = raw
      .replace(windowLabel, `<b>${windowLabel}</b>`)
      .replace(new RegExp(`(${avgMin})(?=\\s)`), '<b>$1</b>');
  }

  // 7 rows × 24 hour cells. Color = sqrt-scaled flow minutes vs the busiest
  // cell. Today's hours after "now" are marked future (empty, not zero).
  const rows = gh ? gh.rows : [];
  const maxCell = gh && gh.maxCell > 0 ? gh.maxCell : 1;
  const todayLabel = chrome.i18n.getMessage('golden_today') || 'Today';

  // Theme-aware heat color. On light, alpha floor is raised so faint cells
  // stay distinguishable from the empty-cell background.
  const heatRgb = cssVar('--tw-heat-rgb', '45,212,191');
  const heatAlphaMin = cssVarNum('--tw-heat-alpha-min', 0.15);
  const heatAlphaSpan = cssVarNum('--tw-heat-alpha-span', 0.70);

  for (const row of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'tw-heat-row' + (row.isToday ? ' tw-heat-row-today' : '');

    const label = document.createElement('span');
    label.className = 'tw-heat-daylabel';
    const dayName = row.isToday ? todayLabel : getDayName(new Date(row.dateString));
    label.textContent = dayName;
    rowEl.appendChild(label);

    for (let h = 0; h < 24; h++) {
      const cell = document.createElement('div');
      cell.className = 'tw-heat-cell';
      const isFuture = row.isToday && h > gh.currentHour;
      if (isFuture) {
        cell.classList.add('tw-heat-future');
      } else {
        const mins = row.hours[h] / 60;
        const ratio = mins / maxCell;
        if (ratio > 0.01) {
          const alpha = (heatAlphaMin + Math.sqrt(ratio) * heatAlphaSpan).toFixed(2);
          cell.style.background = `rgba(${heatRgb}, ${alpha})`;
        }
      }
      if (!isFuture) {
        const tip = document.createElement('span');
        tip.className = 'tw-heat-tip';
        tip.textContent = `${dayName} ${fmtHour(h)} · ${Math.round(row.hours[h] / 60)} min`;
        cell.appendChild(tip);
      }
      rowEl.appendChild(cell);
    }
    heatmap.appendChild(rowEl);
  }
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

  // For the high-switching tip, inject the user's real golden window if known;
  // otherwise fall back to the generic version (no hard-coded time range).
  if (key === 'experiment_switching') {
    const gh = report.goldenHours;
    if (gh && gh.hasData && gh.peak) {
      el.textContent = chrome.i18n.getMessage('experiment_switching', [goldenWindowLabel(gh.peak)]);
    } else {
      el.textContent = chrome.i18n.getMessage('experiment_switching_generic');
    }
    return;
  }
  el.textContent = chrome.i18n.getMessage(key);
}

// --- Domain rankings (daily + weekly) ---
function buildDomainRanking(events, topN = 10) {
  const map = {};
  for (const e of events) {
    if (e.source !== 'browser' || !e.domain) continue;
    if (!map[e.domain]) map[e.domain] = { duration: 0, category: e.category };
    map[e.domain].duration += e.duration;
    // Prefer a concrete classification over a stale null from an earlier event.
    if (!map[e.domain].category && e.category) map[e.domain].category = e.category;
  }
  const maxDur = Math.max(1, ...Object.values(map).map(d => d.duration));
  return Object.entries(map)
    .map(([domain, data]) => ({ domain, ...data, pct: data.duration / maxDur }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, topN);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Bar palette — cool spectrum (teal → cyan → sky → blue → indigo → violet),
// kept within calm hues (no harsh pink/rose). Opacity ramps down by rank so
// lower entries recede and never glare. Dots keep their category color
// (productive / distracted / unknown); only the bar encodes rank.
const RANK_BAR_HUES = [
  '45, 212, 191',  // 1 teal
  '34, 211, 238',  // 2 cyan
  '56, 189, 248',  // 3 sky
  '96, 165, 250',  // 4 blue
  '129, 140, 248', // 5 indigo
  '139, 148, 240', // 6 indigo-soft
  '148, 163, 235', // 7
  '156, 170, 228', // 8
  '163, 178, 222', // 9
  '170, 185, 216'  // 10 muted slate-blue
];
// Alpha steps down from 0.85 (rank 1) toward the theme's floor (~0.30 dark /
// ~0.45 light) so the list visually fades rather than every bar shouting at
// full saturation. The light floor is raised because the muted slate-blue
// hues at the bottom of the list otherwise vanish on a near-white track.
function rankBarColor(i) {
  const hue = RANK_BAR_HUES[Math.min(i, RANK_BAR_HUES.length - 1)];
  const floor = cssVarNum('--tw-rank-alpha-floor', 0.30);
  const alpha = Math.max(floor, 0.85 - i * 0.06);
  return `rgba(${hue}, ${alpha.toFixed(2)})`;
}

function renderRanking(containerId, titleId, titleKey, fallbackTitle, events) {
  const title = chrome.i18n.getMessage(titleKey) || fallbackTitle;
  document.getElementById(titleId).textContent = title;
  const ranking = buildDomainRanking(events);
  const container = document.getElementById(containerId);

  if (ranking.length === 0) {
    container.innerHTML =
      `<div class="tw-ranking-empty">${chrome.i18n.getMessage('ranking_empty')}</div>`;
    return;
  }

  container.innerHTML = ranking.map((item, i) => {
    const dotClass = item.category === 'productive' ? 'tw-dot-prod'
      : item.category === 'distracted' ? 'tw-dot-dist'
      : 'tw-dot-null';
    const barColor = rankBarColor(i);
    return `
      <div class="tw-ranking-row">
        <span class="tw-ranking-index">${i + 1}</span>
        <span class="tw-ranking-domain" title="${escapeHtml(item.domain)}">${escapeHtml(item.domain)}</span>
        <span class="tw-ranking-dot ${dotClass}"></span>
        <span class="tw-ranking-bar-track">
          <span class="tw-ranking-bar-fill" style="width:${(item.pct * 100).toFixed(0)}%;background:${barColor}"></span>
        </span>
        <span class="tw-ranking-time">${formatDuration(item.duration, 'rank')}</span>
      </div>
    `;
  }).join('');
}

// --- Daily focus goal ---
const GOAL_KEY = 'timewise_daily_goal_hours';
const DEFAULT_GOAL_HOURS = 2; // shown until the user sets their own

function renderGoal(events) {
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const todayFocus = events
    .filter(e => e.timestamp >= todayStart && e.source === 'browser' && !e.idle_detected && e.category !== 'distracted')
    .reduce((s, e) => s + e.duration, 0);

  chrome.storage.local.get(GOAL_KEY, (stored) => {
    const goalHours = stored[GOAL_KEY] || DEFAULT_GOAL_HOURS;
    const goalEl = document.getElementById('metricGoal');
    const currentH = (todayFocus / 3600).toFixed(1);
    const pct = Math.min(100, Math.round((parseFloat(currentH) / goalHours) * 100));
    goalEl.textContent = `${currentH} / ${goalHours}h`;
    goalEl.style.color = pct >= 80 ? cssVar('--tw-accent', '#14b8a6') : pct >= 40 ? '#f59e0b' : 'var(--tw-text-muted)';
  });
}

function setupGoalInput() {
  const input = document.getElementById('goalInput');
  const btn = document.getElementById('goalSetBtn');

  chrome.storage.local.get(GOAL_KEY, (stored) => {
    input.value = stored[GOAL_KEY] || DEFAULT_GOAL_HOURS;
  });

  const set = () => {
    const val = parseFloat(input.value);
    if (val > 0 && val <= 16) {
      chrome.storage.local.set({ [GOAL_KEY]: val }, () => location.reload());
    }
  };
  btn.addEventListener('click', set);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') set(); });
}

// --- Data export ---
function setupExport(events) {
  document.getElementById('exportBtn').addEventListener('click', () => {
    const rows = [['date', 'domain', 'duration_seconds', 'category', 'source']];
    for (const e of events) {
      rows.push([
        new Date(e.timestamp * 1000).toISOString().split('T')[0],
        e.domain || '',
        String(e.duration),
        e.category || 'null',
        e.source
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timewise-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
