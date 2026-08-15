// Razorpay gateway calls.
//
// Only two operations are needed for a checkout: create an Order before the
// customer pays, and verify the signature afterwards. Both are plain HTTPS
// calls against Razorpay's documented REST API, so no SDK dependency is
// required — which also keeps exactly what goes over the wire visible.
//
// ── Why an Order at all? ──
// Without one, the browser would tell the server "I paid ₹80" and the server
// would have to believe it. An Order fixes the amount server-side before the
// customer sees the payment sheet, and the signature afterwards proves that
// Razorpay — not the browser — authorised that exact order.

const crypto = require('crypto');
const cfg = require('../config/razorpay.config');

const authHeader = () =>
  'Basic ' + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64');

/** Rupees → paise. Razorpay rejects fractional amounts. */
const toMinorUnits = (amount) => Math.round(Number(amount || 0) * 100);

/**
 * Creates a Razorpay Order.
 *
 * @param {object} p
 * @param {number} p.amount   in major units (rupees)
 * @param {string} p.receipt  our own reference, max 40 chars
 * @param {object} p.notes    free-form metadata echoed back on the payment
 */
async function createOrder({ amount, receipt, notes = {} }) {
  if (!cfg.enabled) {
    throw Object.assign(new Error('Payment gateway is not configured'), { statusCode: 503 });
  }

  const minor = toMinorUnits(amount);
  if (!Number.isFinite(minor) || minor < 100) {
    // Razorpay's minimum is ₹1.00
    throw Object.assign(new Error('Payment amount is too small'), { statusCode: 400 });
  }

  let res;
  try {
    res = await fetch(`${cfg.apiBase}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
      body: JSON.stringify({
        amount: minor,
        currency: cfg.currency,
        receipt: String(receipt).slice(0, 40),
        notes,
      }),
    });
  } catch (e) {
    // Network failure — Razorpay unreachable, no internet, DNS, etc.
    throw Object.assign(
      new Error('Could not reach the payment gateway. Check your internet connection.'),
      { statusCode: 502 }
    );
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.description || `Payment gateway error (${res.status})`;
    throw Object.assign(new Error(msg), { statusCode: 502 });
  }
  return body;   // { id: 'order_…', amount, currency, status: 'created' }
}

/**
 * Verifies that a completed payment really came from Razorpay.
 *
 * Razorpay signs `order_id|payment_id` with our key secret. Only we and
 * Razorpay know that secret, so recomputing the HMAC proves the browser did
 * not fabricate the success callback.
 *
 * Compared with timingSafeEqual: a plain `===` returns sooner on an early
 * mismatch, which leaks information to anyone able to time the responses.
 */
function verifySignature({ orderId, paymentId, signature }) {
  if (!cfg.enabled || !orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac('sha256', cfg.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Fetches a payment so the server can confirm status and amount independently. */
async function fetchPayment(paymentId) {
  if (!cfg.enabled) return null;
  try {
    const res = await fetch(`${cfg.apiBase}/payments/${paymentId}`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

module.exports = { createOrder, verifySignature, fetchPayment, toMinorUnits };
