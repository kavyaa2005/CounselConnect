const svc = require('../services/support.service');
const { success } = require('../utils/response.utils');

const wrap = (fn) => (req, res, next) => { try { fn(req, res); } catch (err) { next(err); } };

const faq = wrap((req, res) => success(res, { faq: svc.getFaq(), categories: svc.CATEGORIES }));

const myTickets = wrap((req, res) => success(res, { tickets: svc.listMine(req.user.id) }));
const createTicket = wrap((req, res) =>
  success(res, { ticket: svc.create(req.user.id, req.body) }, 'Ticket submitted', 201));
const myTicket = wrap((req, res) => success(res, { ticket: svc.getOne(req.params.id, req.user.id) }));
const replyAsUser = wrap((req, res) =>
  success(res, { ticket: svc.reply(req.params.id, 'user', req.user.id, req.body.text) }, 'Reply sent'));

/* ── Admin ── */
const allTickets = wrap((req, res) => success(res, svc.listAll(req.query)));
const adminTicket = wrap((req, res) => success(res, { ticket: svc.getOne(req.params.id) }));
const replyAsAdmin = wrap((req, res) =>
  success(res, { ticket: svc.reply(req.params.id, 'admin', req.user.id, req.body.text) }, 'Reply sent'));
const setStatus = wrap((req, res) =>
  success(res, { ticket: svc.setStatus(req.params.id, req.body.status) }, 'Status updated'));

module.exports = {
  faq, myTickets, createTicket, myTicket, replyAsUser,
  allTickets, adminTicket, replyAsAdmin, setStatus,
};
