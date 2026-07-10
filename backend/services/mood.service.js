const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');

// Local (server-timezone) YYYY-MM-DD — avoids the UTC shift that made moods
// land on the wrong weekday.
const localDate = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const logMood = (userId, { value, label, emoji, notes }) => {
  const moods = readStore('moods.json');
  const today = localDate();

  // One mood per day: locked until tomorrow
  if (moods.find(m => m.userId === userId && m.date === today)) {
    throw Object.assign(new Error("You've already logged your mood today. Come back tomorrow!"), { statusCode: 409 });
  }
  const filtered = moods;

  const entry = {
    id: uuidv4(),
    userId,
    value,
    label,
    emoji,
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

module.exports = { logMood, getMoodHistory, getStreak, getMoodStats };
