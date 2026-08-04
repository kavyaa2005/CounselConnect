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

    // Platform announcements sent by an admin
    require('../services/admin.service').getBroadcastsFor('user').forEach(b => {
      items.push({
        id: `broadcast-${b.id}`,
        type: b.type === 'warning' ? 'alert' : 'announcement',
        title: b.title,
        text: b.message,
        at: b.createdAt,
      });
    });

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
      const byStatus = {
        pending:   { type: 'request',      title: 'Request sent',
                     text: `Waiting for ${a.counselorName} to confirm ${a.date} at ${a.time}` },
        confirmed: { type: 'appointment',  title: 'Session confirmed',
                     text: `${a.counselorName} accepted — ${a.date} at ${a.time}` },
        rejected:  { type: 'cancellation', title: 'Request declined',
                     text: `${a.counselorName} couldn't take ${a.date} at ${a.time}`
                       + (a.rejectionReason ? ` — "${a.rejectionReason}"` : '. Try another time.') },
        cancelled: { type: 'cancellation', title: 'Appointment cancelled',
                     text: `${a.counselorName} — ${a.date} at ${a.time}` },
        completed: { type: 'appointment',  title: 'Session completed',
                     text: `${a.counselorName} — ${a.date} at ${a.time}` },
      };
      const meta = byStatus[a.status] || byStatus.confirmed;
      items.push({
        id: `appt-${a.id}-${a.status}`,
        type: meta.type,
        title: meta.title,
        text: meta.text,
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

    /* A counselor replying to your review is an event you should hear about.
       The reply was being written to feedback.json and then read by nobody:
       no notification, and the client's own Feedback page rendered `replies`
       (an array that is never appended to) rather than `reply`. */
    readStore('feedback.json')
      .filter(f => f.userId === userId && f.reply)
      .forEach(f => {
        items.push({
          id: `feedback-reply-${f.id}`,
          type: 'message',
          title: `${f.replyBy || f.counselorName || 'Your counselor'} replied to your review`,
          text: String(f.reply).slice(0, 120),
          at: f.repliedAt || f.createdAt,
        });
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
