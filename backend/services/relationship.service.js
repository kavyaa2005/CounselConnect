// Single source of truth for "who is allowed to talk to whom".
//
// A user and a counselor are *related* once either of these is true:
//   1. the user has booked an appointment with that counselor, or
//   2. they already have a message thread together.
//
// Every video call, contact list, and chat permission check runs through here,
// so a user can only ever reach their own counselors and a counselor can only
// ever reach their own clients.

const { readStore, readStoreObj } = require('../utils/fileStore.utils');

/** counselorIds the given user is related to */
const counselorIdsForUser = (userId) => {
  const ids = new Set();

  readStore('appointments.json')
    .filter(a => a.userId === userId && a.counselorId)
    .forEach(a => ids.add(a.counselorId));

  const threads = readStoreObj('messages.json')[userId] || {};
  Object.entries(threads).forEach(([counselorId, msgs]) => {
    if (Array.isArray(msgs) && msgs.length) ids.add(counselorId);
  });

  return ids;
};

/** userIds the given counselor is related to */
const userIdsForCounselor = (counselorId) => {
  const ids = new Set();

  readStore('appointments.json')
    .filter(a => a.counselorId === counselorId && a.userId)
    .forEach(a => ids.add(a.userId));

  const store = readStoreObj('messages.json');
  Object.entries(store).forEach(([userId, threads]) => {
    const msgs = threads && threads[counselorId];
    if (Array.isArray(msgs) && msgs.length) ids.add(userId);
  });

  return ids;
};

const lastInteractionAt = (userId, counselorId) => {
  let latest = null;
  const bump = (iso) => {
    if (!iso) return;
    const d = new Date(iso);
    if (!isNaN(d) && (!latest || d > latest)) latest = d;
  };

  readStore('appointments.json')
    .filter(a => a.userId === userId && a.counselorId === counselorId)
    .forEach(a => bump(a.dateTime || a.updatedAt || a.createdAt));

  const msgs = (readStoreObj('messages.json')[userId] || {})[counselorId] || [];
  if (msgs.length) bump(msgs[msgs.length - 1].createdAt);

  return latest ? latest.toISOString() : null;
};

/** Short human summary of why these two are connected */
const relationshipSummary = (userId, counselorId) => {
  const appts = readStore('appointments.json')
    .filter(a => a.userId === userId && a.counselorId === counselorId);
  const msgs = (readStoreObj('messages.json')[userId] || {})[counselorId] || [];

  const completed = appts.filter(a => String(a.status).toLowerCase() === 'completed').length;
  const upcoming = appts.filter(a =>
    ['pending', 'confirmed', 'upcoming', 'rescheduled'].includes(String(a.status).toLowerCase())
  ).length;

  return {
    appointments: appts.length,
    completedSessions: completed,
    upcomingSessions: upcoming,
    messages: msgs.length,
    lastInteractionAt: lastInteractionAt(userId, counselorId),
  };
};

/**
 * The authoritative permission check used by the signaling server.
 * `a` and `b` are { role, id } where a doctor's id is their doctor id (d1),
 * not their counselorId (c1) — we resolve that here.
 */
const resolveCounselorId = (doctorId) => {
  const doc = readStore('doctors.json').find(d => d.id === doctorId);
  return doc ? doc.counselorId : null;
};

const canConnect = (a, b) => {
  // A call is always exactly one user and one counselor
  const user = a.role === 'user' ? a : b.role === 'user' ? b : null;
  const doctor = a.role === 'doctor' ? a : b.role === 'doctor' ? b : null;
  if (!user || !doctor) return false;

  const counselorId = resolveCounselorId(doctor.id);
  if (!counselorId) return false;

  return counselorIdsForUser(user.id).has(counselorId);
};

module.exports = {
  counselorIdsForUser,
  userIdsForCounselor,
  relationshipSummary,
  lastInteractionAt,
  resolveCounselorId,
  canConnect,
};
