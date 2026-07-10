const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore, readStoreObj, writeStoreObj } = require('../utils/fileStore.utils');

// ── Helpers ─────────────────────────────────────────────────────
const getDoctor = (doctorId) => {
  const doctors = readStore('doctors.json');
  const doc = doctors.find(d => d.id === doctorId);
  if (!doc) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });
  return doc;
};

const stripSensitive = (doc) => {
  const { passwordHash, ...safe } = doc;
  return safe;
};

const userSummary = (u) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  name: `${u.firstName} ${u.lastName}`.trim(),
  email: u.email,
  avatar: u.avatar || '',
  reason: u.reason || '',
  goals: u.goals || [],
  createdAt: u.createdAt,
});

const fmtTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
};

// A patient "belongs" to a doctor once they've booked an appointment with
// them or have a message thread with them.
const getRelatedUserIds = (doctor) => {
  const ids = new Set();
  readStore('appointments.json')
    .filter(a => a.counselorId === doctor.counselorId)
    .forEach(a => ids.add(a.userId));
  const store = readStoreObj('messages.json');
  Object.entries(store).forEach(([userId, threads]) => {
    if (threads[doctor.counselorId] && threads[doctor.counselorId].length) ids.add(userId);
  });
  return ids;
};

// ── Profile ─────────────────────────────────────────────────────
const getProfile = (doctorId) => stripSensitive(getDoctor(doctorId));

const updateProfile = (doctorId, updates) => {
  const doctors = readStore('doctors.json');
  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx === -1) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

  const allowed = ['firstName', 'lastName', 'name', 'phone', 'bio', 'avatar', 'image', 'title', 'specialty', 'languages', 'price', 'available', 'approach'];
  allowed.forEach(k => { if (updates[k] !== undefined) doctors[idx][k] = updates[k]; });
  if (updates.firstName || updates.lastName) {
    doctors[idx].name = `Dr. ${doctors[idx].firstName} ${doctors[idx].lastName}`.trim();
  }
  doctors[idx].updatedAt = new Date().toISOString();
  writeStore('doctors.json', doctors);
  return stripSensitive(doctors[idx]);
};

// ── Patients ────────────────────────────────────────────────────
const getPatients = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const related = getRelatedUserIds(doctor);
  const users = readStore('users.json').filter(u => related.has(u.id));
  const moods = readStore('moods.json');
  const appointments = readStore('appointments.json');

  return users.map(u => {
    const userMoods = moods.filter(m => m.userId === u.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const userAppts = appointments.filter(a => a.userId === u.id);
    const avgMood = userMoods.length
      ? userMoods.reduce((s, m) => s + m.value, 0) / userMoods.length
      : null;
    return {
      ...userSummary(u),
      lastMood: userMoods[0] || null,
      avgMood: avgMood !== null ? Math.round(avgMood * 20) / 10 : null, // 0–10 scale
      moodCount: userMoods.length,
      appointmentCount: userAppts.length,
      completedSessions: userAppts.filter(a => a.status === 'completed').length,
      upcomingAppointment: userAppts
        .filter(a => a.status === 'confirmed' && new Date(a.dateTime) >= new Date())
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0] || null,
    };
  });
};

const getPatientDetail = (doctorId, patientId) => {
  const doctor = getDoctor(doctorId);
  if (!getRelatedUserIds(doctor).has(patientId)) {
    throw Object.assign(new Error('Patient not found'), { statusCode: 404 });
  }
  const users = readStore('users.json');
  const user = users.find(u => u.id === patientId);
  if (!user) throw Object.assign(new Error('Patient not found'), { statusCode: 404 });

  const moods = readStore('moods.json')
    .filter(m => m.userId === patientId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const appointments = readStore('appointments.json')
    .filter(a => a.userId === patientId)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  const notes = readStore('notes.json')
    .filter(n => n.doctorId === doctorId && n.patientId === patientId);

  return { ...userSummary(user), moods, appointments, notes };
};

// ── Appointments ────────────────────────────────────────────────
const getAppointments = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const users = readStore('users.json');
  const appointments = readStore('appointments.json');

  return appointments
    .filter(a => a.counselorId === doctor.counselorId)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .map(a => {
      const u = users.find(x => x.id === a.userId);
      return { ...a, patient: u ? userSummary(u) : null };
    });
};

const updateAppointment = (doctorId, id, updates) => {
  const doctor = getDoctor(doctorId);
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === id && a.counselorId === doctor.counselorId);
  if (idx === -1) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  const allowed = ['status', 'date', 'time', 'sessionType'];
  allowed.forEach(k => { if (updates[k] !== undefined) appointments[idx][k] = updates[k]; });
  if (updates.date || updates.time) {
    appointments[idx].dateTime = new Date(`${appointments[idx].date} ${appointments[idx].time}`).toISOString();
  }
  appointments[idx].updatedAt = new Date().toISOString();
  writeStore('appointments.json', appointments);
  return appointments[idx];
};

// ── Availability ────────────────────────────────────────────────
const DEFAULT_AVAILABILITY = {
  monday:    { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  tuesday:   { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  wednesday: { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  thursday:  { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  friday:    { enabled: true,  slots: [{ start: '09:00', end: '15:00' }] },
  saturday:  { enabled: false, slots: [] },
  sunday:    { enabled: false, slots: [] },
};

const getAvailability = (doctorId) => {
  const store = readStoreObj('availability.json');
  return store[doctorId] || DEFAULT_AVAILABILITY;
};

const updateAvailability = (doctorId, availability) => {
  const store = readStoreObj('availability.json');
  store[doctorId] = { ...(store[doctorId] || DEFAULT_AVAILABILITY), ...availability };
  writeStoreObj('availability.json', store);
  return store[doctorId];
};

// ── Counseling notes ────────────────────────────────────────────
const getNotes = (doctorId) => {
  const users = readStore('users.json');
  return readStore('notes.json')
    .filter(n => n.doctorId === doctorId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(n => {
      const u = users.find(x => x.id === n.patientId);
      return { ...n, patientName: u ? `${u.firstName} ${u.lastName}`.trim() : null };
    });
};

const createNote = (doctorId, { patientId, title, content, tags }) => {
  const notes = readStore('notes.json');
  const now = new Date().toISOString();
  const note = {
    id: uuidv4(),
    doctorId,
    patientId: patientId || null,
    title: title || 'Untitled note',
    content: content || '',
    tags: tags || [],
    createdAt: now,
    updatedAt: now,
  };
  notes.push(note);
  writeStore('notes.json', notes);
  return note;
};

const updateNote = (doctorId, id, updates) => {
  const notes = readStore('notes.json');
  const idx = notes.findIndex(n => n.id === id && n.doctorId === doctorId);
  if (idx === -1) throw Object.assign(new Error('Note not found'), { statusCode: 404 });

  const allowed = ['title', 'content', 'tags', 'patientId'];
  allowed.forEach(k => { if (updates[k] !== undefined) notes[idx][k] = updates[k]; });
  notes[idx].updatedAt = new Date().toISOString();
  writeStore('notes.json', notes);
  return notes[idx];
};

const deleteNote = (doctorId, id) => {
  const notes = readStore('notes.json');
  const filtered = notes.filter(n => !(n.id === id && n.doctorId === doctorId));
  if (filtered.length === notes.length) {
    throw Object.assign(new Error('Note not found'), { statusCode: 404 });
  }
  writeStore('notes.json', filtered);
};

// ── Chat (doctor side) ──────────────────────────────────────────
const getConversations = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const store = readStoreObj('messages.json');
  const users = readStore('users.json');
  const convs = [];

  Object.entries(store).forEach(([userId, threads]) => {
    const msgs = threads[doctor.counselorId];
    if (!msgs || !msgs.length) return;
    const u = users.find(x => x.id === userId);
    if (!u) return;
    const last = msgs[msgs.length - 1];
    convs.push({
      id: userId,
      patient: userSummary(u),
      lastMsg: last.text,
      time: last.time,
      lastAt: last.createdAt,
      unread: msgs.filter(m => m.isMe && !m.readByDoctor).length,
    });
  });

  return convs.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
};

const getDoctorMessages = (doctorId, userId) => {
  const doctor = getDoctor(doctorId);
  const store = readStoreObj('messages.json');
  const msgs = (store[userId] && store[userId][doctor.counselorId]) || [];

  // Mark patient messages as read by the doctor
  msgs.forEach(m => { if (m.isMe) m.readByDoctor = true; });
  if (store[userId]) {
    store[userId][doctor.counselorId] = msgs;
    writeStoreObj('messages.json', store);
  }

  // fromDoctor = message was sent by this doctor (isMe is from the user's perspective)
  return msgs.map(m => ({ ...m, fromDoctor: !m.isMe }));
};

const sendDoctorMessage = (doctorId, userId, text) => {
  const doctor = getDoctor(doctorId);
  const store = readStoreObj('messages.json');
  if (!store[userId]) store[userId] = {};
  if (!store[userId][doctor.counselorId]) store[userId][doctor.counselorId] = [];

  const msg = {
    id: uuidv4(),
    text,
    time: fmtTime(),
    isMe: false,          // from the user's perspective this is the counselor
    read: false,          // unread for the user
    readByDoctor: true,
    createdAt: new Date().toISOString(),
  };
  store[userId][doctor.counselorId].push(msg);
  writeStoreObj('messages.json', store);
  return { ...msg, fromDoctor: true };
};

// ── Analytics (shared by dashboard / analytics / reports) ───────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const getAnalytics = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const related = getRelatedUserIds(doctor);
  const users = readStore('users.json').filter(u => related.has(u.id));
  const moods = readStore('moods.json').filter(m => related.has(m.userId));
  const appointments = readStore('appointments.json').filter(a => a.counselorId === doctor.counselorId);
  const feedback = readStore('feedback.json').filter(f => f.counselorId === doctor.counselorId);

  const now = new Date();

  // Current week (Mon–Sun) appointment counts
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weeklyAppointments = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const dayAppts = appointments.filter(a => (a.dateTime || '').slice(0, 10) === key);
    return {
      day: DAY_NAMES[day.getDay()],
      appointments: dayAppts.length,
      completed: dayAppts.filter(a => a.status === 'completed').length,
    };
  });

  // Last 7 months: avg mood (all patients, 0–10) + revenue
  const moodTrend = [];
  const revenue = [];
  const patientGrowth = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthMoods = moods.filter(m => (m.createdAt || '').slice(0, 7) === key);
    const avg = monthMoods.length
      ? Math.round((monthMoods.reduce((s, m) => s + m.value, 0) / monthMoods.length) * 20) / 10
      : null;
    moodTrend.push({ month: MONTH_NAMES[d.getMonth()], avg });
    const monthAppts = appointments.filter(a => (a.dateTime || '').slice(0, 7) === key && a.status !== 'cancelled');
    revenue.push({ month: MONTH_NAMES[d.getMonth()], revenue: monthAppts.reduce((s, a) => s + (a.price || 0), 0) });
    patientGrowth.push({
      month: MONTH_NAMES[d.getMonth()],
      patients: users.filter(u => (u.createdAt || '') <= `${key}-31T23:59:59Z`).length,
    });
  }

  // Session status breakdown (%)
  const total = appointments.length || 1;
  const count = (st) => appointments.filter(a => a.status === st).length;
  const upcoming = appointments.filter(a => a.status === 'confirmed' && new Date(a.dateTime) >= now).length;
  const past = appointments.filter(a => a.status === 'confirmed' && new Date(a.dateTime) < now).length;
  const sessionPie = [
    { name: 'Completed', value: Math.round((count('completed') / total) * 100) },
    { name: 'Upcoming', value: Math.round((upcoming / total) * 100) },
    { name: 'Missed', value: Math.round((past / total) * 100) },
    { name: 'Cancelled', value: Math.round((count('cancelled') / total) * 100) },
  ];

  const avgRating = feedback.length
    ? Math.round((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length) * 10) / 10
    : doctor.rating || null;

  const allMoods = moods.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recentAvg = allMoods.slice(-10);
  const avgMoodNow = recentAvg.length
    ? Math.round((recentAvg.reduce((s, m) => s + m.value, 0) / recentAvg.length) * 20) / 10
    : null;

  return {
    weeklyAppointments,
    moodTrend,
    revenue,
    patientGrowth,
    sessionPie,
    totals: {
      totalPatients: users.length,
      totalAppointments: appointments.length,
      completedSessions: count('completed'),
      cancelledSessions: count('cancelled'),
      upcomingSessions: upcoming,
      monthlyRevenue: revenue[revenue.length - 1].revenue,
      avgRating,
      avgMood: avgMoodNow,
      reviewCount: feedback.length,
    },
  };
};

// ── Dashboard ───────────────────────────────────────────────────
const getDashboardStats = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const related = getRelatedUserIds(doctor);
  const users = readStore('users.json').filter(u => related.has(u.id));
  const appointments = readStore('appointments.json').filter(a => a.counselorId === doctor.counselorId);
  const notes = readStore('notes.json').filter(n => n.doctorId === doctorId);
  const feedback = readStore('feedback.json').filter(f => f.counselorId === doctor.counselorId);
  const store = readStoreObj('messages.json');

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const withPatient = (a) => {
    const u = users.find(x => x.id === a.userId);
    return { ...a, patient: u ? userSummary(u) : null };
  };

  const todays = appointments
    .filter(a => (a.dateTime || '').slice(0, 10) === today && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .map(withPatient);

  const upcoming = appointments
    .filter(a => a.status === 'confirmed' && new Date(a.dateTime) >= now)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .map(withPatient);

  // Recent activity feed derived from real events
  const activity = [];
  appointments.forEach(a => {
    const u = users.find(x => x.id === a.userId);
    const name = u ? `${u.firstName} ${u.lastName}`.trim() : 'A patient';
    if (a.status === 'completed') {
      activity.push({ icon: '✅', text: `Session completed with ${name}`, at: a.updatedAt || a.createdAt });
    } else if (a.status === 'cancelled') {
      activity.push({ icon: '❌', text: `${name} cancelled a session`, at: a.updatedAt || a.createdAt });
    } else {
      activity.push({ icon: '📅', text: `New appointment booked by ${name}`, at: a.createdAt });
    }
  });
  notes.forEach(n => activity.push({ icon: '📝', text: `Note saved: ${n.title}`, at: n.updatedAt }));
  feedback.forEach(f => activity.push({ icon: '⭐', text: `${f.rating}-star review received from ${f.patientName}`, at: f.createdAt }));
  Object.entries(store).forEach(([userId, threads]) => {
    const msgs = threads[doctor.counselorId] || [];
    const lastUserMsg = [...msgs].reverse().find(m => m.isMe);
    if (lastUserMsg) {
      const u = users.find(x => x.id === userId);
      activity.push({ icon: '💬', text: `New message from ${u ? u.firstName : 'a patient'}`, at: lastUserMsg.createdAt });
    }
  });
  const recentActivity = activity
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6)
    .map((a, i) => ({ id: i + 1, icon: a.icon, text: a.text, time: timeAgo(a.at) }));

  const unreadMessages = Object.values(store).reduce((sum, threads) => {
    const msgs = threads[doctor.counselorId] || [];
    return sum + msgs.filter(m => m.isMe && !m.readByDoctor).length;
  }, 0);

  const analytics = getAnalytics(doctorId);

  return {
    doctor: stripSensitive(doctor),
    totalPatients: users.length,
    activePatients: [...new Set(appointments.map(a => a.userId))].length,
    totalAppointments: appointments.length,
    todaysAppointments: todays,
    upcomingAppointments: upcoming.slice(0, 5),
    pendingRequests: upcoming.length,
    completedSessions: appointments.filter(a => a.status === 'completed').length,
    cancelledSessions: appointments.filter(a => a.status === 'cancelled').length,
    unreadMessages,
    recentActivity,
    ...analytics,
  };
};

// ── Notifications ───────────────────────────────────────────────
const getNotifications = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const users = readStore('users.json');
  const appointments = readStore('appointments.json').filter(a => a.counselorId === doctor.counselorId);
  const feedback = readStore('feedback.json').filter(f => f.counselorId === doctor.counselorId);
  const store = readStoreObj('messages.json');

  const items = [];
  appointments.forEach(a => {
    const u = users.find(x => x.id === a.userId);
    const name = u ? `${u.firstName} ${u.lastName}`.trim() : 'A patient';
    items.push({
      id: `appt-${a.id}`,
      type: 'appointment',
      title: a.status === 'cancelled' ? 'Appointment cancelled' : 'New appointment',
      text: `${name} — ${a.date} at ${a.time} (${a.sessionType})`,
      at: a.updatedAt || a.createdAt,
      read: false,
    });
  });
  Object.entries(store).forEach(([userId, threads]) => {
    const msgs = threads[doctor.counselorId] || [];
    msgs.filter(m => m.isMe && !m.readByDoctor).forEach(m => {
      const u = users.find(x => x.id === userId);
      items.push({
        id: `msg-${m.id}`,
        type: 'message',
        title: `New message from ${u ? u.firstName : 'a patient'}`,
        text: m.text.slice(0, 80),
        at: m.createdAt,
        read: false,
      });
    });
  });
  feedback.forEach(f => {
    items.push({
      id: `fb-${f.id}`,
      type: 'review',
      title: `${f.rating}-star review from ${f.patientName}`,
      text: f.comment.slice(0, 80),
      at: f.createdAt,
      read: true,
    });
  });

  return items
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 30)
    .map(n => ({ ...n, time: timeAgo(n.at) }));
};

// ── Feedback ────────────────────────────────────────────────────
const getFeedback = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const feedback = readStore('feedback.json')
    .filter(f => f.counselorId === doctor.counselorId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const avg = feedback.length
    ? Math.round((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length) * 10) / 10
    : null;
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: feedback.filter(f => f.rating === star).length,
  }));
  return { feedback, avg, total: feedback.length, distribution };
};

// ── Documents ───────────────────────────────────────────────────
const getDocuments = (doctorId) => {
  const doctor = getDoctor(doctorId);
  return readStore('documents.json')
    .filter(d => d.counselorId === doctor.counselorId)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
};

const createDocument = (doctorId, { name, type, size, patientId }) => {
  const doctor = getDoctor(doctorId);
  const docs = readStore('documents.json');
  const docItem = {
    id: uuidv4(),
    counselorId: doctor.counselorId,
    name: name || 'Untitled document',
    type: type || 'file',
    size: size || '—',
    patientId: patientId || null,
    uploadedAt: new Date().toISOString(),
  };
  docs.push(docItem);
  writeStore('documents.json', docs);
  return docItem;
};

const deleteDocument = (doctorId, id) => {
  const doctor = getDoctor(doctorId);
  const docs = readStore('documents.json');
  const filtered = docs.filter(d => !(d.id === id && d.counselorId === doctor.counselorId));
  if (filtered.length === docs.length) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  writeStore('documents.json', filtered);
};

// ── Security: real login history ────────────────────────────────
const getLogins = (doctorId) => {
  const { getLoginHistory } = require('./auth.service');
  return getLoginHistory(doctorId);
};

module.exports = {
  getProfile, updateProfile, getLogins,
  getPatients, getPatientDetail,
  getAppointments, updateAppointment,
  getAvailability, updateAvailability,
  getNotes, createNote, updateNote, deleteNote,
  getConversations, getDoctorMessages, sendDoctorMessage,
  getAnalytics, getDashboardStats, getNotifications,
  getFeedback,
  getDocuments, createDocument, deleteDocument,
};
