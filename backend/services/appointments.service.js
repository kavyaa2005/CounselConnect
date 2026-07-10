const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');

const getAppointments = (userId) => {
  const appointments = readStore('appointments.json');
  return appointments
    .filter(a => a.userId === userId)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
};

const bookAppointment = (userId, { counselorId, counselorName, counselorAvatar, sessionType, date, time, price }) => {
  const appointments = readStore('appointments.json');

  // Build a dateTime string for sorting
  const dateTime = new Date(`${date} ${time}`).toISOString();

  const appt = {
    id: uuidv4(),
    userId,
    counselorId,
    counselorName,
    counselorAvatar: counselorAvatar || '',
    sessionType, // 'video' | 'chat'
    date,
    time,
    dateTime,
    price: price || 0,
    status: 'confirmed', // confirmed | cancelled | completed
    createdAt: new Date().toISOString(),
  };

  appointments.push(appt);
  writeStore('appointments.json', appointments);
  return appt;
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

  const allowed = ['status', 'date', 'time', 'sessionType'];
  allowed.forEach(k => { if (updates[k] !== undefined) appointments[idx][k] = updates[k]; });
  appointments[idx].updatedAt = new Date().toISOString();
  writeStore('appointments.json', appointments);
  return appointments[idx];
};

module.exports = { getAppointments, bookAppointment, getAppointment, updateAppointment };
