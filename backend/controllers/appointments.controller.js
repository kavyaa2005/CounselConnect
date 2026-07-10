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

module.exports = { getAppointments, bookAppointment, getAppointment, updateAppointment };
