// Help & Support: FAQ, support tickets, bug reports, suggestions.
//
// Tickets are visible to admins, so this is also the channel through which a
// user can escalate something the app itself can't resolve.

const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');

const STORE = 'support-tickets.json';

const CATEGORIES = ['question', 'bug', 'suggestion', 'billing', 'account', 'other'];
const STATUSES = ['open', 'in-progress', 'resolved', 'closed'];

const FAQ = [
  {
    category: 'Getting started',
    items: [
      { q: 'How do I book my first session?', a: 'Go to Find Counselor, browse or filter the list, then open a profile and pick an available time. Your counselor accepts or declines the request, and you\'ll be notified either way. Nothing is charged until they accept.' },
      { q: 'How is my counselor matched to me?', a: 'AI Match looks at the concerns you shared at sign-up and your mood history, then scores counselors by specialty fit. You can always browse the full list yourself instead.' },
      { q: 'What is the difference between an online and in-person session?', a: 'Online sessions happen over video or chat inside the app. In-person sessions take place at your counselor\'s practice and have no join link.' },
    ],
  },
  {
    category: 'Sessions',
    items: [
      { q: 'How do I join a video session?', a: 'Open Video Sessions and choose your counselor. You can start a video call or a voice-only call. Allow camera and microphone access when your browser asks.' },
      { q: 'Can I reschedule or cancel?', a: 'Yes. On the Appointments page, each upcoming session has Reschedule and Cancel. Rescheduling a confirmed session asks your counselor to approve the new time.' },
      { q: 'What happens if I miss a session?', a: 'It stays in your history as not completed. Message your counselor to arrange another time — most are happy to.' },
      { q: 'Is my session recorded?', a: 'No. Video and audio flow directly between your browser and your counselor\'s. Nothing is recorded or stored by CounselConnect.' },
    ],
  },
  {
    category: 'Privacy',
    items: [
      { q: 'Who can see my journal entries?', a: 'Only you, unless you explicitly share an entry. Each entry has a private/shared toggle and defaults to private.' },
      { q: 'Can my counselor see my mood data?', a: 'They see aggregate trends — averages and direction of travel — to inform your sessions. You control detailed sharing in Settings → Privacy.' },
      { q: 'Are my session notes private?', a: 'Notes you write about a session are yours alone; your counselor never sees them. Notes your counselor writes are their clinical record and are private to them unless they choose to share one with you.' },
      { q: 'What happens if I delete my account?', a: 'Your profile, journals, mood history and messages are removed. Appointment records are retained where a counselor is required to keep them.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'When am I charged?', a: 'Only after your counselor accepts the request. A pending request is never billed.' },
      { q: 'Do I get a refund if a session is cancelled?', a: 'Yes. If you cancel a paid session, or your counselor cancels or declines it, the payment is refunded automatically. You\'ll see it on the Payments page.' },
    ],
  },
];

const summarise = (t, users) => {
  const u = users.find(x => x.id === t.userId);
  return {
    ...t,
    userName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : 'Unknown',
    userEmail: u?.email || '',
    replyCount: (t.replies || []).length,
  };
};

const getFaq = () => FAQ;

const listMine = (userId) =>
  readStore(STORE)
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

const create = (userId, { subject, category, message, severity, page }) => {
  const subj = String(subject || '').trim();
  const body = String(message || '').trim();
  if (!subj) throw Object.assign(new Error('Give your ticket a subject'), { statusCode: 400 });
  if (body.length < 10) {
    throw Object.assign(new Error('Tell us a bit more — at least 10 characters'), { statusCode: 400 });
  }

  const cat = CATEGORIES.includes(category) ? category : 'question';
  const now = new Date().toISOString();
  const all = readStore(STORE);

  const ticket = {
    id: uuidv4(),
    // Short human reference — easier to quote than a UUID
    ref: `CC-${String(all.length + 1).padStart(4, '0')}`,
    userId,
    subject: subj,
    category: cat,
    message: body,
    // Only meaningful for bug reports; harmless otherwise
    severity: ['low', 'medium', 'high'].includes(severity) ? severity : 'medium',
    page: String(page || '').slice(0, 120),
    status: 'open',
    replies: [],
    createdAt: now,
    updatedAt: now,
  };

  all.push(ticket);
  writeStore(STORE, all);
  return ticket;
};

/** A reply from either side. `from` is 'user' or 'admin'. */
const reply = (ticketId, from, actorId, text) => {
  const body = String(text || '').trim();
  if (!body) throw Object.assign(new Error('Write something first'), { statusCode: 400 });

  const all = readStore(STORE);
  const idx = all.findIndex(t => t.id === ticketId);
  if (idx === -1) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });

  // A user may only reply to their own ticket
  if (from === 'user' && all[idx].userId !== actorId) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }

  all[idx].replies = [...(all[idx].replies || []), {
    id: uuidv4(), from, text: body, at: new Date().toISOString(),
  }];
  // An admin reply moves it along; a user reply reopens a resolved ticket
  if (from === 'admin' && all[idx].status === 'open') all[idx].status = 'in-progress';
  if (from === 'user' && ['resolved', 'closed'].includes(all[idx].status)) all[idx].status = 'open';
  all[idx].updatedAt = new Date().toISOString();

  writeStore(STORE, all);
  return all[idx];
};

const setStatus = (ticketId, status) => {
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error(`Unknown status "${status}"`), { statusCode: 400 });
  }
  const all = readStore(STORE);
  const idx = all.findIndex(t => t.id === ticketId);
  if (idx === -1) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  all[idx].status = status;
  all[idx].updatedAt = new Date().toISOString();
  writeStore(STORE, all);
  return all[idx];
};

/* ── Admin view ── */

const listAll = ({ status, category } = {}) => {
  const users = readStore('users.json');
  let all = readStore(STORE)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (status && status !== 'all') all = all.filter(t => t.status === status);
  if (category && category !== 'all') all = all.filter(t => t.category === category);

  const everything = readStore(STORE);
  return {
    tickets: all.map(t => summarise(t, users)),
    counts: {
      open: everything.filter(t => t.status === 'open').length,
      'in-progress': everything.filter(t => t.status === 'in-progress').length,
      resolved: everything.filter(t => t.status === 'resolved').length,
      closed: everything.filter(t => t.status === 'closed').length,
      total: everything.length,
      bugs: everything.filter(t => t.category === 'bug' && t.status !== 'closed').length,
    },
  };
};

const getOne = (ticketId, userId = null) => {
  const t = readStore(STORE).find(x => x.id === ticketId);
  if (!t) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  if (userId && t.userId !== userId) {
    throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
  }
  return summarise(t, readStore('users.json'));
};

module.exports = {
  getFaq, listMine, create, reply, setStatus, listAll, getOne,
  CATEGORIES, STATUSES, FAQ,
};
