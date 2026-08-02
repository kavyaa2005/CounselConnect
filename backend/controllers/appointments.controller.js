const apptService = require('../services/appointments.service');
const { success } = require('../utils/response.utils');

const getAppointments = (req, res, next) => {
  try {
    const appointments = apptService.getAppointments(req.user.id);
    return success(res, { appointments });
  } catch (err) { next(err); }
};

const bookAppointment = (req, res, next) => {
  try {
    const appt = apptService.bookAppointment(req.user.id, req.body);
    return success(res, { appointment: appt }, 'Session booked successfully', 201);
  } catch (err) { next(err); }
};

const getAppointment = (req, res, next) => {
  try {
    const appt = apptService.getAppointment(req.user.id, req.params.id);
    return success(res, { appointment: appt });
  } catch (err) { next(err); }
};

const updateAppointment = (req, res, next) => {
  try {
    const appt = apptService.updateAppointment(req.user.id, req.params.id, req.body);
    return success(res, { appointment: appt }, 'Appointment updated');
  } catch (err) { next(err); }
};

const reschedule = (req, res, next) => {
  try {
    const appt = apptService.rescheduleAppointment(req.user.id, req.params.id, req.body);
    return success(res, { appointment: appt }, 'Session rescheduled');
  } catch (err) { next(err); }
};

const uploadDocument = (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error('No file was uploaded'), { statusCode: 400 });
    const doc = apptService.attachDocument(req.user.id, req.params.id, req.file);
    return success(res, { document: doc }, 'File attached', 201);
  } catch (err) { next(err); }
};

const deleteDocument = (req, res, next) => {
  try {
    apptService.removeDocument(req.user.id, req.params.id, req.params.docId);
    return success(res, {}, 'Attachment removed');
  } catch (err) { next(err); }
};

const downloadDocument = (req, res, next) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const { APPT_DOC_DIR } = require('../services/appointments.paths');
    const doc = apptService.getDocument(req.user.id, req.params.id, req.params.docId);
    const full = path.join(APPT_DOC_DIR, doc.storedName);
    if (!fs.existsSync(full)) {
      throw Object.assign(new Error('The stored file is missing'), { statusCode: 404 });
    }
    // Headers are latin-1 only — send an ASCII fallback plus RFC 5987
    const ascii = doc.name.replace(/[^\x20-\x7E]/g, '-').replace(/["\\]/g, '');
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition',
      `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`);
    fs.createReadStream(full).pipe(res);
  } catch (err) { next(err); }
};

/** Branded appointment details sheet the client can keep or print. */
const downloadDetails = (req, res, next) => {
  try {
    const data = apptService.getAppointmentDetails(req.user.id, req.params.id);
    require('../services/pdf.service').streamAppointmentDetails(res, data);
  } catch (err) { next(err); }
};

module.exports = {
  getAppointments, bookAppointment, getAppointment, updateAppointment,
  reschedule, uploadDocument, deleteDocument, downloadDocument, downloadDetails,
};
