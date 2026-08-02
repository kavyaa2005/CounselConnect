const billing = require('../services/billing.service');
const { success } = require('../utils/response.utils');

const h = (fn) => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};

const getMyPayments = h((req, res) =>
  success(res, billing.getMyPayments(req.user.id)));

const pay = h((req, res) => {
  const { appointmentId, method } = req.body;
  const result = billing.payForAppointment(req.user.id, { appointmentId, method });
  return success(res, result, `Payment of ${billing.fmtMoney(result.payment.amount)} received`, 201);
});

const getReceipt = h((req, res) =>
  success(res, { receipt: billing.getReceipt(req.user.id, req.params.id) }));

module.exports = { getMyPayments, pay, getReceipt };
