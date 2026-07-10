const { readStore } = require('../utils/fileStore.utils');

const getTimeline = (userId) => {
  const moods = readStore('moods.json');
  const appointments = readStore('appointments.json');
  const journal = readStore('journal.json');
  const users = readStore('users.json');
  const user = users.find(u => u.id === userId);

  const milestones = [];

  // Account creation
  if (user) {
    milestones.push({
      date: new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      title: 'Joined CounselConnect',
      desc: "Welcome to your wellness journey! You took a brave first step by seeking support. This is where your growth story begins.",
      type: 'milestone',
    });
  }

  // First mood log
  const firstMood = moods.filter(m => m.userId === userId).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  if (firstMood) {
    milestones.push({
      date: new Date(firstMood.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      title: `First Mood Check-in ${firstMood.emoji}`,
      desc: `You logged your first mood as "${firstMood.label}". ${firstMood.notes ? `Notes: "${firstMood.notes}"` : 'Great start to tracking your wellness!'}`,
      type: 'mood',
      mood: firstMood.value * 20,
    });
  }

  // Appointments
  appointments.filter(a => a.userId === userId).forEach(appt => {
    milestones.push({
      date: new Date(appt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      title: `Session Booked with ${appt.counselorName}`,
      desc: `A ${appt.sessionType} session was booked for ${appt.date} at ${appt.time}.`,
      type: 'session',
    });
  });

  // Journal entries
  journal.filter(e => e.userId === userId).forEach(entry => {
    milestones.push({
      date: new Date(entry.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      title: `Journal: "${entry.title}"`,
      desc: entry.content.slice(0, 120) + (entry.content.length > 120 ? '...' : ''),
      type: 'note',
    });
  });

  // 7-day streak achievement
  const userMoods = moods.filter(m => m.userId === userId);
  if (userMoods.length >= 7) {
    milestones.push({
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      title: '7-Day Mood Streak 🔥',
      desc: "You've logged your mood consistently for 7 days! Your dedication to self-awareness is remarkable.",
      type: 'achievement',
    });
  }

  return milestones.sort((a, b) => new Date(b.date) - new Date(a.date));
};

module.exports = { getTimeline };
