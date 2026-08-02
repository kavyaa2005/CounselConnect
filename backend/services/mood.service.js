const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');

// Local (server-timezone) YYYY-MM-DD — avoids the UTC shift that made moods
// land on the wrong weekday.
const localDate = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/**
 * Logs today's mood.
 *
 * `value` stays on the original 1–5 scale — every existing chart and the
 * doctor's avgMood calculation depend on it, so changing it would silently
 * corrupt historical analytics. `intensity` (1–10) is a new, independent
 * dimension: how strongly the feeling is felt, not which feeling it is.
 */
const logMood = (userId, { value, label, emoji, notes, intensity, tags }) => {
  const moods = readStore('moods.json');
  const today = localDate();

  // One mood per day: locked until tomorrow
  if (moods.find(m => m.userId === userId && m.date === today)) {
    throw Object.assign(new Error("You've already logged your mood today. Come back tomorrow!"), { statusCode: 409 });
  }
  const filtered = moods;

  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    throw Object.assign(new Error('Pick how you are feeling'), { statusCode: 400 });
  }
  let level = intensity === undefined || intensity === null ? null : Number(intensity);
  if (level !== null && (!Number.isFinite(level) || level < 1 || level > 10)) {
    throw Object.assign(new Error('Intensity must be between 1 and 10'), { statusCode: 400 });
  }

  const entry = {
    id: uuidv4(),
    userId,
    value: n,
    label,
    emoji,
    intensity: level,
    tags: Array.isArray(tags) ? tags.slice(0, 6) : [],
    notes: notes || '',
    date: today,
    createdAt: new Date().toISOString(),
  };
  filtered.push(entry);
  writeStore('moods.json', filtered);
  return entry;
};

const getMoodHistory = (userId, limit = 30) => {
  const moods = readStore('moods.json');
  return moods
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

const getStreak = (userId) => {
  const moods = readStore('moods.json');
  const userMoods = moods
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!userMoods.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < userMoods.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const entryDate = new Date(userMoods[i].date);
    entryDate.setHours(0, 0, 0, 0);
    if (entryDate.getTime() === expected.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

const getMoodStats = (userId) => {
  const moods = readStore('moods.json');
  const userMoods = moods.filter(m => m.userId === userId);

  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);

  const weekMoods = userMoods.filter(m => new Date(m.date) >= weekAgo);
  const monthMoods = userMoods.filter(m => new Date(m.date) >= monthAgo);

  const avg = (arr) => arr.length ? Math.round(arr.reduce((s, m) => s + (m.value * 20), 0) / arr.length) : 0;

  // Last 7 days, labelled with each day's REAL weekday (today is last)
  const buildWeekData = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dateStr = localDate(d);
      const entry = userMoods.find(m => m.date === dateStr);
      return {
        day: dayNames[d.getDay()],
        date: dateStr,
        isToday: i === 6,
        value: entry ? entry.value * 20 : null,
      };
    });
  };

  return {
    weekAvg: avg(weekMoods),
    monthAvg: avg(monthMoods),
    total: userMoods.length,
    weekData: buildWeekData(),
    streak: getStreak(userId),
    alreadyLoggedToday: userMoods.some(m => m.date === localDate()),
  };
};



/* ── History & reports ─────────────────────────────────────────── */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Full history with paging, for the dedicated history screen. */
const getFullHistory = (userId, { limit = 60, offset = 0 } = {}) => {
  const all = readStore('moods.json')
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const journals = readStore('journal.json').filter(j => j.userId === userId);

  const entries = all.slice(offset, offset + limit).map(m => ({
    ...m,
    dateLabel: new Date(`${m.date}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    }),
    // A journal written the same day gives the mood entry context
    journal: journals.find(j => String(j.createdAt).slice(0, 10) === m.date) || null,
  }));

  return { entries, total: all.length, hasMore: offset + limit < all.length };
};

/**
 * Weekly or monthly report.
 *
 * `period` is 'week' or 'month'. Buckets are built from real calendar
 * boundaries rather than rolling windows, so "this week" means what the
 * user thinks it means.
 */
const getReport = (userId, period = 'week') => {
  const all = readStore('moods.json')
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const now = new Date();
  const buckets = [];

  if (period === 'month') {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        key: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`,
        label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        start, end,
      });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - now.getDay() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      buckets.push({
        key: `w${i}`,
        label: i === 0 ? 'This week' : i === 1 ? 'Last week'
          : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        start, end,
      });
    }
  }

  const series = buckets.map(b => {
    const inRange = all.filter(m => {
      const d = new Date(`${m.date}T00:00:00`);
      return d >= b.start && d < b.end;
    });
    const vals = inRange.map(m => m.value);
    const levels = inRange.map(m => m.intensity).filter(v => typeof v === 'number');
    return {
      label: b.label,
      entries: inRange.length,
      // null (not 0) when nothing was logged, so the chart shows a gap
      avg: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 20) / 10 : null,
      avgIntensity: levels.length ? Math.round((levels.reduce((s, v) => s + v, 0) / levels.length) * 10) / 10 : null,
      best: vals.length ? Math.max(...vals) : null,
      worst: vals.length ? Math.min(...vals) : null,
    };
  });

  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const change = current?.avg != null && previous?.avg != null
    ? Math.round((current.avg - previous.avg) * 10) / 10
    : null;

  const withData = series.filter(s => s.avg != null);
  const overall = withData.length
    ? Math.round((withData.reduce((s, x) => s + x.avg, 0) / withData.length) * 10) / 10
    : null;

  // Most-used tags across the whole period
  const tagCount = {};
  all.forEach(m => (m.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));

  return {
    period,
    series,
    overall,
    change,
    totalEntries: all.length,
    loggedThisPeriod: current?.entries || 0,
    topTags,
    streak: getStreak(userId),
    narrative: !withData.length
      ? 'Not enough entries yet — log your mood for a few days and a picture will start to form.'
      : change == null
        ? `You're averaging ${overall}/10 across ${all.length} entries.`
        : change > 0.3 ? `Your mood is trending up — ${change > 0 ? '+' : ''}${change} on the previous ${period}.`
        : change < -0.3 ? `Your mood has dipped ${Math.abs(change)} since the previous ${period}. Worth mentioning to your counselor.`
        : `Your mood has held fairly steady around ${overall}/10.`,
  };
};

module.exports = { logMood, getMoodHistory, getStreak, getMoodStats,
  getFullHistory, getReport,
};
