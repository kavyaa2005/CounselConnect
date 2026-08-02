const svc = require('../services/sessionNotes.service');
const { success } = require('../utils/response.utils');

const wrap = (fn) => (req, res, next) => { try { fn(req, res); } catch (err) { next(err); } };

const list   = wrap((req, res) => success(res, {
  notes: req.query.appointmentId
    ? svc.forAppointment(req.user.id, req.query.appointmentId)
    : svc.list(req.user.id),
}));
const create = wrap((req, res) => success(res, { note: svc.create(req.user.id, req.body) }, 'Note saved', 201));
const update = wrap((req, res) => success(res, { note: svc.update(req.user.id, req.params.id, req.body) }, 'Note updated'));
const remove = wrap((req, res) => { svc.remove(req.user.id, req.params.id); return success(res, {}, 'Note deleted'); });

module.exports = { list, create, update, remove };
