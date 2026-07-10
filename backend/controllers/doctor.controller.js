const doctorService = require('../services/doctor.service');
const { success } = require('../utils/response.utils');

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); } catch (err) { next(err); }
};

const getProfile = wrap((req, res) => success(res, { profile: doctorService.getProfile(req.user.id) }));
const updateProfile = wrap((req, res) => success(res, { profile: doctorService.updateProfile(req.user.id, req.body) }, 'Profile updated'));

const getPatients = wrap((req, res) => success(res, { patients: doctorService.getPatients(req.user.id) }));
const getPatientDetail = wrap((req, res) => success(res, { patient: doctorService.getPatientDetail(req.user.id, req.params.id) }));

const getAppointments = wrap((req, res) => success(res, { appointments: doctorService.getAppointments(req.user.id) }));
const updateAppointment = wrap((req, res) => success(res, { appointment: doctorService.updateAppointment(req.user.id, req.params.id, req.body) }, 'Appointment updated'));

const getAvailability = wrap((req, res) => success(res, { availability: doctorService.getAvailability(req.user.id) }));
const updateAvailability = wrap((req, res) => success(res, { availability: doctorService.updateAvailability(req.user.id, req.body) }, 'Availability updated'));

const getNotes = wrap((req, res) => success(res, { notes: doctorService.getNotes(req.user.id) }));
const createNote = wrap((req, res) => success(res, { note: doctorService.createNote(req.user.id, req.body) }, 'Note created', 201));
const updateNote = wrap((req, res) => success(res, { note: doctorService.updateNote(req.user.id, req.params.id, req.body) }, 'Note updated'));
const deleteNote = wrap((req, res) => { doctorService.deleteNote(req.user.id, req.params.id); return success(res, {}, 'Note deleted'); });

const getConversations = wrap((req, res) => success(res, { conversations: doctorService.getConversations(req.user.id) }));
const getMessages = wrap((req, res) => success(res, { messages: doctorService.getDoctorMessages(req.user.id, req.params.userId) }));
const sendMessage = wrap((req, res) => success(res, { message: doctorService.sendDoctorMessage(req.user.id, req.params.userId, req.body.text) }, 'Message sent', 201));

const getDashboardStats = wrap((req, res) => success(res, { stats: doctorService.getDashboardStats(req.user.id) }));
const getAnalytics = wrap((req, res) => success(res, { analytics: doctorService.getAnalytics(req.user.id) }));
const getNotifications = wrap((req, res) => success(res, { notifications: doctorService.getNotifications(req.user.id) }));
const getFeedback = wrap((req, res) => success(res, doctorService.getFeedback(req.user.id)));

const getLogins = wrap((req, res) => success(res, { logins: doctorService.getLogins(req.user.id) }));

const getDocuments = wrap((req, res) => success(res, { documents: doctorService.getDocuments(req.user.id) }));
const createDocument = wrap((req, res) => success(res, { document: doctorService.createDocument(req.user.id, req.body) }, 'Document added', 201));
const deleteDocument = wrap((req, res) => { doctorService.deleteDocument(req.user.id, req.params.id); return success(res, {}, 'Document deleted'); });

module.exports = {
  getProfile, updateProfile, getLogins,
  getPatients, getPatientDetail,
  getAppointments, updateAppointment,
  getAvailability, updateAvailability,
  getNotes, createNote, updateNote, deleteNote,
  getConversations, getMessages, sendMessage,
  getDashboardStats, getAnalytics, getNotifications, getFeedback,
  getDocuments, createDocument, deleteDocument,
};
