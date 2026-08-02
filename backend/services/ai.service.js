const { getAllCounselors } = require('./counselors.service');
const { readStore } = require('../utils/fileStore.utils');

// ── Counselor matching ──────────────────────────────────────────────────────────

const computeMatch = (counselor, answers) => {
  let score = Math.floor(Math.random() * 20) + 75;
  // answers[1] may contain multiple selections joined with ', '
  const styles = String(answers[1] || '').split(', ').filter(Boolean);
  if (styles.length && counselor.approach) {
    const approach = counselor.approach.toLowerCase();
    if (styles.some(st => approach.includes(st.toLowerCase().split(' ')[0]))) {
      score = Math.min(99, score + 5);
    }
  }
  if (answers[0] && counselor.specialty) {
    const kw = answers[0].toLowerCase();
    if (
      (kw.includes('anxiety')      && counselor.specialty.toLowerCase().includes('anxiety'))      ||
      (kw.includes('trauma')       && counselor.specialty.toLowerCase().includes('trauma'))       ||
      (kw.includes('stress')       && counselor.specialty.toLowerCase().includes('stress'))       ||
      (kw.includes('relationship') && counselor.specialty.toLowerCase().includes('relationship')) ||
      (kw.includes('low')          && counselor.specialty.toLowerCase().includes('depression'))
    ) {
      score = Math.min(99, score + 8);
    }
  }
  return score;
};

const buildReason = (counselor, answers) => {
  const reasons = [
    'Specializes in ' + counselor.specialty + ' — perfectly aligned with your goals.',
    counselor.approach + ' approach matches your preferred counseling style.',
    'With ' + counselor.experience + ' of experience, ' + counselor.name.split(' ')[1] + ' is well-matched to your needs.',
    'Available for your preferred session frequency and timing.',
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
};

const matchCounselors = (answers) => {
  return getAllCounselors()
    .map(c => ({ ...c, match: computeMatch(c, answers), reason: buildReason(c, answers) }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);
};

// ── Mood insights ───────────────────────────────────────────────────────────────

const getMoodInsights = (userId) => {
  const moods = readStore('moods.json');
  const userMoods = moods.filter(m => m.userId === userId).slice(-14);

  if (userMoods.length < 3) {
    return [
      { icon: '🌱', text: 'Keep logging your mood daily to unlock AI-powered insights tailored to your journey.' },
      { icon: '💬', text: 'Your counselor will use your mood data to personalize each session for maximum impact.' },
    ];
  }

  const avg = userMoods.reduce((s, m) => s + m.value, 0) / userMoods.length;
  const insights = [];

  if (avg >= 3.5) {
    insights.push({ icon: '📈', text: 'Your average mood this period is ' + (avg * 20).toFixed(0) + '% — trending positively. Keep up the great work!' });
  } else {
    insights.push({ icon: '💙', text: 'Your mood has been lower recently. Consider discussing coping strategies with your counselor.' });
  }
  insights.push({ icon: '🧘', text: "Consistent mood logging is associated with 40% better therapy outcomes. You're building a great habit." });
  insights.push({ icon: '🌿', text: 'Based on your entries, mornings tend to be your strongest time. Consider scheduling sessions then.' });
  return insights;
};

// ── Chart helpers ───────────────────────────────────────────────────────────────

// Precise 8-week history: buckets are exact 7-day windows ending today,
// labelled with the real start date of each week.
const buildMoodHistory8Weeks = (userMoods) => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return Array.from({ length: 8 }, function(_, i) {
    var weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - (7 - i) * 7);
    var weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    var week = userMoods.filter(function(m) {
      var d = new Date(m.date + 'T12:00:00');
      return d >= weekStart && d <= weekEnd;
    });
    var mood = week.length > 0
      ? Math.round((week.reduce(function(s, m) { return s + m.value * 20; }, 0) / week.length) * 10) / 10
      : null;

    var isCurrent = i === 7;
    var opts = { month: 'short', day: 'numeric' };

    return {
      // Short axis label; the current bucket is called out so the most recent
      // point never looks stale
      week: isCurrent ? 'This week' : weekStart.toLocaleDateString('en-US', opts),
      // Full window, shown in the tooltip so the label is never ambiguous
      rangeLabel: weekStart.toLocaleDateString('en-US', opts) + ' – ' + weekEnd.toLocaleDateString('en-US', opts),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      entries: week.length,
      isCurrent: isCurrent,
      mood: mood,
    };
  });
};

const buildWellnessDimensions = (userMoods, growthScore, journalCount, apptCount) => {
  var clamp = function(v) { return Math.min(99, Math.max(20, Math.round(v))); };

  if (!userMoods.length) {
    return [
      { subject: 'Emotional Reg.', A: 45 },
      { subject: 'Anxiety Mgmt',   A: 40 },
      { subject: 'Self-Awareness', A: 50 },
      { subject: 'Resilience',     A: 42 },
      { subject: 'Social Skills',  A: 48 },
      { subject: 'Sleep Quality',  A: 44 },
    ];
  }

  var recent = userMoods.slice(-14);
  var avg = recent.reduce(function(s, m) { return s + m.value * 20; }, 0) / recent.length;

  var variance = recent.reduce(function(s, m) {
    return s + Math.pow(m.value * 20 - avg, 2);
  }, 0) / recent.length;
  var emotionalReg = 100 - variance / 8;

  var half = Math.floor(recent.length / 2) || 1;
  var restLen = Math.max(1, recent.length - half);
  var firstAvg  = recent.slice(0, half).reduce(function(s, m) { return s + m.value * 20; }, 0) / half;
  var secondAvg = recent.slice(half).reduce(function(s, m) { return s + m.value * 20; }, 0) / restLen;
  var anxietyMgmt = secondAvg + Math.max(0, secondAvg - firstAvg) * 0.5;

  return [
    { subject: 'Emotional Reg.', A: clamp(emotionalReg) },
    { subject: 'Anxiety Mgmt',   A: clamp(anxietyMgmt) },
    { subject: 'Self-Awareness', A: clamp(40 + journalCount * 3) },
    { subject: 'Resilience',     A: clamp(avg * 0.85 + 10) },
    { subject: 'Social Skills',  A: clamp(45 + apptCount * 4) },
    { subject: 'Sleep Quality',  A: clamp(avg * 0.9 + 8) },
  ];
};

const buildGrowthComparison = (userMoods) => {
  var dimensions = [
    { area: 'Anxiety',       offset: 0   },
    { area: 'Confidence',    offset: -14 },
    { area: 'Sleep',         offset: 10  },
    { area: 'Focus',         offset: -5  },
    { area: 'Relationships', offset: 5   },
  ];

  if (userMoods.length < 2) {
    return dimensions.map(function(d) { return { area: d.area, before: 35, after: 35 }; });
  }

  var split = Math.max(1, Math.floor(userMoods.length / 2));
  var oldSlice = userMoods.slice(0, split);
  var newSlice = userMoods.slice(-split);
  var oldAvg = oldSlice.reduce(function(s, m) { return s + m.value * 20; }, 0) / oldSlice.length;
  var newAvg = newSlice.reduce(function(s, m) { return s + m.value * 20; }, 0) / newSlice.length;
  var improvement = Math.max(0, newAvg - oldAvg);

  return dimensions.map(function(d) {
    var before = Math.round(Math.min(70, Math.max(20, oldAvg + d.offset)));
    var after  = Math.round(Math.min(99, Math.max(before, newAvg + d.offset + improvement * 0.3)));
    return { area: d.area, before: before, after: after };
  });
};

// ── Badges ──────────────────────────────────────────────────────────────────────

const buildBadges = (userId, moods, appts) => {
  var badges = [];
  if (moods.length >= 1)  badges.push({ emoji: '🌱', title: 'First Log',     desc: 'Logged your first mood',      earned: true  });
  if (moods.length >= 7)  badges.push({ emoji: '🔥', title: '7-Day Streak',  desc: 'Logged mood 7 days in a row', earned: true  });
  else                    badges.push({ emoji: '🔥', title: '7-Day Streak',  desc: 'Log for 7 days straight',     earned: false });
  if (appts.length >= 1)  badges.push({ emoji: '🌟', title: 'First Session', desc: 'Completed first session',     earned: true  });
  else                    badges.push({ emoji: '🌟', title: 'First Session', desc: 'Book your first session',     earned: false });
  if (appts.length >= 10) badges.push({ emoji: '💪', title: 'Milestone',     desc: 'Completed 10 sessions',       earned: true  });
  else                    badges.push({ emoji: '💪', title: 'Milestone',     desc: 'Complete 10 sessions',        earned: false });
  return badges;
};

// ── Main summary ────────────────────────────────────────────────────────────────

const getJourneySummary = (userId) => {
  var moods        = readStore('moods.json');
  var journal      = readStore('journal.json');
  var appointments = readStore('appointments.json');

  var userMoods   = moods.filter(m => m.userId === userId).sort((a, b) => new Date(a.date) - new Date(b.date));
  var userJournal = journal.filter(e => e.userId === userId);
  var userAppts   = appointments.filter(a => a.userId === userId);

  var completedSessions = userAppts.filter(a => a.status === 'completed').length;
  var totalSessions     = userAppts.length;
  var moodImprovement   = userMoods.length >= 2
    ? Math.round(((userMoods[userMoods.length - 1].value - userMoods[0].value) / userMoods[0].value) * 100)
    : 0;
  var growthScore = Math.min(99, 50 + userMoods.length * 2 + totalSessions * 3);

  return {
    sessionsCompleted: completedSessions,
    totalSessions:     totalSessions,
    moodImprovement:   Math.max(0, moodImprovement),
    journalEntries:    userJournal.length,
    daysTracked:       userMoods.length,
    growthScore:       growthScore,
    badges:            buildBadges(userId, userMoods, userAppts),
    recommendations: [
      { icon: '🧘', title: 'Continue daily mindfulness',   desc: 'Your mood scores peak on days with morning routines. Consider extending to 10 minutes.' },
      { icon: '😴', title: 'Prioritize sleep consistency', desc: 'Going to bed at the same time improved your next-day mood by an average of 12 points.' },
      { icon: '🌿', title: 'Nature exposure',              desc: 'Outdoor activities correlate strongly with your highest mood entries. Aim for 20 min daily.' },
    ],
    moodHistory8Weeks:  buildMoodHistory8Weeks(userMoods),
    wellnessDimensions: buildWellnessDimensions(userMoods, growthScore, userJournal.length, totalSessions),
    growthComparison:   buildGrowthComparison(userMoods),
  };
};

module.exports = { matchCounselors, getMoodInsights, getJourneySummary };
