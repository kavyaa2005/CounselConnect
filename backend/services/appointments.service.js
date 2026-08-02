const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');

const getAppointments = (userId) => {
  const appointments = readStore('appointments.json');
  return appointments
    .filter(a => a.userId === userId)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
};

/** Rejects a slot that is gone, unparseable, or already taken by that counselor. */
const assertSlotIsFree = (counselorId, dateTime, ignoreId = null) => {
  const when = new Date(dateTime);
  if (isNaN(when.getTime())) {
    throw Object.assign(new Error('That date and time could not be understood'), { statusCode: 400 });
  }
  if (when.getTime() < Date.now()) {
    throw Object.assign(new Error('That time has already passed'), { statusCode: 400 });
  }
  // A pending request still holds its slot — otherwise two clients could
  // request the same time and only find out after the counselor accepts.
  const clash = readStore('appointments.json').find(a =>
    a.id !== ignoreId &&
    a.counselorId === counselorId &&
    !['cancelled', 'rejected'].includes(a.status) &&
    Math.abs(new Date(a.dateTime) - when) < 30 * 60 * 1000);
  if (clash) {
    throw Object.assign(new Error('That slot has just been taken — please pick another'), { statusCode: 409 });
  }
  return when;
};

const bookAppointment = (userId, {
  counselorId, counselorName, counselorAvatar, sessionType,
  date, time, price, mode, reason, documents,
}) => {
  const appointments = readStore('appointments.json');

  const when = assertSlotIsFree(counselorId, `${date} ${time}`);

  const appt = {
    id: uuidv4(),
    userId,
    counselorId,
    counselorName,
    counselorAvatar: counselorAvatar || '',
    sessionType, // 'video' | 'chat'
    // How the session happens: online (video/chat) or face to face.
    // An in-person booking deliberately has no join link.
    mode: mode === 'offline' || mode === 'in-person' ? 'offline' : 'online',
    date,
    time,
    dateTime: when.toISOString(),
    price: price || 0,
    // What the client wants to work on — carried through to the doctor's
    // session view and the summary PDF.
    reason: String(reason || '').trim(),
    // Files the client attached when booking (intake forms, prior reports)
    documents: Array.isArray(documents) ? documents : [],
    // A client booking is a *request*. The counselor accepts or rejects it —
    // this is the step the whole doctor-side Accept/Reject UI was built for
    // but which nothing was ever creating.
    status: 'pending', // pending | confirmed | rejected | cancelled | completed
    // Nothing is charged until the counselor accepts.
    paymentStatus: 'unpaid', // unpaid | paid | refunded
    createdAt: new Date().toISOString(),
  };

  appointments.push(appt);
  writeStore('appointments.json', appointments);
  return appt;
};

/**
 * Moves an existing booking to a new slot.
 *
 * Separate from updateAppointment because rescheduling has rules that a plain
 * field edit doesn't: the new slot must be free and in the future, and a
 * cancelled or completed session can't be moved.
 */
const rescheduleAppointment = (userId, id, { date, time, sessionType, mode, reason }) => {
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === id && a.userId === userId);
  if (idx === -1) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  const appt = appointments[idx];
  if (appt.status === 'cancelled' || appt.status === 'rejected') {
    throw Object.assign(new Error(`This request was ${appt.status} — book a new one instead`), { statusCode: 400 });
  }
  if (appt.status === 'completed') {
    throw Object.assign(new Error('This session has already taken place'), { statusCode: 400 });
  }
  if (!date || !time) {
    throw Object.assign(new Error('Pick a new date and time'), { statusCode: 400 });
  }

  const when = assertSlotIsFree(appt.counselorId, `${date} ${time}`, id);

  appt.previousDateTime = appt.dateTime;
  appt.date = date;
  appt.time = time;
  appt.dateTime = when.toISOString();
  if (sessionType) appt.sessionType = sessionType;
  if (mode) appt.mode = mode === 'offline' || mode === 'in-person' ? 'offline' : 'online';
  if (reason !== undefined) appt.reason = String(reason).trim();
  appt.rescheduledAt = new Date().toISOString();
  appt.rescheduleCount = (appt.rescheduleCount || 0) + 1;
  // Moving an already-accepted session needs the counselor to agree again.
  if (appt.status === 'confirmed') appt.status = 'pending';
  appt.updatedAt = appt.rescheduledAt;

  appointments[idx] = appt;
  writeStore('appointments.json', appointments);
  return appt;
};

/** Attaches an uploaded file to a booking the user owns. */
const attachDocument = (userId, id, doc) => {
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === id && a.userId === userId);
  if (idx === -1) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  const entry = {
    id: uuidv4(),
    name: doc.originalname,
    storedName: doc.filename,
    mimeType: doc.mimetype,
    size: doc.size,
    uploadedAt: new Date().toISOString(),
  };
  appointments[idx].documents = [...(appointments[idx].documents || []), entry];
  appointments[idx].updatedAt = entry.uploadedAt;
  writeStore('appointments.json', appointments);
  return entry;
};

const removeDocument = (userId, id, docId) => {
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === id && a.userId === userId);
  if (idx === -1) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  const before = (appointments[idx].documents || []).length;
  appointments[idx].documents = (appointments[idx].documents || []).filter(d => d.id !== docId);
  if (appointments[idx].documents.length === before) {
    throw Object.assign(new Error('Attachment not found'), { statusCode: 404 });
  }
  writeStore('appointments.json', appointments);
};

/** One attachment, if this user owns the booking it belongs to. */
const getDocument = (userId, id, docId) => {
  const appt = readStore('appointments.json').find(a => a.id === id && a.userId === userId);
  if (!appt) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  const doc = (appt.documents || []).find(d => d.id === docId);
  if (!doc) throw Object.assign(new Error('Attachment not found'), { statusCode: 404 });
  return doc;
};

/** Everything the appointment-details PDF needs. */
const getAppointmentDetails = (userId, id) => {
  const appt = getAppointment(userId, id);
  const user = readStore('users.json').find(u => u.id === userId);
  const doctor = readStore('doctors.json').find(d => d.counselorId === appt.counselorId);
  const payment = readStore('payments.json')
    .find(p => p.appointmentId === appt.id && p.status !== 'refunded');

  return {
    appointment: appt,
    client: {
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Client',
      email: user ? user.email : '',
      phone: user ? user.phone : '',
    },
    counselor: {
      name: appt.counselorName || (doctor ? doctor.name : 'Counselor'),
      specialty: doctor ? doctor.specialty : '',
      location: doctor ? doctor.location : '',
      email: doctor ? doctor.email : '',
    },
    payment: payment || null,
  };
};

const getAppointment = (userId, id) => {
  const appointments = readStore('appointments.json');
  const appt = appointments.find(a => a.id === id && a.userId === userId);
  if (!appt) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  return appt;
};

const updateAppointment = (userId, id, updates) => {
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === id && a.userId === userId);
  if (idx === -1) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

  const wasPaid = appointments[idx].paymentStatus === 'paid';

  const allowed = ['status', 'date', 'time', 'sessionType', 'mode', 'reason'];
  allowed.forEach(k => { if (updates[k] !== undefined) appointments[idx][k] = updates[k]; });
  appointments[idx].updatedAt = new Date().toISOString();
  writeStore('appointments.json', appointments);

  // Cancelling a session the user already paid for issues a refund
  if (wasPaid && String(updates.status).toLowerCase() === 'cancelled') {
    require('./billing.service').refundForAppointment(userId, id, 'Session cancelled by client');
    return readStore('appointments.json').find(a => a.id === id);
  }

  return appointments[idx];
};

module.exports = {
  getAppointments, bookAppointment, getAppointment, updateAppointment,
  rescheduleAppointment, attachDocument, removeDocument, getDocument,
  getAppointmentDetails, assertSlotIsFree,
};
