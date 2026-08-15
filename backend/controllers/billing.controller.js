const billing = require('../services/billing.service');
const { success } = require('../utils/response.utils');

const h = (fn) => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};

const getMyPayments = h((req, res) =>
  success(res, billing.getMyPayments(req.user.id)));

/** Pay for a booking the counselor already accepted (the original flow). */
const pay = h((req, res) => {
  const { appointmentId, method } = req.body;
  const result = billing.payForAppointment(req.user.id, { appointmentId, method });
  return success(res, result, `Payment of ${billing.fmtMoney(result.payment.amount)} received`, 201);
});

const getReceipt = h((req, res) =>
  success(res, { receipt: billing.getReceipt(req.user.id, req.params.id) }));

/* ── Pay-before-booking ── */

/** Tells the client whether to show Razorpay Checkout or the simulated form. */
const getConfig = h((req, res) => success(res, billing.gatewayConfig()));

/** Step 1 — validate the slot and open a Razorpay Order. No booking yet. */
const createOrder = h(async (req, res) => {
  const order = await billing.createBookingOrder(req.user.id, req.body);
  return success(res, order, 'Payment order created', 201);
});

/** Step 2 — verify Razorpay's signature, then create the appointment. */
const verifyAndBook = h(async (req, res) => {
  const result = await billing.confirmBooking(req.user.id, req.body);
  return success(
    res,
    result,
    result.alreadyProcessed ? 'This booking was already confirmed' : 'Payment verified — session booked',
    201
  );
});

/** The customer closed the sheet or the payment failed. */
const abandonOrder = h((req, res) => {
  billing.markBookingFailed(req.user.id, req.body.orderId, req.body.reason);
  return success(res, {}, 'Payment attempt closed');
});

module.exports = {
  getMyPayments, pay, getReceipt,
  getConfig, createOrder, verifyAndBook, abandonOrder,
};
