// Private notes a client keeps about their own sessions.
//
// Deliberately separate from the counselor's clinical notes and from the
// journal: these belong to the client, are never shared with the counselor,
// and are anchored to a specific appointment or call.

const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');

const STORE = 'session-notes.json';

const list = (userId) => {
  const appointments = readStore('appointments.json');
  return readStore(STORE)
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(n => {
      const appt = appointments.find(a => a.id === n.appointmentId);
      return {
        ...n,
        counselorName: appt ? appt.counselorName : n.counselorName || 'Session',
        sessionDate: appt ? appt.date : null,
        sessionTime: appt ? appt.time : null,
      };
    });
};

const forAppointment = (userId, appointmentId) =>
  list(userId).filter(n => n.appointmentId === appointmentId);

const create = (userId, { appointmentId, counselorName, title, content }) => {
  const text = String(content || '').trim();
  if (!text) throw Object.assign(new Error('Write something first'), { statusCode: 400 });

  // A note may be anchored to a booking, but an ad-hoc note is fine too.
  if (appointmentId) {
    const owns = readStore('appointments.json')
      .some(a => a.id === appointmentId && a.userId === userId);
    if (!owns) throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  const now = new Date().toISOString();
  const note = {
    id: uuidv4(),
    userId,
    appointmentId: appointmentId || null,
    counselorName: counselorName || '',
    title: String(title || '').trim() || `Session note — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    content: text,
    createdAt: now,
    updatedAt: now,
  };
  const all = readStore(STORE);
  all.push(note);
  writeStore(STORE, all);
  return note;
};

const update = (userId, id, updates) => {
  const all = readStore(STORE);
  const idx = all.findIndex(n => n.id === id && n.userId === userId);
  if (idx === -1) throw Object.assign(new Error('Note not found'), { statusCode: 404 });

  ['title', 'content'].forEach(k => {
    if (updates[k] !== undefined) all[idx][k] = String(updates[k]).trim();
  });
  if (!all[idx].content) {
    throw Object.assign(new Error('A note cannot be empty'), { statusCode: 400 });
  }
  all[idx].updatedAt = new Date().toISOString();
  writeStore(STORE, all);
  return all[idx];
};

const remove = (userId, id) => {
  const all = readStore(STORE);
  const next = all.filter(n => !(n.id === id && n.userId === userId));
  if (next.length === all.length) {
    throw Object.assign(new Error('Note not found'), { statusCode: 404 });
  }
  writeStore(STORE, next);
};

module.exports = { list, forAppointment, create, update, remove };
