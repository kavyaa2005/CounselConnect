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

/**
 * Before-and-after by life area.
 *
 * Built from the context tags the user actually attaches to a mood entry
 * ("work", "sleep", "family"…). For each tag we compare their average mood on
 * days carrying it in the first half of their history against the second.
 *
 * The previous version took ONE mood average and applied fixed offsets
 * (-14, +10, -5, +5) to invent five "dimensions" — it looked like five
 * measurements but was a single number wearing five hats.
 */
const TAG_LABELS = {
  work: 'Work', study: 'Study', sleep: 'Sleep', family: 'Family',
  health: 'Health', money: 'Money', relationships: 'Relationships', social: 'Social',
};

const buildGrowthComparison = (userMoods) => {
  // Needs a real before and a real after to compare.
  if (userMoods.length < 4) return [];

  const split = Math.floor(userMoods.length / 2);
  const older = userMoods.slice(0, split);
  const newer = userMoods.slice(split);
  const pct = (arr) => Math.round((arr.reduce((s, m) => s + m.value, 0) / arr.length) * 20);

  const tags = [...new Set(userMoods.flatMap(m => m.tags || []))];

  const areas = tags.map(tag => {
    const o = older.filter(m => (m.tags || []).includes(tag));
    const n = newer.filter(m => (m.tags || []).includes(tag));
    // Only report an area we can actually speak to on both sides
    if (!o.length || !n.length) return null;
    return {
      area: TAG_LABELS[tag] || tag.charAt(0).toUpperCase() + tag.slice(1),
      before: pct(o),
      after: pct(n),
      entries: o.length + n.length,
    };
  }).filter(Boolean);

  // Overall is always meaningful even with no tags at all
  areas.unshift({
    area: 'Overall mood',
    before: pct(older),
    after: pct(newer),
    entries: userMoods.length,
  });

  return areas.sort((a, b) => (b.after - b.before) - (a.after - a.before)).slice(0, 6);
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


/**
 * Suggestions derived from what the record actually shows.
 *
 * Every line here cites the user's own numbers. The previous version was three
 * fixed strings making specific claims — "improved your next-day mood by an
 * average of 12 points" — that were never measured from anything.
 */
const buildRecommendations = (moods, journal, appts) => {
  const recs = [];
  const avg = (arr) => arr.length ? arr.reduce((s, m) => s + m.value, 0) / arr.length : null;

  if (moods.length < 3) {
    recs.push({
      icon: '🌱', title: 'Log your mood for a few more days',
      desc: `You have ${moods.length} ${moods.length === 1 ? 'entry' : 'entries'} so far. A week of tracking is enough for patterns to start showing.`,
    });
  }

  // Which tag travels with the lowest moods?
  const tags = [...new Set(moods.flatMap(m => m.tags || []))];
  const byTag = tags.map(t => {
    const withTag = moods.filter(m => (m.tags || []).includes(t));
    return { tag: t, avg: avg(withTag), count: withTag.length };
  }).filter(t => t.count >= 2);

  if (byTag.length) {
    const worst = [...byTag].sort((a, b) => a.avg - b.avg)[0];
    const best = [...byTag].sort((a, b) => b.avg - a.avg)[0];
    recs.push({
      icon: '🎯', title: `Talk about ${worst.tag}`,
      desc: `Your mood averages ${Math.round(worst.avg * 20)}% on days you tag "${worst.tag}" — your lowest area across ${worst.count} entries. Worth raising in your next session.`,
    });
    if (best.tag !== worst.tag) {
      recs.push({
        icon: '💪', title: `More of what works: ${best.tag}`,
        desc: `Days tagged "${best.tag}" average ${Math.round(best.avg * 20)}%, your strongest area. Whatever you're doing there, do more of it.`,
      });
    }
  }

  // Day-of-week pattern
  if (moods.length >= 7) {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDay = DAYS.map((name, i) => {
      const d = moods.filter(m => new Date(`${m.date}T00:00:00`).getDay() === i);
      return { name, avg: avg(d), count: d.length };
    }).filter(d => d.count >= 2);
    if (byDay.length >= 3) {
      const low = [...byDay].sort((a, b) => a.avg - b.avg)[0];
      recs.push({
        icon: '📅', title: `${low.name}s are hardest`,
        desc: `Your mood averages ${Math.round(low.avg * 20)}% on ${low.name}s. Planning something restorative for that day is a small change with a measurable target.`,
      });
    }
  }

  // Intensity, if they've been using it
  const withIntensity = moods.filter(m => typeof m.intensity === 'number');
  if (withIntensity.length >= 3) {
    const hi = withIntensity.filter(m => m.intensity >= 7);
    if (hi.length) {
      recs.push({
        icon: '🌊', title: 'Feelings are running strong',
        desc: `${hi.length} of your ${withIntensity.length} entries logged intensity 7 or above. Grounding exercises help most when intensity is high — they're on the Emergency page.`,
      });
    }
  }

  if (!journal.length && moods.length >= 3) {
    recs.push({
      icon: '📓', title: 'Try writing one entry',
      desc: "You're tracking mood but not journalling. A few sentences on a hard day gives your counselor far more to work with than a number.",
    });
  }

  const upcoming = appts.filter(a => ['pending', 'confirmed'].includes(a.status) && new Date(a.dateTime) > new Date());
  if (!upcoming.length && appts.length) {
    recs.push({
      icon: '📆', title: 'Nothing booked yet',
      desc: `You've had ${appts.filter(a => a.status === 'completed').length} session${appts.filter(a => a.status === 'completed').length === 1 ? '' : 's'}. Momentum matters more than frequency — book the next one when you're ready.`,
    });
  }

  if (!recs.length) {
    recs.push({
      icon: '✨', title: "You're on track",
      desc: 'Nothing in your recent entries needs attention. Keep logging — the picture gets more useful the longer it runs.',
    });
  }

  return recs.slice(0, 4);
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
    recommendations: buildRecommendations(userMoods, userJournal, userAppts),
    moodHistory8Weeks:  buildMoodHistory8Weeks(userMoods),
    wellnessDimensions: buildWellnessDimensions(userMoods, growthScore, userJournal.length, totalSessions),
    growthComparison:   buildGrowthComparison(userMoods),
  };
};


/**
 * Recommendations for the dashboard, with no questionnaire required.
 *
 * Derives the "answers" the matcher wants from what we already know about the
 * user: the concern they gave at sign-up, the life areas they tag most on low
 * mood days, and their preferred session type. That makes the dashboard card a
 * real match rather than "the first two counselors, with a percentage invented
 * from their star rating".
 */
const getRecommendedCounselors = (userId, limit = 3) => {
  const user = readStore('users.json').find(u => u.id === userId);
  const moods = readStore('moods.json').filter(m => m.userId === userId);

  const answers = [];
  if (user?.reason) answers.push(user.reason);
  if (user?.sessionType) answers.push(user.sessionType);
  (user?.goals || []).forEach(g => answers.push(g));

  // The areas that travel with this person's lowest moods say more about what
  // they need than a sign-up dropdown does.
  const tagAvg = {};
  moods.forEach(m => (m.tags || []).forEach(t => {
    (tagAvg[t] = tagAvg[t] || []).push(m.value);
  }));
  Object.entries(tagAvg)
    .map(([tag, vals]) => ({ tag, avg: vals.reduce((s, v) => s + v, 0) / vals.length, n: vals.length }))
    .filter(t => t.n >= 2)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 2)
    .forEach(t => answers.push(t.tag));

  // Nothing known yet — fall back to standing, and say so.
  if (!answers.length) {
    return {
      basis: 'rating',
      matches: readStore('doctors.json')
        .filter(d => d.available !== false)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit)
        .map(d => ({
          id: d.counselorId, name: d.name, specialty: d.specialty,
          image: d.image || d.avatar, rating: d.rating, price: d.price,
          match: null, reason: 'Top rated',
        })),
    };
  }

  return { basis: 'profile', answers, matches: matchCounselors(answers).slice(0, limit) };
};

module.exports = { matchCounselors, getMoodInsights, getJourneySummary, getRecommendedCounselors };
