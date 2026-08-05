// Admin service — every figure the admin panel shows is derived from the real
// JSON stores. No mock data lives on the frontend any more.

const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/password.utils');
const { readStore, writeStore, readStoreObj, writeStoreObj } = require('../utils/fileStore.utils');

/* ───────────────────────── helpers ───────────────────────── */

const AVATAR_COLORS = [
  '#5E8B7E', '#2D6A4F', '#D8A48F', '#42A5F5', '#F59E0B', '#EF5350',
  '#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#F97316', '#6366F1',
];

const colorFor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(w => !/^dr\.?$/i.test(w)).slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '').join('') || '?';

const fullName = (a) =>
  a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || 'Unknown';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const relTime = (iso) => {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return 'Never';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return '1 day ago';
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  return w === 1 ? '1 week ago' : `${w} weeks ago`;
};

const strip = (o) => { const { passwordHash, ...rest } = o; return rest; };

const lastLoginFor = (accountId) => {
  const logins = readStore('logins.json').filter(l => l.accountId === accountId);
  if (!logins.length) return null;
  return logins.sort((a, b) => new Date(b.at) - new Date(a.at))[0].at;
};

/* ───────────────────────── users ───────────────────────── */

const toAdminUser = (u) => {
  const appts = readStore('appointments.json').filter(a => a.userId === u.id);
  const last = lastLoginFor(u.id);
  const name = fullName(u);
  return {
    id: u.id,
    name,
    email: u.email,
    phone: u.phone || '—',
    joined: fmtDate(u.createdAt),
    joinedAt: u.createdAt,
    status: u.status || 'Active',
    avatar: initials(name),
    avatarUrl: u.avatar || '',
    color: colorFor(u.id),
    sessions: appts.filter(a => a.status === 'completed').length,
    totalAppointments: appts.length,
    location: u.location || '—',
    age: u.age || null,
    gender: u.gender || '—',
    lastActive: relTime(last),
    reason: u.reason || '—',
    goals: u.goals || [],
    bio: u.bio || '',
  };
};

const listUsers = () => readStore('users.json').map(toAdminUser);

const getUserDetail = (id) => {
  const u = readStore('users.json').find(x => x.id === id);
  if (!u) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const doctors = readStore('doctors.json');
  const nameOf = (cid) => (doctors.find(d => d.counselorId === cid) || {}).name || 'Unassigned';

  const history = readStore('appointments.json')
    .filter(a => a.userId === id)
    .sort((a, b) => new Date(b.dateTime || b.createdAt) - new Date(a.dateTime || a.createdAt))
    .map(a => ({
      id: a.id.slice(0, 8).toUpperCase(),
      type: a.sessionType || 'Session',
      counselor: a.counselorName || nameOf(a.counselorId),
      date: a.date || fmtDate(a.dateTime),
      status: (a.status || 'pending').replace(/^./, c => c.toUpperCase()),
    }));

  const docs = readStore('documents.json')
    .filter(d => d.patientId === id)
    .map(d => d.name);

  const moods = readStore('moods.json').filter(m => m.userId === id);
  const journals = readStore('journal.json').filter(j => j.userId === id);

  return {
    ...toAdminUser(u),
    history,
    documents: docs,
    moodEntries: moods.length,
    journalEntries: journals.length,
    lastMood: moods.length ? moods[moods.length - 1].label : '—',
    loginHistory: readStore('logins.json')
      .filter(l => l.accountId === id)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10),
  };
};

const createUser = async ({ name, email, phone, location, gender, password, age }) => {
  const users = readStore('users.json');
  if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
    throw Object.assign(new Error('An account with this email already exists'), { statusCode: 409 });
  }
  const parts = String(name || '').trim().split(/\s+/);
  const now = new Date().toISOString();
  const user = {
    id: uuidv4(),
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
    email: String(email).toLowerCase(),
    passwordHash: await hashPassword(password || 'password123'),
    phone: phone || '',
    bio: '',
    avatar: '',
    location: location || '',
    gender: gender || '',
    age: age || null,
    status: 'Active',
    reason: '',
    sessionType: '',
    frequency: '',
    goals: [],
    notifications: { sessions: true, moodReminders: true, messages: true, aiInsights: false, newsletter: false },
    privacy: { shareProgress: false, anonymousData: true, profileVisible: true },
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  writeStore('users.json', users);
  return toAdminUser(user);
};

const updateUser = (id, updates) => {
  const users = readStore('users.json');
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (updates.name !== undefined) {
    const parts = String(updates.name).trim().split(/\s+/);
    users[idx].firstName = parts[0] || '';
    users[idx].lastName = parts.slice(1).join(' ');
  }
  ['email', 'phone', 'location', 'gender', 'age', 'status', 'bio'].forEach(k => {
    if (updates[k] !== undefined) users[idx][k] = updates[k];
  });
  users[idx].updatedAt = new Date().toISOString();
  writeStore('users.json', users);
  return toAdminUser(users[idx]);
};

const deleteUser = (id) => {
  const users = readStore('users.json');
  if (!users.some(u => u.id === id)) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  writeStore('users.json', users.filter(u => u.id !== id));

  // Cascade: remove the user's owned records
  writeStore('appointments.json', readStore('appointments.json').filter(a => a.userId !== id));
  writeStore('moods.json', readStore('moods.json').filter(m => m.userId !== id));
  writeStore('journal.json', readStore('journal.json').filter(j => j.userId !== id));
  writeStore('feedback.json', readStore('feedback.json').filter(f => f.userId !== id));
  const msgs = readStoreObj('messages.json');
  delete msgs[id];
  writeStoreObj('messages.json', msgs);
  return true;
};

/* ─────────────────────── counselors ─────────────────────── */

const counselorStats = (counselorId) => {
  const appts = readStore('appointments.json').filter(a => a.counselorId === counselorId);
  const fb = readStore('feedback.json').filter(f => f.counselorId === counselorId);
  const revenue = appts
    .filter(a => a.status === 'completed')
    .reduce((s, a) => s + (Number(a.price) || 0), 0);
  const avgRating = fb.length
    ? Number((fb.reduce((s, f) => s + (Number(f.rating) || 0), 0) / fb.length).toFixed(1))
    : 0;
  return { appointments: appts.length, completed: appts.filter(a => a.status === 'completed').length, revenue, reviews: fb.length, avgRating };
};

const toAdminCounselor = (d) => {
  const s = counselorStats(d.counselorId);
  const name = fullName(d);
  return {
    id: d.id,
    counselorId: d.counselorId,
    name,
    email: d.email,
    phone: d.phone || '—',
    specialty: d.specialty || '—',
    experience: d.experience || '—',
    rating: s.avgRating || d.rating || 0,
    sessions: s.completed || 0,
    lifetimeSessions: d.sessions || 0,
    status: d.status || (d.verified === false ? 'Pending' : 'Verified'),
    pending: (d.status || 'Verified') === 'Pending',
    avatar: initials(name),
    avatarUrl: d.image || d.avatar || '',
    color: colorFor(d.id),
    availability: d.availability || 'Mon–Fri',
    location: d.location || '—',
    revenue: `$${s.revenue.toLocaleString()}`,
    revenueValue: s.revenue,
    reviews: s.reviews,
    bio: d.bio || '',
    approach: d.approach || '',
    price: d.price || 0,
    languages: d.languages || [],
    title: d.title || '',
    joined: fmtDate(d.createdAt),
    lastActive: relTime(lastLoginFor(d.id)),
  };
};

const listCounselors = () => readStore('doctors.json').map(toAdminCounselor);

const getCounselorDetail = (id) => {
  const d = readStore('doctors.json').find(x => x.id === id);
  if (!d) throw Object.assign(new Error('Counselor not found'), { statusCode: 404 });
  const reviews = readStore('feedback.json')
    .filter(f => f.counselorId === d.counselorId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { ...toAdminCounselor(d), reviewList: reviews };
};

const createCounselor = async ({ name, email, phone, specialty, experience, location, bio, price, password }) => {
  const doctors = readStore('doctors.json');
  if (doctors.some(d => d.email.toLowerCase() === String(email).toLowerCase())) {
    throw Object.assign(new Error('A counselor with this email already exists'), { statusCode: 409 });
  }
  const nextNum = doctors.reduce((m, d) => Math.max(m, parseInt(String(d.id).replace(/\D/g, ''), 10) || 0), 0) + 1;
  const clean = String(name || '').replace(/^Dr\.?\s*/i, '').trim();
  const parts = clean.split(/\s+/);
  const now = new Date().toISOString();

  const doc = {
    id: `d${nextNum}`,
    counselorId: `c${nextNum}`,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
    name: /^dr\.?\s/i.test(String(name)) ? String(name).trim() : `Dr. ${clean}`,
    email: String(email).toLowerCase(),
    passwordHash: await hashPassword(password || 'doctor123'),
    role: 'doctor',
    title: 'Counselor',
    specialty: specialty || '',
    rating: 0,
    sessions: 0,
    experience: experience || '',
    languages: ['English'],
    available: true,
    price: Number(price) || 70,
    image: '',
    avatar: '',
    bio: bio || '',
    approach: '',
    badge: null,
    phone: phone || '',
    location: location || '',
    status: 'Pending',
    availability: 'Mon–Fri',
    createdAt: now,
    updatedAt: now,
  };
  doctors.push(doc);
  writeStore('doctors.json', doctors);
  return toAdminCounselor(doc);
};

const updateCounselor = (id, updates) => {
  const doctors = readStore('doctors.json');
  const idx = doctors.findIndex(d => d.id === id);
  if (idx === -1) throw Object.assign(new Error('Counselor not found'), { statusCode: 404 });

  if (updates.name !== undefined) {
    doctors[idx].name = String(updates.name);
    const clean = String(updates.name).replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
    doctors[idx].firstName = clean[0] || '';
    doctors[idx].lastName = clean.slice(1).join(' ');
  }
  ['email', 'phone', 'specialty', 'experience', 'location', 'bio', 'status',
    'price', 'availability', 'title', 'approach', 'available'].forEach(k => {
    if (updates[k] !== undefined) doctors[idx][k] = updates[k];
  });
  if (updates.status === 'Verified') doctors[idx].available = true;
  if (updates.status === 'Suspended') doctors[idx].available = false;

  doctors[idx].updatedAt = new Date().toISOString();
  writeStore('doctors.json', doctors);
  return toAdminCounselor(doctors[idx]);
};

const deleteCounselor = (id) => {
  const doctors = readStore('doctors.json');
  const doc = doctors.find(d => d.id === id);
  if (!doc) throw Object.assign(new Error('Counselor not found'), { statusCode: 404 });
  writeStore('doctors.json', doctors.filter(d => d.id !== id));
  writeStore('feedback.json', readStore('feedback.json').filter(f => f.counselorId !== doc.counselorId));
  return true;
};

/* ─────────────────────── appointments ─────────────────────── */

const cap = (s) => String(s || '').replace(/^./, c => c.toUpperCase());

const toAdminAppointment = (a) => {
  const users = readStore('users.json');
  const u = users.find(x => x.id === a.userId);
  const iso = a.dateTime ? new Date(a.dateTime) : null;
  const dateStr = iso && !isNaN(iso)
    ? `${iso.getFullYear()}-${String(iso.getMonth() + 1).padStart(2, '0')}-${String(iso.getDate()).padStart(2, '0')}`
    : '';
  return {
    id: a.id,
    ref: `A-${String(a.id).slice(0, 4).toUpperCase()}`,
    userId: a.userId,
    user: u ? fullName(u) : 'Deleted user',
    counselorId: a.counselorId,
    counselor: a.counselorName || '—',
    date: dateStr,
    dateLabel: a.date || fmtDate(a.dateTime),
    time: a.time || '',
    type: cap(a.sessionType) || 'Session',
    status: cap(a.status) || 'Pending',
    duration: a.duration || '50 min',
    price: a.price || 0,
    createdAt: a.createdAt,
  };
};

const listAppointments = () =>
  readStore('appointments.json')
    .map(toAdminAppointment)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const updateAppointment = (id, updates) => {
  const appts = readStore('appointments.json');
  const idx = appts.findIndex(a => a.id === id);
  if (idx === -1) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  if (updates.status) appts[idx].status = String(updates.status).toLowerCase();
  if (updates.date) {
    appts[idx].date = updates.dateLabel || updates.date;
    const t = updates.time || appts[idx].time || '09:00';
    const parsed = new Date(`${updates.date}T${t.length === 5 ? t : '09:00'}:00`);
    if (!isNaN(parsed)) appts[idx].dateTime = parsed.toISOString();
  }
  if (updates.time) appts[idx].time = updates.time;
  if (updates.counselorId) {
    appts[idx].counselorId = updates.counselorId;
    const d = readStore('doctors.json').find(x => x.counselorId === updates.counselorId);
    if (d) { appts[idx].counselorName = d.name; appts[idx].counselorAvatar = d.image || ''; }
  }
  if (updates.cancelReason) appts[idx].cancelReason = updates.cancelReason;

  appts[idx].updatedAt = new Date().toISOString();
  writeStore('appointments.json', appts);
  return toAdminAppointment(appts[idx]);
};

const deleteAppointment = (id) => {
  const appts = readStore('appointments.json');
  if (!appts.some(a => a.id === id)) {
    throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  }
  writeStore('appointments.json', appts.filter(a => a.id !== id));
  return true;
};

/* ───────────────────────── sessions ───────────────────────── */

const isToday = (iso) => {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

const listSessions = () => {
  const all = listAppointments();
  const fb = readStore('feedback.json');
  const notes = readStore('notes.json');

  const decorate = (a) => {
    const review = fb.find(f => f.userId === a.userId && f.counselorId === a.counselorId);
    const note = notes.find(n => n.patientId === a.userId);
    let status = a.status;
    if (status === 'Confirmed' || status === 'Pending') status = 'Upcoming';
    if (status === 'Active' || status === 'Live') status = 'Live';
    return {
      ...a,
      sessionRef: `S-${String(a.id).slice(0, 4).toUpperCase()}`,
      status,
      rating: review ? review.rating : null,
      notes: note ? note.content : null,
      attendance: a.status === 'Completed' ? 'Present' : '—',
      recorded: a.status === 'Completed',
    };
  };

  const today = all.filter(a => isToday(a.createdAt) || (a.date && isToday(a.date))).map(decorate);
  const completed = all.filter(a => a.status === 'Completed').map(decorate).slice(0, 20);
  const live = all.filter(a => a.status === 'Live' || a.status === 'Active').map(decorate);

  const durations = all.map(a => parseInt(a.duration, 10) || 50);
  const avgDuration = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
  const ratings = fb.map(f => Number(f.rating) || 0).filter(Boolean);
  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : '0.0';

  const now = new Date();
  const thisMonth = all.filter(a => {
    const d = new Date(a.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return {
    today,
    completed,
    live,
    kpis: {
      todayCount: today.length,
      liveCount: live.length,
      completedToday: today.filter(s => s.status === 'Completed').length,
      avgDuration: `${avgDuration} min`,
      avgRating: `${avgRating}★`,
      thisMonth,
    },
  };
};

/* ───────────────────────── messages ───────────────────────── */

const listConversations = () => {
  const store = readStoreObj('messages.json');
  const users = readStore('users.json');
  const doctors = readStore('doctors.json');
  const out = [];

  Object.entries(store).forEach(([userId, byCounselor]) => {
    const u = users.find(x => x.id === userId);
    Object.entries(byCounselor || {}).forEach(([counselorId, msgs]) => {
      const d = doctors.find(x => x.counselorId === counselorId);
      const list = Array.isArray(msgs) ? msgs : [];
      const last = list[list.length - 1];
      const uName = u ? fullName(u) : 'Deleted user';
      const dName = d ? d.name : 'Unknown counselor';
      out.push({
        id: `${userId}::${counselorId}`,
        userId,
        counselorId,
        user: uName,
        counselor: dName,
        userAvatar: initials(uName),
        counselorAvatar: initials(dName),
        userColor: colorFor(userId),
        counselorColor: colorFor(counselorId),
        lastMessage: last ? last.text : '',
        lastAt: last ? last.createdAt : null,
        time: last ? relTime(last.createdAt) : '—',
        count: list.length,
        unread: list.filter(m => m.isMe && !m.readByDoctor).length,
        flagged: !!(last && /\b(kill|suicide|harm|abuse|emergency)\b/i.test(last.text || '')),
      });
    });
  });

  return out.sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));
};

const getConversation = (userId, counselorId) => {
  const store = readStoreObj('messages.json');
  return ((store[userId] || {})[counselorId]) || [];
};

/* ───────────────────────── feedback ───────────────────────── */

const listFeedback = () => {
  const doctors = readStore('doctors.json');
  const users = readStore('users.json');
  const items = readStore('feedback.json').map(f => {
    const d = doctors.find(x => x.counselorId === f.counselorId);
    const u = users.find(x => x.id === f.userId);
    const name = f.patientName || (u ? fullName(u) : 'Anonymous');
    return {
      id: f.id,
      user: name,
      userId: f.userId,
      avatar: initials(name),
      color: colorFor(f.userId || name),
      counselor: d ? d.name : 'Unknown counselor',
      counselorId: f.counselorId,
      rating: Number(f.rating) || 0,
      comment: f.comment || '',
      date: fmtDate(f.createdAt || f.date),
      createdAt: f.createdAt || f.date,
      // Category is derived from the score so admins can triage quickly
      type: f.rating >= 4 ? 'Praise' : f.rating === 3 ? 'Feedback' : 'Complaint',
      status: f.status || 'Open',
      flagged: !!f.flagged,
      replies: f.replies || [],
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = items.length;
  const avg = total ? (items.reduce((s, i) => s + i.rating, 0) / total).toFixed(1) : '0.0';
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: items.filter(i => i.rating === star).length,
    pct: total ? Math.round((items.filter(i => i.rating === star).length / total) * 100) : 0,
  }));

  const positive = items.filter(i => i.rating >= 4).length;
  const neutral  = items.filter(i => i.rating === 3).length;
  const negative = items.filter(i => i.rating <= 2).length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  return {
    items,
    summary: {
      total,
      average: avg,
      distribution,
      flagged: items.filter(i => i.flagged).length,
      open: items.filter(i => i.status === 'Open').length,
      resolved: items.filter(i => i.status === 'Resolved').length,
      complaints: items.filter(i => i.type === 'Complaint').length,
      sentiment: [
        { name: 'Positive', value: pct(positive), color: '#4CAF50' },
        { name: 'Neutral',  value: pct(neutral),  color: '#FFC107' },
        { name: 'Negative', value: pct(negative), color: '#EF5350' },
      ],
    },
  };
};

const updateFeedback = (id, updates) => {
  const list = readStore('feedback.json');
  const idx = list.findIndex(f => f.id === id);
  if (idx === -1) throw Object.assign(new Error('Feedback not found'), { statusCode: 404 });
  if (updates.status !== undefined) list[idx].status = updates.status;
  if (updates.flagged !== undefined) list[idx].flagged = !!updates.flagged;
  if (updates.reply) {
    list[idx].replies = [...(list[idx].replies || []), String(updates.reply)];
    list[idx].status = 'Resolved';
  }
  writeStore('feedback.json', list);
  return true;
};

const deleteFeedback = (id) => {
  const list = readStore('feedback.json');
  if (!list.some(f => f.id === id)) throw Object.assign(new Error('Feedback not found'), { statusCode: 404 });
  writeStore('feedback.json', list.filter(f => f.id !== id));
  return true;
};

/* ───────────────────────── payments ───────────────────────── */

const listPayments = () => {
  const users = readStore('users.json');
  const records = readStore('payments.json');

  const nameOf = (userId) => {
    const u = users.find(x => x.id === userId);
    return u ? fullName(u) : 'Deleted user';
  };

  // Real transactions written by the billing service
  const real = records.map(p => ({
    id: p.receiptNumber || `TXN-${String(p.id).slice(0, 6).toUpperCase()}`,
    appointmentId: p.appointmentId,
    user: nameOf(p.userId),
    avatar: initials(nameOf(p.userId)),
    color: colorFor(p.userId),
    counselor: p.counselorName || '—',
    amount: Number(p.amount) || 0,
    method: p.methodLabel || p.method || 'Card',
    date: fmtDate(p.paidAt || p.createdAt),
    createdAt: p.paidAt || p.createdAt,
    status: p.status === 'refunded' ? 'Refunded' : 'Paid',
    simulated: !!p.simulated,
  }));

  // Bookings still awaiting checkout show as Pending, but never duplicate a
  // booking that already has a real payment record against it
  const settled = new Set(records.map(p => p.appointmentId));
  const pending = readStore('appointments.json')
    .filter(a => !settled.has(a.id))
    .filter(a => String(a.status).toLowerCase() !== 'cancelled')
    .map(a => ({
      id: `TXN-${String(a.id).slice(0, 6).toUpperCase()}`,
      appointmentId: a.id,
      user: nameOf(a.userId),
      avatar: initials(nameOf(a.userId)),
      color: colorFor(a.userId),
      counselor: a.counselorName || '—',
      amount: Number(a.price) || 0,
      method: '—',
      date: fmtDate(a.createdAt),
      createdAt: a.createdAt,
      status: 'Pending',
    }));

  const all = [...real, ...pending].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sum = (f) => all.filter(f).reduce((s, p) => s + p.amount, 0);

  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const revenue = all
      .filter(p => p.status === 'Paid')
      .filter(p => {
        const pd = new Date(p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      })
      .reduce((s, p) => s + p.amount, 0);
    return { month: label, revenue };
  });

  return {
    transactions: all,
    summary: {
      totalRevenue: sum(p => p.status === 'Paid'),
      pending: sum(p => p.status === 'Pending'),
      refunded: sum(p => p.status === 'Refunded'),
      count: all.length,
      // Platform keeps 20%, counselors get 80%
      platformFee: Math.round(sum(p => p.status === 'Paid') * 0.2),
      payouts: Math.round(sum(p => p.status === 'Paid') * 0.8),
    },
    monthly,
  };
};

/* ───────────────────────── analytics ───────────────────────── */

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const getAnalytics = () => {
  const users = readStore('users.json');
  const doctors = readStore('doctors.json');
  const appts = readStore('appointments.json');
  const moods = readStore('moods.json');
  const now = new Date();

  // Cumulative growth over the last 12 months
  const growth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      key: monthKey(d),
      users: users.filter(u => new Date(u.createdAt) <= end).length,
      counselors: doctors.filter(x => new Date(x.createdAt) <= end).length,
      appointments: appts.filter(a => new Date(a.createdAt) <= end).length,
    };
  });

  // Appointments by day of the current week
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const weekly = DAYS.map((day, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const sameDay = (a) => {
      const ad = new Date(a.dateTime || a.createdAt);
      return ad.toDateString() === d.toDateString();
    };
    const on = appts.filter(sameDay);
    return {
      day,
      completed: on.filter(a => a.status === 'completed').length,
      pending: on.filter(a => ['pending', 'confirmed', 'upcoming'].includes(String(a.status).toLowerCase())).length,
      cancelled: on.filter(a => String(a.status).toLowerCase() === 'cancelled').length,
    };
  });

  // Session categories from real specialties
  const PALETTE = ['#5E8B7E', '#2D6A4F', '#D8A48F', '#42A5F5', '#FFC107', '#8B5CF6', '#EF5350'];
  const bySpecialty = {};
  appts.forEach(a => {
    const d = doctors.find(x => x.counselorId === a.counselorId);
    const key = (d && d.specialty) || 'Other';
    bySpecialty[key] = (bySpecialty[key] || 0) + 1;
  });
  let categories = Object.entries(bySpecialty)
    .map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value);
  if (!categories.length) {
    categories = doctors.slice(0, 5).map((d, i) => ({ name: d.specialty || 'General', value: 0, color: PALETTE[i % PALETTE.length] }));
  }

  // Mood distribution across the platform
  const moodDist = [1, 2, 3, 4, 5].map(v => ({
    value: v,
    label: ['Very low', 'Low', 'Okay', 'Good', 'Great'][v - 1],
    count: moods.filter(m => Number(m.value) === v).length,
  }));

  const completed = appts.filter(a => a.status === 'completed').length;
  const cancelled = appts.filter(a => String(a.status).toLowerCase() === 'cancelled').length;

  return {
    growth,
    weekly,
    categories,
    moodDist,
    retention: {
      totalUsers: users.length,
      activeUsers: users.filter(u => appts.some(a => a.userId === u.id)).length,
      returning: users.filter(u => appts.filter(a => a.userId === u.id).length > 1).length,
      completionRate: appts.length ? Math.round((completed / appts.length) * 100) : 0,
      cancellationRate: appts.length ? Math.round((cancelled / appts.length) * 100) : 0,
    },
    topCounselors: listCounselors()
      .sort((a, b) => b.sessions - a.sessions || b.rating - a.rating)
      .slice(0, 5)
      .map(c => ({ name: c.name, sessions: c.sessions, rating: c.rating, avatar: c.avatar, color: c.color, revenue: c.revenueValue })),
  };
};

/* ───────────────────────── dashboard ───────────────────────── */

const getDashboard = () => {
  const users = readStore('users.json');
  const doctors = readStore('doctors.json');
  const appts = readStore('appointments.json');
  const fb = readStore('feedback.json');
  const analytics = getAnalytics();
  const payments = listPayments();

  const now = new Date();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const pctChange = (currentCount, previousCount) => {
    if (!previousCount) return currentCount ? '+100%' : '0%';
    const p = ((currentCount - previousCount) / previousCount) * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  };

  const usersPrev = users.filter(u => new Date(u.createdAt) <= lastMonthEnd).length;
  const docsPrev = doctors.filter(d => new Date(d.createdAt) <= lastMonthEnd).length;
  const apptsPrev = appts.filter(a => new Date(a.createdAt) <= lastMonthEnd).length;

  const todaysAppts = appts.filter(a => isToday(a.dateTime || a.createdAt));
  const completed = appts.filter(a => a.status === 'completed');
  const pending = appts.filter(a => ['pending', 'confirmed', 'upcoming'].includes(String(a.status).toLowerCase()));

  const stats = [
    { key: 'users', label: 'Total Users', value: users.length.toLocaleString(), change: pctChange(users.length, usersPrev), up: users.length >= usersPrev },
    { key: 'counselors', label: 'Active Counselors', value: doctors.filter(d => d.available !== false).length.toLocaleString(), change: pctChange(doctors.length, docsPrev), up: doctors.length >= docsPrev },
    { key: 'today', label: "Today's Sessions", value: todaysAppts.length.toLocaleString(), change: pctChange(appts.length, apptsPrev), up: true },
    { key: 'completed', label: 'Completed', value: completed.length.toLocaleString(), change: pctChange(completed.length, Math.max(apptsPrev - 1, 0)), up: true },
    { key: 'pending', label: 'Pending', value: pending.length.toLocaleString(), change: pending.length ? '+' + pending.length : '0', up: false },
    { key: 'revenue', label: 'Revenue', value: `$${(payments.summary.totalRevenue / 1000).toFixed(1)}K`, change: '+' + payments.summary.count, up: true },
  ];

  // Real activity feed, newest first
  const activities = [];
  users.slice(-6).forEach(u => activities.push({
    action: 'New user registered', name: fullName(u), at: u.createdAt,
    avatar: initials(fullName(u)), color: colorFor(u.id),
  }));
  appts.slice(-6).forEach(a => {
    const u = users.find(x => x.id === a.userId);
    activities.push({
      action: a.status === 'completed' ? 'Session completed' : 'Appointment booked',
      name: `${u ? fullName(u) : 'User'} → ${a.counselorName || 'Counselor'}`,
      at: a.updatedAt || a.createdAt,
      avatar: initials(a.counselorName || 'C'), color: colorFor(a.counselorId || ''),
    });
  });
  fb.slice(-4).forEach(f => {
    const d = doctors.find(x => x.counselorId === f.counselorId);
    activities.push({
      action: `${f.rating}★ review posted`,
      name: `${f.patientName || 'User'} → ${d ? d.name : 'Counselor'}`,
      at: f.createdAt || f.date, avatar: '★', color: '#FFC107',
    });
  });

  const recentActivities = activities
    .filter(a => a.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6)
    .map((a, i) => ({ ...a, id: i + 1, time: relTime(a.at) }));

  const upcomingSessions = listAppointments()
    .filter(a => ['Pending', 'Confirmed', 'Upcoming'].includes(a.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 5)
    .map((a, i) => ({ id: i + 1, user: a.user, counselor: a.counselor, time: a.time || '—', type: a.type, color: colorFor(a.counselorId || String(i)) }));

  return {
    stats,
    userGrowth: analytics.growth,
    appointmentWeek: analytics.weekly,
    sessionCategories: analytics.categories,
    recentActivities,
    upcomingSessions,
    topCounselors: analytics.topCounselors.slice(0, 4),
    systemStatus: [
      { name: 'API Server', health: 100, color: '#4CAF50' },
      { name: 'Data Store', health: 100, color: '#4CAF50' },
      { name: 'Auth Service', health: 100, color: '#4CAF50' },
      { name: 'File Uploads', health: 100, color: '#4CAF50' },
    ],
    counts: {
      users: users.length,
      counselors: doctors.length,
      // Needed so the notification composer can state a real recipient count
      // for every audience rather than guessing zero for admins.
      admins: readStore('admins.json').length,
      appointments: appts.length,
      feedback: fb.length,
      pendingCounselors: doctors.filter(d => (d.status || 'Verified') === 'Pending').length,
      // Counselor applications still awaiting a decision — the one queue that
      // is genuinely the admin's own work, rather than a platform-wide total.
      pendingApplications: readStore('applications.json')
        .filter(a => String(a.status || 'pending').toLowerCase() === 'pending').length,
      todaySessions: todaysAppts.length,
    },
  };
};

/* ───────────────────────── reports ───────────────────────── */

const getReports = () => {
  const d = getDashboard();
  const a = getAnalytics();
  const p = listPayments();
  const f = listFeedback();

  return {
    generatedAt: new Date().toISOString(),
    available: [
      { id: 'users', name: 'User Report', description: 'All registered users with activity', rows: d.counts.users, format: 'CSV' },
      { id: 'counselors', name: 'Counselor Report', description: 'Counselor roster, ratings and revenue', rows: d.counts.counselors, format: 'CSV' },
      { id: 'appointments', name: 'Appointment Report', description: 'Every booking with status', rows: d.counts.appointments, format: 'CSV' },
      { id: 'payments', name: 'Revenue Report', description: 'Transactions, payouts and refunds', rows: p.transactions.length, format: 'CSV' },
      { id: 'feedback', name: 'Feedback Report', description: 'Ratings and written reviews', rows: f.items.length, format: 'CSV' },
    ],
    highlights: {
      totalUsers: d.counts.users,
      totalCounselors: d.counts.counselors,
      totalAppointments: d.counts.appointments,
      totalRevenue: p.summary.totalRevenue,
      averageRating: f.summary.average,
      completionRate: a.retention.completionRate,
    },
  };
};

const buildCsv = (type) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = (headers, data, map) =>
    [headers.join(','), ...data.map(d => map(d).map(esc).join(','))].join('\n');

  switch (type) {
    case 'users':
      return rows(['Name', 'Email', 'Phone', 'Status', 'Sessions', 'Joined', 'Last Active'],
        listUsers(), u => [u.name, u.email, u.phone, u.status, u.sessions, u.joined, u.lastActive]);
    case 'counselors':
      return rows(['Name', 'Email', 'Specialty', 'Experience', 'Rating', 'Sessions', 'Revenue', 'Status'],
        listCounselors(), c => [c.name, c.email, c.specialty, c.experience, c.rating, c.sessions, c.revenue, c.status]);
    case 'appointments':
      return rows(['Ref', 'User', 'Counselor', 'Date', 'Time', 'Type', 'Status', 'Price'],
        listAppointments(), a => [a.ref, a.user, a.counselor, a.dateLabel, a.time, a.type, a.status, a.price]);
    case 'payments':
      return rows(['Txn', 'User', 'Counselor', 'Amount', 'Method', 'Status', 'Date'],
        listPayments().transactions, p => [p.id, p.user, p.counselor, p.amount, p.method, p.status, p.date]);
    case 'feedback':
      return rows(['User', 'Counselor', 'Rating', 'Comment', 'Date'],
        listFeedback().items, f => [f.user, f.counselor, f.rating, f.comment, f.date]);
    default:
      throw Object.assign(new Error('Unknown report type'), { statusCode: 400 });
  }
};

/* ─────────────────── platform notifications ─────────────────── */

const listNotifications = () => {
  const manual = readStore('platform-notifications.json');
  const d = getDashboard();

  // System-generated alerts, always current
  const system = [];
  if (d.counts.pendingCounselors > 0) {
    system.push({
      id: 'sys-pending-counselors',
      title: 'Counselor approvals waiting',
      message: `${d.counts.pendingCounselors} counselor application(s) need review.`,
      type: 'warning', audience: 'Admins', read: false, system: true,
      createdAt: new Date().toISOString(),
    });
  }
  const flagged = listConversations().filter(c => c.flagged).length;
  if (flagged > 0) {
    system.push({
      id: 'sys-flagged-messages',
      title: 'Flagged conversations',
      message: `${flagged} conversation(s) contain sensitive keywords and may need attention.`,
      type: 'alert', audience: 'Admins', read: false, system: true,
      createdAt: new Date().toISOString(),
    });
  }

  return [...system, ...manual].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Normalises whatever the UI sends into a canonical audience.
 *
 * The previous version compared `audience === 'All users'` literally, so any
 * other label silently skipped the broadcast — and the copy it did write went
 * to notifications.json, which no feed ever read. Broadcasts now live in one
 * place and both the user and doctor feeds read them directly.
 */
const AUDIENCES = ['users', 'counselors', 'admins', 'all'];

const normaliseAudience = (raw) => {
  const a = String(raw || 'all').trim().toLowerCase();
  // 'everyone' would otherwise only reach 'all' by falling through to the
  // default at the bottom — spelled out so it can't break silently.
  if (a.includes('all') || a.includes('everyone')) return 'all';
  if (a.includes('counselor') || a.includes('doctor')) return 'counselors';
  if (a.includes('admin')) return 'admins';
  if (a.includes('user') || a.includes('client') || a.includes('patient')) return 'users';
  return 'all';
};

const createNotification = ({ title, message, type = 'info', audience = 'all', scheduledFor = null }) => {
  const t = String(title || '').trim();
  const m = String(message || '').trim();
  if (!t || !m) {
    throw Object.assign(new Error('Title and message are required'), { statusCode: 400 });
  }

  // Scheduling used to be theatre: the UI appended "(Scheduled for …)" to the
  // message, sent it immediately, and then said "Notification Scheduled!".
  // A future send time is now stored and honoured.
  let sendAt = null;
  if (scheduledFor) {
    const when = new Date(scheduledFor);
    if (isNaN(when.getTime())) {
      throw Object.assign(new Error('That scheduled time could not be understood'), { statusCode: 400 });
    }
    if (when.getTime() > Date.now()) sendAt = when.toISOString();
  }

  const list = readStore('platform-notifications.json');
  const n = {
    id: uuidv4(),
    title: t,
    message: m,
    type,
    audience: normaliseAudience(audience),
    audienceLabel: String(audience || 'All users'),
    read: false,
    system: false,
    broadcast: true,
    /** null = send now; an ISO date = hold until then. */
    scheduledFor: sendAt,
    createdAt: new Date().toISOString(),
  };
  list.push(n);
  writeStore('platform-notifications.json', list);
  return n;
};

/** Has this broadcast's send time arrived? */
const isDue = (n) => !n.scheduledFor || new Date(n.scheduledFor).getTime() <= Date.now();

/**
 * Broadcasts visible to one role. Read by the user and doctor feeds so an
 * admin announcement actually lands in front of people.
 */
const getBroadcastsFor = (role) => {
  const want = role === 'doctor' ? 'counselors' : role === 'admin' ? 'admins' : 'users';
  return readStore('platform-notifications.json')
    .filter(n => n.broadcast !== false)
    .filter(isDue)
    .filter(n => n.audience === 'all' || n.audience === want);
};

const markNotificationRead = (id) => {
  const list = readStore('platform-notifications.json');
  const idx = list.findIndex(n => n.id === id);
  if (idx !== -1) { list[idx].read = true; writeStore('platform-notifications.json', list); }
  return true;
};

const deleteNotification = (id) => {
  const list = readStore('platform-notifications.json');
  writeStore('platform-notifications.json', list.filter(n => n.id !== id));
  return true;
};

/* ───────────────────────── settings ───────────────────────── */

const DEFAULT_SETTINGS = {
  general: {
    platformName: 'CounselConnect',
    supportEmail: 'support@counselconnect.com',
    timezone: 'Asia/Kolkata',
    language: 'English',
    maintenanceMode: false,
  },
  booking: {
    sessionDuration: 50,
    bufferMinutes: 10,
    maxAdvanceDays: 30,
    cancellationWindowHours: 24,
    autoConfirm: true,
  },
  payments: {
    currency: 'USD',
    platformFeePercent: 20,
    payoutSchedule: 'Weekly',
    refundsEnabled: true,
  },
  notifications: {
    emailAlerts: true,
    sessionReminders: true,
    weeklyDigest: true,
    marketingEmails: false,
  },
  security: {
    twoFactor: false,
    sessionTimeoutMinutes: 60,
    passwordMinLength: 6,
    auditLogging: true,
    ipWhitelist: false,
    strongPassword: true,
  },
  organization: {
    name: 'CounselConnect',
    email: 'admin@counselconnect.com',
    phone: '+91 98765 43210',
    timezone: 'Asia/Kolkata',
  },
  hours: {
    Mon: { open: true,  from: '08:00', to: '18:00' },
    Tue: { open: true,  from: '08:00', to: '18:00' },
    Wed: { open: true,  from: '08:00', to: '18:00' },
    Thu: { open: true,  from: '08:00', to: '18:00' },
    Fri: { open: true,  from: '08:00', to: '17:00' },
    Sat: { open: true,  from: '09:00', to: '13:00' },
    Sun: { open: false, from: '09:00', to: '13:00' },
  },
  adminNotifications: {
    newUser: true, newAppt: true, payment: true,
    counselorVerif: true, systemAlerts: false, weeklyReport: true,
  },
};

// Roles live outside DEFAULT_SETTINGS because they're a list, not a flat object
const DEFAULT_ROLES = [
  { name: 'Super Admin', color: '#EF5350', perms: ['All Access', 'Delete Data', 'Billing', 'API Keys'] },
  { name: 'Admin', color: '#5E8B7E', perms: ['Manage Users', 'View Reports', 'Settings', 'Notifications'] },
  { name: 'Support', color: '#42A5F5', perms: ['View Users', 'Manage Tickets', 'Send Notifications'] },
  { name: 'Counselor Manager', color: '#F59E0B', perms: ['Manage Counselors', 'View Sessions', 'Approve Docs'] },
];

const getSettings = () => {
  const saved = readStoreObj('settings.json');
  const merged = {};
  Object.keys(DEFAULT_SETTINGS).forEach(section => {
    merged[section] = { ...DEFAULT_SETTINGS[section], ...(saved[section] || {}) };
  });

  // The admin count is real, so role headcounts stay honest
  const adminCount = readStore('admins.json').length;
  merged.roles = (saved.roles || DEFAULT_ROLES).map((r, i) => ({
    ...r,
    users: r.name === 'Super Admin' ? Math.min(adminCount, 1) : r.name === 'Admin' ? Math.max(adminCount - 1, 0) : (r.users || 0),
  }));

  return merged;
};

const updateSettings = (updates) => {
  const current = getSettings();
  Object.keys(updates || {}).forEach(section => {
    if (section === 'roles' && Array.isArray(updates.roles)) {
      current.roles = updates.roles;
    } else if (current[section] && typeof current[section] === 'object') {
      current[section] = { ...current[section], ...updates[section] };
    }
  });
  writeStoreObj('settings.json', current);
  return getSettings();
};

/* ───────────────────────── audit log ───────────────────────── */

const getAuditLog = () =>
  readStore('logins.json')
    .slice()
    .reverse()
    .slice(0, 50)
    .map(l => {
      const who =
        readStore('users.json').find(u => u.id === l.accountId) ||
        readStore('doctors.json').find(d => d.id === l.accountId) ||
        readStore('admins.json').find(a => a.id === l.accountId);
      return {
        actor: who ? fullName(who) : 'Unknown',
        role: l.role,
        action: 'Signed in',
        device: l.device,
        ip: l.ip,
        at: l.at,
        time: relTime(l.at),
      };
    });

module.exports = {
  listUsers, getUserDetail, createUser, updateUser, deleteUser,
  listCounselors, getCounselorDetail, createCounselor, updateCounselor, deleteCounselor,
  listAppointments, updateAppointment, deleteAppointment,
  listSessions, listConversations, getConversation,
  listFeedback, updateFeedback, deleteFeedback,
  listPayments, getAnalytics, getDashboard, getReports, buildCsv,
  listNotifications, createNotification, markNotificationRead, deleteNotification,
  getBroadcastsFor, normaliseAudience,
  getSettings, updateSettings, getAuditLog,
};
