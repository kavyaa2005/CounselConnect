const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore, readStoreObj, writeStoreObj } = require('../utils/fileStore.utils');
const { money, moneyShort, symbol } = require('../utils/money.utils');

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

const PROFILE_FIELDS = [
  'name', 'firstName', 'lastName', 'title', 'specialty', 'bio', 'approach',
  'experience', 'languages', 'price', 'phone', 'location', 'available',
  // Added: the spec asks for these and nothing was storing them.
  'qualification', 'qualifications', 'licenseNumber', 'image', 'avatar',
];

const updateProfile = (doctorId, updates) => {
  const doctors = readStore('doctors.json');
  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx === -1) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

  PROFILE_FIELDS.forEach(k => { if (updates[k] !== undefined) doctors[idx][k] = updates[k]; });
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

const VALID_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];

const updateAppointment = (doctorId, id, updates) => {
  const doctor = getDoctor(doctorId);
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === id && a.counselorId === doctor.counselorId);
  if (idx === -1) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  const before = appointments[idx].status;

  if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status)) {
    throw Object.assign(new Error(`Unknown status "${updates.status}"`), { statusCode: 400 });
  }

  const allowed = ['status', 'date', 'time', 'sessionType', 'mode'];
  allowed.forEach(k => { if (updates[k] !== undefined) appointments[idx][k] = updates[k]; });
  if (updates.date || updates.time) {
    appointments[idx].dateTime = new Date(`${appointments[idx].date} ${appointments[idx].time}`).toISOString();
  }

  // Record who decided and when — the client sees this on their side.
  if (updates.status && updates.status !== before) {
    if (updates.status === 'confirmed') {
      appointments[idx].acceptedAt = new Date().toISOString();
      appointments[idx].rejectionReason = '';
    }
    if (updates.status === 'rejected') {
      appointments[idx].rejectedAt = new Date().toISOString();
      appointments[idx].rejectionReason = String(updates.reason || '').trim();
    }
    if (updates.status === 'completed') appointments[idx].completedAt = new Date().toISOString();
  }

  appointments[idx].updatedAt = new Date().toISOString();
  writeStore('appointments.json', appointments);

  // A client who already paid must be refunded if the session is called off.
  if (appointments[idx].paymentStatus === 'paid'
      && ['rejected', 'cancelled'].includes(updates.status)) {
    try {
      require('./billing.service').refundForAppointment(
        appointments[idx].userId, id,
        updates.status === 'rejected' ? 'Request declined by counselor' : 'Cancelled by counselor'
      );
    } catch { /* nothing to refund */ }
    return readStore('appointments.json').find(a => a.id === id);
  }

  return appointments[idx];
};

/** Requests waiting on this counselor, oldest first — they've waited longest. */
const getPendingRequests = (doctorId) =>
  getAppointments(doctorId)
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));


/** Stores an uploaded avatar against the doctor record. */
const setProfilePhoto = (doctorId, filename) => {
  const doctors = readStore('doctors.json');
  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx === -1) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

  // Avatars are public by design — they appear on the counselor cards every
  // client browses, so unlike clinical files they live under /uploads.
  const url = `/uploads/avatars/${filename}`;
  doctors[idx].image = url;
  doctors[idx].avatar = url;
  doctors[idx].updatedAt = new Date().toISOString();
  writeStore('doctors.json', doctors);
  return stripSensitive(doctors[idx]);
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
      const appt = n.appointmentId
        ? readStore('appointments.json').find(a => a.id === n.appointmentId)
        : null;
      return {
        ...n,
        patientName: u ? `${u.firstName} ${u.lastName}`.trim() : null,
        sessionLabel: appt ? `${appt.date} · ${appt.time}` : null,
      };
    });
};

const createNote = (doctorId, { patientId, appointmentId, title, content, tags, shared }) => {
  const notes = readStore('notes.json');
  const now = new Date().toISOString();
  const note = {
    id: uuidv4(),
    doctorId,
    patientId: patientId || null,
    // Anchors the note to one session, so "conduct session → record notes"
    // actually joins up instead of leaving a loose note on the patient.
    appointmentId: appointmentId || null,
    title: title || 'Untitled note',
    content: content || '',
    tags: tags || [],
    shared: !!shared,
    aiSummary: null,
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

  const allowed = ['title', 'content', 'tags', 'patientId', 'appointmentId', 'shared', 'aiSummary'];
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

  // Every patient related to this doctor is listed, not only the ones who have
  // already written. Without this a doctor literally cannot open a conversation
  // first — the list would be empty until the patient breaks the ice.
  const related = getRelatedUserIds(doctor);

  const convs = [];
  related.forEach(userId => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    const msgs = (store[userId] && store[userId][doctor.counselorId]) || [];
    const last = msgs[msgs.length - 1] || null;
    convs.push({
      id: userId,
      patient: userSummary(u),
      hasThread: msgs.length > 0,
      lastMsg: last ? last.text : '',
      time: last ? last.time : '',
      lastAt: last ? last.createdAt : null,
      unread: msgs.filter(m => m.isMe && !m.readByDoctor).length,
    });
  });

  // Live threads first (most recent at the top), then everyone else by name.
  return convs.sort((a, b) => {
    if (a.hasThread !== b.hasThread) return a.hasThread ? -1 : 1;
    if (a.hasThread) return new Date(b.lastAt) - new Date(a.lastAt);
    return (a.patient.name || '').localeCompare(b.patient.name || '');
  });
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

const sendDoctorMessage = (doctorId, userId, text, attachment = null) => {
  const doctor = getDoctor(doctorId);
  if (!getRelatedUserIds(doctor).has(userId)) {
    throw Object.assign(new Error('Patient not found'), { statusCode: 404 });
  }
  const store = readStoreObj('messages.json');
  if (!store[userId]) store[userId] = {};
  if (!store[userId][doctor.counselorId]) store[userId][doctor.counselorId] = [];

  const msg = {
    id: uuidv4(),
    text,
    attachment,
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
    revenue.push({
      month: MONTH_NAMES[d.getMonth()],
      // The year matters. The Reports page used to derive the session count on
      // the client by matching getMonth() alone, so last year's March was
      // counted into this year's March bar.
      key,
      revenue: monthAppts.reduce((s, a) => s + (a.price || 0), 0),
      sessions: monthAppts.length,
    });
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

  // Requests waiting on a decision — oldest first, they've waited longest.
  const pending = appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
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
    } else if (a.status === 'rejected') {
      activity.push({ icon: '🚫', text: `You declined a request from ${name}`, at: a.updatedAt || a.createdAt });
    } else if (a.status === 'pending') {
      activity.push({ icon: '🔔', text: `${name} requested a session — awaiting your response`, at: a.createdAt });
    } else {
      activity.push({ icon: '📅', text: `Session confirmed with ${name}`, at: a.acceptedAt || a.createdAt });
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
    // This used to report `upcoming.length` — it counted confirmed sessions
    // and called them pending requests.
    pendingRequests: pending.length,
    pendingList: pending.slice(0, 5),
    rejectedSessions: appointments.filter(a => a.status === 'rejected').length,
    completedSessions: appointments.filter(a => a.status === 'completed').length,
    cancelledSessions: appointments.filter(a => a.status === 'cancelled').length,
    unreadMessages,
    recentActivity,
    ...analytics,
  };
};


/**
 * Live counts for the sidebar badges.
 *
 * One cheap call instead of the sidebar hitting four endpoints. These were
 * previously hardcoded strings in the component — '3', '5', '3' — so they
 * showed the same numbers forever regardless of what was actually waiting.
 *
 * Each count means something slightly different, deliberately:
 *   requests      — a to-do. Clears when you accept or decline, not on view.
 *   messages      — unread from patients. Clears when you open the thread.
 *   notifications — unseen. Clears when you open the Notifications page.
 */
const getBadgeCounts = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const store = readStoreObj('messages.json');

  const requests = readStore('appointments.json')
    .filter(a => a.counselorId === doctor.counselorId && a.status === 'pending').length;

  const messages = Object.values(store).reduce((sum, threads) => {
    const msgs = threads[doctor.counselorId] || [];
    // isMe is from the patient's perspective, so these are theirs
    return sum + msgs.filter(m => m.isMe && !m.readByDoctor).length;
  }, 0);

  const notifications = getNotifications(doctorId).filter(n => !n.read).length;

  return { requests, messages, notifications };
};

// ── Notifications ───────────────────────────────────────────────
const getNotifications = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const users = readStore('users.json');
  const appointments = readStore('appointments.json').filter(a => a.counselorId === doctor.counselorId);
  const feedback = readStore('feedback.json').filter(f => f.counselorId === doctor.counselorId);
  const store = readStoreObj('messages.json');

  const items = [];

  // Platform announcements sent by an admin
  require('./admin.service').getBroadcastsFor('doctor').forEach(b => {
    items.push({
      id: `broadcast-${b.id}`,
      type: b.type === 'warning' ? 'alert' : 'announcement',
      title: b.title,
      text: b.message,
      at: b.createdAt,
      read: false,
    });
  });

  appointments.forEach(a => {
    const u = users.find(x => x.id === a.userId);
    const name = u ? `${u.firstName} ${u.lastName}`.trim() : 'A patient';

    // Distinct types so the filter chips can actually isolate each kind —
    // everything used to be lumped under 'appointment'.
    const byStatus = {
      pending:   { type: 'request',      title: 'New session request' },
      confirmed: { type: 'appointment',  title: 'Session confirmed' },
      rejected:  { type: 'cancellation', title: 'Request declined' },
      cancelled: { type: 'cancellation', title: 'Appointment cancelled' },
      completed: { type: 'appointment',  title: 'Session completed' },
    };
    const meta = byStatus[a.status] || byStatus.confirmed;

    items.push({
      id: `appt-${a.id}-${a.status}`,
      type: meta.type,
      title: meta.title,
      text: `${name} — ${a.date} at ${a.time} (${a.mode === 'offline' ? 'in person' : a.sessionType})`,
      at: a.updatedAt || a.createdAt,
      // A request sitting unanswered is the one thing that needs action
      actionable: a.status === 'pending',
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

  // Notifications are derived on the fly from bookings/messages/reviews, so the
  // only thing worth persisting is which ones the doctor has already seen.
  const readIds = new Set(readStoreObj('notification-reads.json')[doctorId] || []);
  const dayMs = 24 * 60 * 60 * 1000;

  return items
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 30)
    .map(n => ({
      ...n,
      read: n.read || readIds.has(n.id),
      // Real timestamp comparison — the old UI guessed "today" by looking for
      // the word "day" in the humanised string.
      isToday: Date.now() - new Date(n.at).getTime() < dayMs,
      time: timeAgo(n.at),
    }));
};

/** Marks specific notifications (or all of them) as read for this doctor. */
const markNotificationsRead = (doctorId, ids) => {
  const store = readStoreObj('notification-reads.json');
  const current = new Set(store[doctorId] || []);
  const target = Array.isArray(ids) && ids.length
    ? ids
    : getNotifications(doctorId).map(n => n.id);
  target.forEach(id => current.add(id));
  store[doctorId] = [...current];
  writeStoreObj('notification-reads.json', store);
  return { read: target.length };
};

/** Unread count for the top-nav bell. */
const getUnreadNotificationCount = (doctorId) =>
  getNotifications(doctorId).filter(n => !n.read).length;

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
  const thisMonth = feedback.filter(f => {
    const d = new Date(f.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return { feedback, avg, total: feedback.length, distribution, thisMonth };
};

/** Stores the doctor's public reply to one of their own reviews. */
const replyToFeedback = (doctorId, feedbackId, reply) => {
  const doctor = getDoctor(doctorId);
  const all = readStore('feedback.json');
  const idx = all.findIndex(f => f.id === feedbackId && f.counselorId === doctor.counselorId);
  if (idx === -1) throw Object.assign(new Error('Review not found'), { statusCode: 404 });

  const text = String(reply || '').trim();
  if (!text) throw Object.assign(new Error('Reply cannot be empty'), { statusCode: 400 });

  all[idx].reply = text;
  all[idx].replyBy = doctor.name;
  all[idx].repliedAt = new Date().toISOString();
  writeStore('feedback.json', all);
  return all[idx];
};

// ── Documents ───────────────────────────────────────────────────
const getDocuments = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const users = readStore('users.json');
  return readStore('documents.json')
    .filter(d => d.counselorId === doctor.counselorId)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .map(d => {
      const u = users.find(x => x.id === d.patientId);
      return { ...d, patientName: u ? `${u.firstName} ${u.lastName}`.trim() : null };
    });
};

const humanSize = (bytes) => {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createDocument = (doctorId, { name, type, size, patientId, storedName, mimeType, bytes, sharedWithPatient, note }) => {
  const doctor = getDoctor(doctorId);
  const docs = readStore('documents.json');
  const ext = String(name || '').split('.').pop().toLowerCase();
  const docItem = {
    id: uuidv4(),
    counselorId: doctor.counselorId,
    name: name || 'Untitled document',
    type: type || 'file',
    ext: ext && ext.length <= 5 ? ext : 'file',
    size: size || humanSize(bytes),
    bytes: bytes ?? null,
    mimeType: mimeType || null,
    // Present only for real uploads; metadata-only rows keep this null.
    storedName: storedName || null,
    patientId: patientId || null,
    // A document is only visible to the client when the counselor says so.
    // Clinical files in the same library must never leak by default.
    sharedWithPatient: !!sharedWithPatient && !!patientId,
    sharedAt: sharedWithPatient && patientId ? new Date().toISOString() : null,
    // A line of context — "read this before Thursday" beats a bare filename.
    note: String(note || '').trim().slice(0, 300),
    uploadedAt: new Date().toISOString(),
  };
  docs.push(docItem);
  writeStore('documents.json', docs);
  return docItem;
};

/** Looks up a document the doctor owns, for download/preview. */
const getDocument = (doctorId, id) => {
  const doctor = getDoctor(doctorId);
  const found = readStore('documents.json')
    .find(d => d.id === id && d.counselorId === doctor.counselorId);
  if (!found) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  return found;
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


/**
 * Shares (or unshares) a document with the client it belongs to.
 *
 * Sharing requires a patient — a general file has nobody to share it with.
 */
const setDocumentShared = (doctorId, id, shared) => {
  const doctor = getDoctor(doctorId);
  const docs = readStore('documents.json');
  const idx = docs.findIndex(d => d.id === id && d.counselorId === doctor.counselorId);
  if (idx === -1) throw Object.assign(new Error('Document not found'), { statusCode: 404 });

  if (shared && !docs[idx].patientId) {
    throw Object.assign(new Error('Assign this file to a patient before sharing it'), { statusCode: 400 });
  }

  docs[idx].sharedWithPatient = !!shared;
  docs[idx].sharedAt = shared ? new Date().toISOString() : null;
  writeStore('documents.json', docs);
  return docs[idx];
};

/** Everything this counselor has filed against one patient. */
const getPatientDocuments = (doctorId, patientId) => {
  const doctor = getDoctor(doctorId);
  if (!getRelatedUserIds(doctor).has(patientId)) {
    throw Object.assign(new Error('Patient not found'), { statusCode: 404 });
  }
  return readStore('documents.json')
    .filter(d => d.counselorId === doctor.counselorId && d.patientId === patientId)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
};

// ── Security: real login history ────────────────────────────────
const getLogins = (doctorId) => {
  const { getLoginHistory } = require('./auth.service');
  return getLoginHistory(doctorId);
};

// ── Patient journals ────────────────────────────────────────────
// A counselor may only read journals belonging to their own patients, and
// never entries the patient marked private.

const assertOwnsPatient = (doctorId, patientId) => {
  const doctor = getDoctor(doctorId);
  if (!getRelatedUserIds(doctor).has(patientId)) {
    throw Object.assign(new Error('Patient not found'), { statusCode: 404 });
  }
  return doctor;
};

const getPatientJournal = (doctorId, patientId) => {
  assertOwnsPatient(doctorId, patientId);
  const journalService = require('./journal.service');
  const user = readStore('users.json').find(u => u.id === patientId);
  return {
    patient: user ? userSummary(user) : null,
    ...journalService.getSharedSummary(patientId),
  };
};

/** Lightweight counts for every patient — powers the journals list view. */
const getJournalOverview = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const related = getRelatedUserIds(doctor);
  const journal = readStore('journal.json');

  return readStore('users.json')
    .filter(u => related.has(u.id))
    .map(u => {
      const mine = journal.filter(e => e.userId === u.id);
      const shared = mine.filter(e => !e.isPrivate);
      const latest = shared.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return {
        ...userSummary(u),
        sharedCount: shared.length,
        privateCount: mine.length - shared.length,
        lastEntryAt: latest ? latest.createdAt : null,
        lastEntryTitle: latest ? latest.title : null,
      };
    })
    .sort((a, b) => new Date(b.lastEntryAt || 0) - new Date(a.lastEntryAt || 0));
};

// ── Settings ────────────────────────────────────────────────────
// Stored on the doctor record so preferences survive a restart.

const DEFAULT_DOCTOR_SETTINGS = {
  emailNotifs: true, pushNotifs: true, smsNotifs: false,
  sessionReminders: true, aiAlerts: true, paymentAlerts: false,
  appointmentAlerts: true, messageAlerts: true,
  twoFactor: false, sessionTimeout: true, dataSharing: false, anonymousData: true,
  darkMode: false, compactView: false, animations: true,
  largeText: false, highContrast: false, screenReader: false,
  autoLogout: true, loginHistory: true,
  language: 'English', timezone: 'Asia/Kolkata',
};

const getSettings = (doctorId) => {
  const doc = getDoctor(doctorId);
  return { ...DEFAULT_DOCTOR_SETTINGS, ...(doc.settings || {}) };
};

const updateSettings = (doctorId, updates) => {
  const doctors = readStore('doctors.json');
  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx === -1) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

  // Only accept keys we actually know about
  const current = { ...DEFAULT_DOCTOR_SETTINGS, ...(doctors[idx].settings || {}) };
  Object.keys(updates || {}).forEach(k => {
    if (k in DEFAULT_DOCTOR_SETTINGS) current[k] = updates[k];
  });

  doctors[idx].settings = current;
  doctors[idx].updatedAt = new Date().toISOString();
  writeStore('doctors.json', doctors);
  return current;
};

// ── Doctor-initiated booking ────────────────────────────────────
/**
 * Books a session on behalf of an existing patient.
 *
 * Deliberately narrower than the patient-facing booking flow: a doctor may
 * only book for someone already related to them, and the appointment is
 * created already-confirmed since the clinician is the one scheduling it.
 */
const createAppointment = (doctorId, { patientId, date, time, sessionType, price, reason }) => {
  const doctor = getDoctor(doctorId);
  if (!getRelatedUserIds(doctor).has(patientId)) {
    throw Object.assign(new Error('You can only schedule for your own patients'), { statusCode: 403 });
  }
  const user = readStore('users.json').find(u => u.id === patientId);
  if (!user) throw Object.assign(new Error('Patient not found'), { statusCode: 404 });

  if (!date || !time) {
    throw Object.assign(new Error('Date and time are required'), { statusCode: 400 });
  }
  const dateTime = new Date(`${date} ${time}`);
  if (isNaN(dateTime.getTime())) {
    throw Object.assign(new Error('That date and time could not be understood'), { statusCode: 400 });
  }

  const appointments = readStore('appointments.json');

  // Refuse to double-book the same slot for this clinician.
  const clash = appointments.find(a =>
    a.counselorId === doctor.counselorId &&
    a.status !== 'cancelled' &&
    Math.abs(new Date(a.dateTime) - dateTime) < 30 * 60 * 1000);
  if (clash) {
    throw Object.assign(new Error('You already have a session within 30 minutes of that time'), { statusCode: 409 });
  }

  const now = new Date().toISOString();
  const appt = {
    id: uuidv4(),
    userId: patientId,
    counselorId: doctor.counselorId,
    counselorName: doctor.name,
    counselorAvatar: doctor.image || '',
    sessionType: sessionType || 'video',
    date,
    time,
    dateTime: dateTime.toISOString(),
    price: price != null ? Number(price) : (doctor.price || 0),
    status: 'confirmed',
    reason: reason || '',
    bookedBy: 'doctor',
    createdAt: now,
    updatedAt: now,
  };
  appointments.push(appt);
  writeStore('appointments.json', appointments);
  return { ...appt, patient: userSummary(user) };
};

/** Everything the session-summary PDF needs for one appointment. */
const getAppointmentSummary = (doctorId, appointmentId) => {
  const doctor = getDoctor(doctorId);
  const appointment = readStore('appointments.json')
    .find(a => a.id === appointmentId && a.counselorId === doctor.counselorId);
  if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  const user = readStore('users.json').find(u => u.id === appointment.userId);
  const notes = readStore('notes.json')
    .filter(n => n.doctorId === doctorId && n.patientId === appointment.userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Mood entries within a fortnight either side of the session date.
  const window = 14 * 24 * 60 * 60 * 1000;
  const at = new Date(appointment.dateTime).getTime();
  const moods = readStore('moods.json')
    .filter(m => m.userId === appointment.userId)
    .filter(m => Math.abs(new Date(m.createdAt).getTime() - at) <= window)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return {
    appointment,
    patient: {
      name: user ? `${user.firstName} ${user.lastName}`.trim() : 'Patient',
      email: user ? user.email : '',
      reason: user ? user.reason : '',
    },
    doctor: { name: doctor.name, title: doctor.specialty || 'Counselor' },
    notes,
    moods,
  };
};


/**
 * Sessions per day for the last `days` days.
 *
 * The reports page had monthly figures only, so a counselor couldn't see
 * their own week.
 */
const getDailyBreakdown = (doctorId, days = 14) => {
  const doctor = getDoctor(doctorId);
  const appointments = readStore('appointments.json')
    .filter(a => a.counselorId === doctor.counselorId && a.dateTime);

  const key = (d) => {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
  };

  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const k = key(day);
    const onDay = appointments.filter(a => key(new Date(a.dateTime)) === k);
    const billable = onDay.filter(a => !['cancelled', 'rejected'].includes(a.status));
    out.push({
      date: k,
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: day.getDate(),
      total: onDay.length,
      completed: onDay.filter(a => a.status === 'completed').length,
      cancelled: onDay.filter(a => ['cancelled', 'rejected'].includes(a.status)).length,
      pending: onDay.filter(a => a.status === 'pending').length,
      revenue: billable.reduce((s, a) => s + (Number(a.price) || 0), 0),
    });
  }
  return out;
};

// ── Reports ─────────────────────────────────────────────────────
/** Aggregates everything the Reports page and its exports render. */
const getReportData = (doctorId) => {
  const doctor = getDoctor(doctorId);
  const analytics = getAnalytics(doctorId);
  const feedback = getFeedback(doctorId);
  const appointments = getAppointments(doctorId);
  const patients = getPatients(doctorId).map(p => ({
    name: p.name,
    email: p.email,
    reason: p.reason,
    sessions: p.appointmentCount,
    completed: p.completedSessions,
    avgMood: p.avgMood,
    moodCount: p.moodCount,
  }));

  return {
    doctor: { name: doctor.name, title: doctor.specialty || 'Counselor' },
    totals: analytics.totals || {},
    revenue: analytics.revenue || [],
    moodTrend: analytics.moodTrend || [],
    patientGrowth: analytics.patientGrowth || [],
    daily: getDailyBreakdown(doctorId, 14),
    feedback: { avg: feedback.avg, total: feedback.total, distribution: feedback.distribution },
    patients,
    appointments,
  };
};

// ── Counseling notes: export + AI summary ───────────────────────
const getNoteForExport = (doctorId, noteId) => {
  const doctor = getDoctor(doctorId);
  const note = readStore('notes.json').find(n => n.id === noteId && n.doctorId === doctorId);
  if (!note) throw Object.assign(new Error('Note not found'), { statusCode: 404 });
  const u = readStore('users.json').find(x => x.id === note.patientId);
  return {
    note,
    doctor: { name: doctor.name, title: doctor.specialty || 'Counselor' },
    patient: u ? `${u.firstName} ${u.lastName}`.trim() : null,
  };
};

const STOP_WORDS = new Set(('the a an and or but if then of to in on at for with about as is was were be been being ' +
  'it its this that these those i he she they we you his her their our your my me him them us has have had do does ' +
  'did will would can could should may might not no so very just also than there here when what which who how').split(' '));

/**
 * Builds an extractive summary of a note.
 *
 * This is deliberately a local heuristic rather than an LLM call: it keeps the
 * project self-contained and offline, and the output is honest about being a
 * mechanical extract rather than pretending to be clinical reasoning.
 */
const summariseNote = (doctorId, noteId) => {
  const notes = readStore('notes.json');
  const idx = notes.findIndex(n => n.id === noteId && n.doctorId === doctorId);
  if (idx === -1) throw Object.assign(new Error('Note not found'), { statusCode: 404 });

  const content = String(notes[idx].content || '').trim();
  if (content.length < 40) {
    throw Object.assign(new Error('This note is too short to summarise'), { statusCode: 400 });
  }

  const sentences = content.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(x => x.length > 15);

  // Score each sentence by how many of the note's frequent words it carries.
  const freq = {};
  content.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    .forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const scored = sentences.map((sent, i) => {
    const words = sent.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
    const score = words.reduce((sum, w) => sum + (freq[w] || 0), 0) / Math.max(1, words.length);
    // A small lead bias — openers usually carry the presenting issue.
    return { sent, i, score: score * (i === 0 ? 1.25 : 1) };
  });

  const keep = Math.min(3, Math.max(1, Math.round(sentences.length / 3)));
  const chosen = scored.sort((a, b) => b.score - a.score).slice(0, keep)
    .sort((a, b) => a.i - b.i).map(x => x.sent);

  const themes = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
  const words = content.split(/\s+/).length;

  const summary = `${chosen.join(' ')}\n\nKey themes: ${themes.join(', ') || 'none detected'}. ` +
    `${words} words across ${sentences.length} sentence${sentences.length === 1 ? '' : 's'}.`;

  notes[idx].aiSummary = summary;
  notes[idx].updatedAt = new Date().toISOString();
  writeStore('notes.json', notes);
  return notes[idx];
};


/**
 * Drafts a structured session note from a patient's real record.
 *
 * Follows the SOAP shape clinicians already use (Subjective / Objective /
 * Assessment / Plan) and fills each section from stored data. It is a
 * scaffold to edit, not a finished note — the wording says so, because a
 * generated note presented as clinical fact would be worse than no note.
 */
const draftNote = (doctorId, patientId) => {
  const doctor = getDoctor(doctorId);
  if (!getRelatedUserIds(doctor).has(patientId)) {
    throw Object.assign(new Error('That patient is not on your caseload'), { statusCode: 403 });
  }
  const patient = getPatients(doctorId).find(p => p.id === patientId);
  if (!patient) throw Object.assign(new Error('Patient not found'), { statusCode: 404 });

  const moods = readStore('moods.json')
    .filter(m => m.userId === patientId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const appts = readStore('appointments.json')
    .filter(a => a.userId === patientId && a.counselorId === doctor.counselorId);
  const prior = readStore('notes.json')
    .filter(n => n.doctorId === doctorId && n.patientId === patientId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const journals = readStore('journal.json')
    .filter(j => j.userId === patientId && j.shared);

  const done = appts.filter(a => a.status === 'completed').length;
  const recent = moods.slice(-5);
  const trend = (() => {
    if (moods.length < 2) return 'insufficient data to establish a trend';
    const first = moods[0].value, last = moods[moods.length - 1].value;
    if (last > first) return 'an upward trend since tracking began';
    if (last < first) return 'a downward trend since tracking began';
    return 'a broadly flat trend since tracking began';
  })();

  const lines = [];
  lines.push(`SUBJECTIVE`);
  lines.push(`${patient.name} attended for ${patient.reason || 'general wellbeing'}. ` +
    `This is session ${done + 1} of an ongoing course of work.` +
    (journals.length ? ` ${journals.length} shared journal ${journals.length === 1 ? 'entry is' : 'entries are'} available for review.` : ''));
  lines.push('');
  lines.push(`OBJECTIVE`);
  lines.push(moods.length
    ? `${moods.length} mood ${moods.length === 1 ? 'entry' : 'entries'} logged, averaging ${patient.avgMood}/10, showing ${trend}. ` +
      `Most recent: ${recent.map(m => `${m.label || m.value}`).join(', ')}.`
    : 'No self-reported mood data logged to date. Consider introducing daily tracking.');
  lines.push('');
  lines.push(`ASSESSMENT`);
  lines.push(patient.avgMood == null
    ? 'Baseline not yet established — assessment pending further data.'
    : patient.avgMood < 4
      ? 'Presentation suggests sustained low mood. Prioritise stabilisation and risk review before deeper processing work.'
      : patient.avgMood < 6
        ? 'Mixed presentation with room to build. Coping skills appear partially established.'
        : 'Presentation is broadly stable. Gains appear to be holding.');
  lines.push('');
  lines.push(`PLAN`);
  lines.push(patient.avgMood != null && patient.avgMood < 5
    ? '1. Continue behavioural activation and grounding practice.\n2. Review sleep and routine.\n3. Re-assess risk at next contact.'
    : '1. Continue cognitive restructuring around identified themes.\n2. Set one behavioural goal for the coming week.\n3. Begin relapse-prevention planning if gains hold.');
  lines.push('');
  if (prior.length) {
    lines.push(`Previous note: "${prior[0].title}" (${new Date(prior[0].updatedAt).toDateString()}).`);
    lines.push('');
  }
  lines.push('— Draft generated from stored records. Review and edit before saving to the clinical record.');

  return {
    title: `Session note — ${patient.name} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    content: lines.join('\n'),
    tags: ['Session', ...(patient.reason ? [String(patient.reason).split(/[\s&]+/)[0]] : [])],
    patientId,
  };
};


/**
 * Builds an AI summary for one *session*, not one note.
 *
 * This is the missing link in the stated workflow: conduct session → record
 * notes → generate session summary. It pulls together every note written
 * against that appointment, the client's mood either side of it, what they
 * asked to work on, and any files they attached, then derives explicit
 * follow-up actions the counselor can tick off.
 *
 * Extractive and rule-based rather than an LLM call — it stays offline, and
 * the output is labelled as generated so nobody mistakes it for clinical
 * judgement.
 */
const summariseSession = (doctorId, appointmentId) => {
  const doctor = getDoctor(doctorId);
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === appointmentId && a.counselorId === doctor.counselorId);
  if (idx === -1) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

  const appt = appointments[idx];
  const user = readStore('users.json').find(u => u.id === appt.userId);
  const patientName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'the client';

  const notes = readStore('notes.json')
    .filter(n => n.doctorId === doctorId)
    .filter(n => n.appointmentId === appointmentId
      || (!n.appointmentId && n.patientId === appt.userId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const at = new Date(appt.dateTime).getTime();
  const week = 7 * 24 * 60 * 60 * 1000;
  const moods = readStore('moods.json').filter(m => m.userId === appt.userId);
  const before = moods.filter(m => {
    const d = new Date(m.createdAt).getTime();
    return d < at && at - d <= week;
  });
  const after = moods.filter(m => {
    const d = new Date(m.createdAt).getTime();
    return d >= at && d - at <= week;
  });
  const avg = (arr) => arr.length
    ? Math.round((arr.reduce((s, m) => s + m.value, 0) / arr.length) * 20) / 10
    : null;
  const moodBefore = avg(before);
  const moodAfter = avg(after);

  /* ── key points: the most content-bearing sentences across the notes ── */
  const body = notes.map(n => n.content).join(' ').trim();
  const sentences = body.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(x => x.length > 20);

  const freq = {};
  body.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    .forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const keyPoints = sentences
    .map((sent, i) => {
      const words = sent.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
      const score = words.reduce((sum, w) => sum + (freq[w] || 0), 0) / Math.max(1, words.length);
      return { sent, i, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .sort((a, b) => a.i - b.i)
    .map(x => x.sent);

  const themes = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);

  /* ── follow-up actions, derived from what the record actually shows ── */
  const actions = [];
  if (!notes.length) {
    actions.push({ label: 'Write up this session while it is fresh', priority: 'high', reason: 'No notes recorded yet' });
  }
  if (moodAfter != null && moodAfter < 4) {
    actions.push({ label: 'Check in before the next scheduled session', priority: 'high', reason: `Mood averaging ${moodAfter}/10 since this session` });
  }
  if (moodBefore != null && moodAfter != null && moodAfter < moodBefore - 1) {
    actions.push({ label: 'Review whether the current approach is landing', priority: 'high', reason: `Mood fell from ${moodBefore} to ${moodAfter}` });
  }
  if (moodBefore != null && moodAfter != null && moodAfter > moodBefore + 1) {
    actions.push({ label: 'Reinforce what changed — name it explicitly with the client', priority: 'normal', reason: `Mood rose from ${moodBefore} to ${moodAfter}` });
  }
  if (!moods.length) {
    actions.push({ label: 'Encourage daily mood tracking', priority: 'normal', reason: 'No self-reported data to work from' });
  }
  const future = appointments.filter(a =>
    a.userId === appt.userId && a.counselorId === doctor.counselorId &&
    ['pending', 'confirmed'].includes(a.status) && new Date(a.dateTime) > new Date());
  if (!future.length) {
    actions.push({ label: 'Book the next session', priority: 'high', reason: 'Nothing scheduled after this one' });
  }
  if ((appt.documents || []).length) {
    actions.push({ label: `Review the ${appt.documents.length} file${appt.documents.length === 1 ? '' : 's'} the client attached`, priority: 'normal', reason: appt.documents.map(d => d.name).join(', ') });
  }
  if (appt.status !== 'completed' && new Date(appt.dateTime) < new Date()) {
    actions.push({ label: 'Mark this session complete', priority: 'normal', reason: 'The session time has passed' });
  }
  if (!actions.length) {
    actions.push({ label: 'Continue the current plan', priority: 'normal', reason: 'Nothing in the record needs attention' });
  }

  const moodLine = moodBefore != null && moodAfter != null
    ? `Mood moved from ${moodBefore}/10 in the week before to ${moodAfter}/10 in the week after.`
    : moodAfter != null ? `Mood since this session is averaging ${moodAfter}/10.`
    : moodBefore != null ? `Mood in the week before was ${moodBefore}/10; nothing logged since.`
    : 'No mood data was logged around this session.';

  const summary = [
    `${patientName} attended a ${appt.mode === 'offline' ? 'face-to-face' : appt.sessionType} session on ${appt.date} at ${appt.time}.`,
    appt.reason ? `They asked to focus on: ${appt.reason}.` : '',
    keyPoints.length ? `\n\nFrom the notes: ${keyPoints.join(' ')}` : '\n\nNo written notes to draw on yet.',
    `\n\n${moodLine}`,
    themes.length ? `\n\nRecurring themes: ${themes.join(', ')}.` : '',
    '\n\n— Generated from the session record. Review before treating as clinical fact.',
  ].filter(Boolean).join('');

  const result = {
    appointmentId,
    patientName,
    date: appt.date,
    time: appt.time,
    summary,
    keyPoints,
    themes,
    actions,
    moodBefore,
    moodAfter,
    noteCount: notes.length,
    generatedAt: new Date().toISOString(),
  };

  // Stored on the appointment so it survives a reload and shows in the PDF
  appointments[idx].aiSummary = result;
  appointments[idx].updatedAt = result.generatedAt;
  writeStore('appointments.json', appointments);
  return result;
};

/** Ticks a follow-up action off, so the list is a worklist not a suggestion. */
const toggleSessionAction = (doctorId, appointmentId, index) => {
  const doctor = getDoctor(doctorId);
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === appointmentId && a.counselorId === doctor.counselorId);
  if (idx === -1) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

  const sum = appointments[idx].aiSummary;
  if (!sum || !sum.actions?.[index]) {
    throw Object.assign(new Error('That action no longer exists'), { statusCode: 404 });
  }
  sum.actions[index].done = !sum.actions[index].done;
  appointments[idx].updatedAt = new Date().toISOString();
  writeStore('appointments.json', appointments);
  return sum;
};

// ── AI assistant ────────────────────────────────────────────────
/**
 * Answers a free-text clinician question from real records.
 *
 * Routes the question to an intent, then composes the answer from stored data.
 * Every number below is read from the JSON stores at request time — nothing is
 * canned, so the same question gives a different answer as the data changes.
 */
const askAssistant = (doctorId, question, patientId) => {
  const doctor = getDoctor(doctorId);
  const q = String(question || '').toLowerCase().trim();
  if (!q) throw Object.assign(new Error('Ask me something first'), { statusCode: 400 });

  const patients = getPatients(doctorId);
  const appointments = getAppointments(doctorId);
  const feedback = getFeedback(doctorId);
  const notes = readStore('notes.json').filter(n => n.doctorId === doctorId);

  // Resolve which patient is being asked about: explicit id, or a name in the text.
  let subject = patientId ? patients.find(p => p.id === patientId) : null;
  if (!subject) {
    subject = patients.find(p => {
      const first = String(p.name || '').split(' ')[0].toLowerCase();
      return first.length > 2 && q.includes(first);
    }) || null;
  }

  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const has = (...words) => words.some(w => q.includes(w));

  // ── risk / concern ──
  if (has('risk', 'worried', 'concern', 'urgent', 'alert', 'burnout', 'crisis')) {
    const atRisk = patients.filter(p => p.avgMood != null && p.avgMood < 4);
    const silent = patients.filter(p => p.moodCount === 0);
    if (!patients.length) return { answer: 'You have no patients on record yet, so there is nothing to flag.', intent: 'risk' };
    const lines = [];
    lines.push(atRisk.length
      ? `${atRisk.length} patient${atRisk.length === 1 ? '' : 's'} showing a low mood average: ${atRisk.map(p => `${p.name} (${p.avgMood}/10)`).join(', ')}.`
      : 'No patient is currently averaging below 4/10 on mood.');
    if (silent.length) {
      lines.push(`${silent.length} ${silent.length === 1 ? 'patient has' : 'patients have'} logged no mood data at all (${silent.map(p => p.name).join(', ')}) — engagement, rather than mood, is the gap there.`);
    }
    const stale = patients.filter(p => p.upcomingAppointment == null && p.completedSessions > 0);
    if (stale.length) lines.push(`${stale.length} ${stale.length === 1 ? 'patient has' : 'patients have'} no future session booked.`);
    return { answer: lines.join(' '), intent: 'risk' };
  }

  // ── session notes for someone ──
  if (has('note', 'summarise', 'summarize', 'write up')) {
    if (!subject) return { answer: 'Which patient should I write up? Name them and I will pull their record.', intent: 'notes' };
    const theirs = notes.filter(n => n.patientId === subject.id);
    const appts = appointments.filter(a => a.userId === subject.id);
    const done = appts.filter(a => a.status === 'completed').length;
    return {
      answer: `Draft for ${subject.name} — presenting concern: ${subject.reason || 'not recorded'}. ` +
        `${done} of ${appts.length} booked session${appts.length === 1 ? '' : 's'} completed. ` +
        `Mood: ${subject.avgMood != null ? `${subject.avgMood}/10 across ${subject.moodCount} entries` : 'no entries logged'}. ` +
        `${theirs.length} existing note${theirs.length === 1 ? '' : 's'} on file` +
        `${theirs.length ? `, most recent "${theirs[0].title}"` : ''}. ` +
        `${subject.avgMood != null && subject.avgMood < 5
          ? 'Suggested focus: stabilisation and coping skills before deeper work.'
          : 'Suggested focus: consolidate gains and set the next behavioural goal.'}`,
      intent: 'notes',
    };
  }

  // ── schedule ──
  if (has('schedule', 'today', 'tomorrow', 'upcoming', 'next session', 'appointment', 'calendar', 'booked')) {
    const now = new Date();
    const upcoming = appointments
      .filter(a => a.status !== 'cancelled' && new Date(a.dateTime) >= now)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    if (!upcoming.length) return { answer: 'Nothing is booked ahead of now. Your calendar is clear.', intent: 'schedule' };
    const todays = upcoming.filter(a => new Date(a.dateTime).toDateString() === now.toDateString());
    const head = todays.length
      ? `${todays.length} session${todays.length === 1 ? '' : 's'} today: ${todays.map(a => `${a.time} with ${a.patient?.name || 'a patient'}`).join(', ')}.`
      : 'Nothing left today.';
    const nxt = upcoming[0];
    return {
      answer: `${head} Next up overall: ${nxt.patient?.name || 'a patient'} on ${nxt.date} at ${nxt.time} (${nxt.sessionType}). ` +
        `${upcoming.length} session${upcoming.length === 1 ? '' : 's'} scheduled in total.`,
      intent: 'schedule',
    };
  }

  // ── mood / progress ──
  if (has('mood', 'progress', 'trend', 'improving', 'better', 'worse')) {
    if (subject) {
      const moods = readStore('moods.json').filter(m => m.userId === subject.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (!moods.length) return { answer: `${subject.name} has not logged any mood entries yet.`, intent: 'mood' };
      const first = moods[0].value, last = moods[moods.length - 1].value;
      const dir = last > first ? 'improving' : last < first ? 'declining' : 'flat';
      return {
        answer: `${subject.name} has logged ${moods.length} mood entr${moods.length === 1 ? 'y' : 'ies'}, averaging ${subject.avgMood}/10. ` +
          `The trend is ${dir} — first entry ${first}/5, latest ${last}/5. ` +
          `${dir === 'declining' ? 'Worth checking in sooner than planned.' : dir === 'improving' ? 'Reinforce whatever changed recently.' : 'Stable; consider a new goal to create movement.'}`,
        intent: 'mood',
      };
    }
    const withMood = patients.filter(p => p.avgMood != null);
    if (!withMood.length) return { answer: 'No patient has logged mood data yet.', intent: 'mood' };
    const avg = Math.round((withMood.reduce((s, p) => s + p.avgMood, 0) / withMood.length) * 10) / 10;
    const best = [...withMood].sort((a, b) => b.avgMood - a.avgMood)[0];
    const worst = [...withMood].sort((a, b) => a.avgMood - b.avgMood)[0];
    return {
      answer: `Across ${withMood.length} patient${withMood.length === 1 ? '' : 's'} with mood data the average is ${avg}/10. ` +
        `Highest: ${best.name} at ${best.avgMood}/10. Lowest: ${worst.name} at ${worst.avgMood}/10.`,
      intent: 'mood',
    };
  }

  // ── ratings / feedback ──
  if (has('rating', 'review', 'feedback', 'happy', 'satisfaction')) {
    if (!feedback.total) return { answer: 'No patient has left a review yet, so there is no rating to report.', intent: 'feedback' };
    const five = feedback.distribution.find(d => d.star === 5)?.count || 0;
    const unanswered = feedback.feedback.filter(f => !f.reply).length;
    return {
      answer: `You are averaging ${feedback.avg}/5 across ${feedback.total} review${feedback.total === 1 ? '' : 's'}, ` +
        `${pct(five, feedback.total)}% of them five stars. ` +
        `${unanswered ? `${unanswered} review${unanswered === 1 ? '' : 's'} still awaiting your reply.` : 'Every review has a reply.'}`,
      intent: 'feedback',
    };
  }

  // ── revenue ──
  if (has('revenue', 'earning', 'income', 'money', 'paid', 'payment')) {
    const analytics = getAnalytics(doctorId);
    const t = analytics.totals || {};
    const paid = appointments.filter(a => a.status !== 'cancelled');
    return {
      answer: `This month you have earned ${moneyShort(t.monthlyRevenue ?? 0)}. ` +
        `${paid.length} billable session${paid.length === 1 ? '' : 's'} on record across ${patients.length} patient${patients.length === 1 ? '' : 's'}.`,
      intent: 'revenue',
    };
  }

  // ── technique suggestions ──
  if (has('technique', 'suggest', 'recommend', 'next best', 'approach', 'intervention', 'what should')) {
    const focus = subject?.reason || 'general wellbeing';
    const low = subject?.avgMood != null && subject.avgMood < 5;
    const who = subject ? subject.name : 'your caseload';
    return {
      answer: `For ${who} (focus: ${focus})` +
        `${subject?.avgMood != null ? `, currently averaging ${subject.avgMood}/10` : ''}: ` +
        (low
          ? 'start with behavioural activation and grounding work to build a floor, then move to cognitive restructuring once mood is steadier. Keep sessions structured and homework light.'
          : 'cognitive restructuring plus mindfulness-based CBT are the natural next step, with relapse-prevention planning if the gains hold for another few sessions.'),
      intent: 'technique',
    };
  }

  // ── who / caseload overview ──
  if (has('how many', 'caseload', 'patients', 'clients', 'overview', 'summary')) {
    const done = appointments.filter(a => a.status === 'completed').length;
    return {
      answer: `You have ${patients.length} patient${patients.length === 1 ? '' : 's'} and ${appointments.length} session${appointments.length === 1 ? '' : 's'} on record ` +
        `(${done} completed). ${notes.length} clinical note${notes.length === 1 ? '' : 's'} written. ` +
        `${feedback.total ? `Average rating ${feedback.avg}/5 from ${feedback.total} review${feedback.total === 1 ? '' : 's'}.` : 'No reviews yet.'}`,
      intent: 'caseload',
    };
  }

  // ── named patient with no other intent ──
  if (subject) {
    return {
      answer: `${subject.name} — ${subject.reason || 'no focus area recorded'}. ` +
        `${subject.appointmentCount} session${subject.appointmentCount === 1 ? '' : 's'} booked, ${subject.completedSessions} completed. ` +
        `Mood ${subject.avgMood != null ? `${subject.avgMood}/10 over ${subject.moodCount} entries` : 'not yet logged'}. ` +
        `${subject.upcomingAppointment ? `Next session ${subject.upcomingAppointment.date} at ${subject.upcomingAppointment.time}.` : 'No upcoming session booked.'} ` +
        `Ask me about their mood trend, risk level, or what to try next.`,
      intent: 'patient',
    };
  }

  // ── fallback: say what can actually be answered ──
  return {
    answer: `I can answer that from your own records, but I need a bit more to go on. Try asking about ` +
      `a patient by name, your schedule, mood trends, risk flags, ratings, revenue, or which technique to use next. ` +
      `Right now you have ${patients.length} patient${patients.length === 1 ? '' : 's'} and ${appointments.length} session${appointments.length === 1 ? '' : 's'} I can draw on.`,
    intent: 'unknown',
  };
};

module.exports = {
  getProfile, updateProfile, setProfilePhoto, getLogins,
  getSettings, updateSettings,
  getPatientJournal, getJournalOverview, assertOwnsPatient,
  getPatients, getPatientDetail,
  getAppointments, updateAppointment, getPendingRequests,
  getAvailability, updateAvailability,
  getNotes, createNote, updateNote, deleteNote,
  getConversations, getDoctorMessages, sendDoctorMessage,
  getAnalytics, getDashboardStats,
  getNotifications, markNotificationsRead, getUnreadNotificationCount, getBadgeCounts,
  getFeedback, replyToFeedback,
  getDocuments, createDocument, deleteDocument, getDocument,
  setDocumentShared, getPatientDocuments,
  createAppointment, getAppointmentSummary, getReportData, askAssistant, draftNote,
  getDailyBreakdown,
  summariseNote, getNoteForExport, summariseSession, toggleSessionAction,
};
