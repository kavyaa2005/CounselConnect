const { readStore, readStoreObj, writeStore } = require('../utils/fileStore.utils');
const { success } = require('../utils/response.utils');

const timeAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
};

// Notifications are derived from real events: counselor replies,
// appointment changes and upcoming sessions. Read state is persisted.
const getNotifications = (req, res, next) => {
  try {
    const userId = req.user.id;
    const readIds = new Set(readStore('notifications-read.json')
      .filter(r => r.userId === userId).map(r => r.notifId));
    const items = [];

    // Unread counselor messages
    const threads = readStoreObj('messages.json')[userId] || {};
    const doctors = readStore('doctors.json');
    Object.entries(threads).forEach(([counselorId, msgs]) => {
      const doc = doctors.find(d => d.counselorId === counselorId);
      msgs.filter(m => !m.isMe && !m.read).forEach(m => {
        items.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: `New message from ${doc ? doc.name : 'your counselor'}`,
          text: m.text.slice(0, 80),
          at: m.createdAt,
        });
      });
    });

    // Appointment updates + upcoming sessions
    readStore('appointments.json').filter(a => a.userId === userId).forEach(a => {
      items.push({
        id: `appt-${a.id}-${a.status}`,
        type: 'appointment',
        title: a.status === 'completed' ? 'Session completed'
          : a.status === 'cancelled' ? 'Appointment cancelled'
          : 'Appointment confirmed',
        text: `${a.counselorName} — ${a.date} at ${a.time}`,
        at: a.updatedAt || a.createdAt,
      });
      if (a.status === 'confirmed' && new Date(a.dateTime) >= new Date()) {
        items.push({
          id: `upcoming-${a.id}`,
          type: 'reminder',
          title: 'Upcoming session',
          text: `${a.sessionType === 'video' ? 'Video' : 'Chat'} session with ${a.counselorName} on ${a.date} at ${a.time}`,
          at: a.createdAt,
        });
      }
    });

    const notifications = items
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 30)
      .map(n => ({ ...n, time: timeAgo(n.at), read: readIds.has(n.id) }));

    return success(res, { notifications });
  } catch (err) { next(err); }
};

const markRead = (req, res, next) => {
  try {
    const reads = readStore('notifications-read.json');
    if (!reads.find(r => r.userId === req.user.id && r.notifId === req.params.id)) {
      reads.push({ userId: req.user.id, notifId: req.params.id, at: new Date().toISOString() });
      writeStore('notifications-read.json', reads);
    }
    return success(res, {}, 'Notification marked as read');
  } catch (err) { next(err); }
};

module.exports = { getNotifications, markRead };
