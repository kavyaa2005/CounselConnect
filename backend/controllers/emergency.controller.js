const svc = require('../services/emergency.service');
const { success } = require('../utils/response.utils');

const wrap = (fn) => (req, res, next) => { try { fn(req, res); } catch (err) { next(err); } };

// Public on purpose: crisis resources must not sit behind a login wall.
const resources = wrap((req, res) => success(res, svc.getResources(req.query.region)));

const getContact = wrap((req, res) => success(res, { contact: svc.getContact(req.user.id) }));
const saveContact = wrap((req, res) =>
  success(res, { contact: svc.saveContact(req.user.id, req.body) }, 'Emergency contact saved'));
const removeContact = wrap((req, res) => {
  svc.removeContact(req.user.id);
  return success(res, {}, 'Emergency contact removed');
});
const log = wrap((req, res) => success(res, { logged: svc.logUse(req.user.id, req.body) }));

module.exports = { resources, getContact, saveContact, removeContact, log };
