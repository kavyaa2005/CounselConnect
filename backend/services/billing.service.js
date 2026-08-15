// Billing for session bookings.
//
// Two paths exist:
//
//  1. **Razorpay** (used when RAZORPAY_KEY_ID is configured) — the client pays
//     during booking, and the appointment is only created once the server has
//     verified Razorpay's signature. See createBookingOrder / confirmBooking.
//
//  2. **Simulated** — the original stubbed gateway, kept as a fallback so the
//     project still runs for anyone who clones it without API keys, and so the
//     older "pay for an already-accepted booking" flow keeps working.
//
// No card details ever reach this server in either path: with Razorpay the
// customer types them into Razorpay's own hosted sheet.

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { readStore, writeStore, readStoreObj } = require('../utils/fileStore.utils');
const razorpay = require('./razorpay.service');
const rzpConfig = require('../config/razorpay.config');
const appointmentsService = require('./appointments.service');

const STORE = 'payments.json';
const INTENTS = 'payment-intents.json';

const METHODS = {
  card:   { label: 'Card',        hint: 'Visa, Mastercard, RuPay' },
  upi:    { label: 'UPI',         hint: 'GPay, PhonePe, Paytm' },
  wallet: { label: 'Wallet',      hint: 'Platform credit' },
  netbanking: { label: 'Net Banking', hint: 'All major banks' },
};

// Delegated so the gateway's currency and the displayed one can never diverge:
// when Razorpay is configured it charges in rupees, and every other screen must
// agree. See utils/money.utils.js.
const { code: currency, symbolFor } = require('../utils/money.utils');

const platformFeePercent = () => {
  const s = readStoreObj('settings.json');
  const v = Number(s?.payments?.platformFeePercent);
  return Number.isFinite(v) ? v : 20;
};

const fmtMoney = (amount) => `${symbolFor(currency())}${Number(amount || 0).toFixed(2)}`;

const receiptNumber = () =>
  `CC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/**
 * Stubbed authorisation. A real gateway call goes here.
 * Deliberately deterministic so demos never fail randomly.
 */
const authorise = ({ method }) => {
  if (!METHODS[method]) {
    throw Object.assign(new Error('Choose a valid payment method'), { statusCode: 400 });
  }
  return { ok: true, reference: `SIM-${uuidv4().slice(0, 12).toUpperCase()}` };
};

/** Charge for an appointment and write a receipt. */
const payForAppointment = (userId, { appointmentId, method }) => {
  const appointments = readStore('appointments.json');
  const idx = appointments.findIndex(a => a.id === appointmentId && a.userId === userId);
  if (idx === -1) {
    throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  }

  const appt = appointments[idx];
  if (appt.paymentStatus === 'paid') {
    throw Object.assign(new Error('This session has already been paid for'), { statusCode: 409 });
  }
  // Nothing is charged for a request the counselor hasn't accepted yet.
  if (appt.status === 'pending') {
    throw Object.assign(new Error('Your counselor hasn\'t accepted this request yet — you\'ll be able to pay once they do'), { statusCode: 409 });
  }
  if (['cancelled', 'rejected'].includes(appt.status)) {
    throw Object.assign(new Error('This session is no longer active'), { statusCode: 409 });
  }

  const auth = authorise({ method });

  const gross = Number(appt.price) || 0;
  const feePct = platformFeePercent();
  const platformFee = Math.round(gross * (feePct / 100) * 100) / 100;

  const payment = {
    id: uuidv4(),
    receiptNumber: receiptNumber(),
    userId,
    appointmentId,
    counselorId: appt.counselorId,
    counselorName: appt.counselorName,
    sessionType: appt.sessionType,
    sessionDate: appt.date,
    sessionTime: appt.time,
    amount: gross,
    currency: currency(),
    platformFee,
    counselorPayout: Math.round((gross - platformFee) * 100) / 100,
    method,
    methodLabel: METHODS[method].label,
    gatewayReference: auth.reference,
    simulated: true,
    status: 'paid',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const payments = readStore(STORE);
  payments.push(payment);
  writeStore(STORE, payments);

  appointments[idx].paymentStatus = 'paid';
  appointments[idx].paymentId = payment.id;
  appointments[idx].updatedAt = new Date().toISOString();
  writeStore('appointments.json', appointments);

  return { payment, appointment: appointments[idx] };
};

/* ══════════════════════════════════════════════════════════════════════════
   Pay-before-booking, via Razorpay
   ══════════════════════════════════════════════════════════════════════════ */

/** What the client needs to open Checkout — safe to expose (no secret). */
const gatewayConfig = () => ({
  enabled: rzpConfig.enabled,
  keyId: rzpConfig.keyId,          // publishable by design
  testMode: rzpConfig.isTestMode,
  currency: rzpConfig.enabled ? rzpConfig.currency : currency(),
  symbol: symbolFor(rzpConfig.enabled ? rzpConfig.currency : currency()),
});

/**
 * Step 1 of booking: validate everything, then create a Razorpay Order.
 *
 * The appointment is deliberately NOT created here. If it were, an abandoned
 * payment would leave an unpaid booking holding a slot. The booking details
 * are parked in a payment intent and only become an appointment once the money
 * is confirmed.
 *
 * The price is read from the counselor's own record, never from the request
 * body — otherwise a modified client could book a ₹2000 session for ₹1.
 */
const createBookingOrder = async (userId, booking) => {
  if (!rzpConfig.enabled) {
    throw Object.assign(new Error('Online payment is not configured on this server'), { statusCode: 503 });
  }

  const { counselorId, date, time } = booking;
  const doctor = readStore('doctors.json').find(d => d.counselorId === counselorId);
  if (!doctor) throw Object.assign(new Error('Counselor not found'), { statusCode: 404 });

  // Authoritative price — the client's number is ignored entirely.
  const amount = Number(doctor.price) || 0;
  if (amount <= 0) {
    throw Object.assign(new Error('This counselor has no session fee set'), { statusCode: 400 });
  }

  // Fail before taking money, not after: slot free, in working hours, not on
  // vacation. Exactly the same checks the booking itself will run.
  appointmentsService.assertSlotIsFree(counselorId, `${date} ${time}`);

  const order = await razorpay.createOrder({
    amount,
    receipt: receiptNumber(),
    notes: {
      userId,
      counselorId,
      counselorName: doctor.name,
      sessionDate: String(date),
      sessionTime: String(time),
    },
  });

  const intents = readStore(INTENTS);
  intents.push({
    id: uuidv4(),
    orderId: order.id,
    userId,
    amount,
    currency: order.currency,
    status: 'created',              // created | paid | failed
    // Everything needed to build the appointment once payment clears.
    booking: {
      counselorId,
      counselorName: doctor.name,
      counselorAvatar: doctor.image || doctor.avatar || '',
      sessionType: booking.sessionType === 'chat' ? 'chat' : 'video',
      mode: booking.mode === 'offline' || booking.mode === 'in-person' ? 'offline' : 'online',
      reason: String(booking.reason || '').trim(),
      date, time,
      price: amount,
    },
    createdAt: new Date().toISOString(),
  });
  writeStore(INTENTS, intents);

  return {
    orderId: order.id,
    amount: order.amount,           // paise, what Checkout expects
    displayAmount: amount,
    currency: order.currency,
    keyId: rzpConfig.keyId,
    counselorName: doctor.name,
    testMode: rzpConfig.isTestMode,
  };
};

/**
 * Step 2: Razorpay says the payment succeeded — prove it, then book.
 *
 * The browser is not trusted. The signature is an HMAC of `order_id|payment_id`
 * keyed with our secret, so only Razorpay could have produced it. Without this
 * check anyone could POST a fake success and get a free session.
 */
const confirmBooking = async (userId, {
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId,
  razorpay_signature: signature,
}) => {
  if (!razorpay.verifySignature({ orderId, paymentId, signature })) {
    throw Object.assign(
      new Error('Payment could not be verified. If money was debited it will be returned automatically.'),
      { statusCode: 400 }
    );
  }

  const intents = readStore(INTENTS);
  const idx = intents.findIndex(i => i.orderId === orderId && i.userId === userId);
  if (idx === -1) {
    throw Object.assign(new Error('That payment does not match any booking'), { statusCode: 404 });
  }

  // Replay guard: a double-submitted callback must not book twice or charge
  // twice. Return the original result instead.
  if (intents[idx].status === 'paid') {
    const existing = readStore(STORE).find(p => p.gatewayOrderId === orderId);
    const appt = readStore('appointments.json').find(a => a.id === intents[idx].appointmentId);
    return { payment: existing ? decorate(existing) : null, appointment: appt, alreadyProcessed: true };
  }

  const intent = intents[idx];

  // Create the appointment now, reusing the normal booking path so slot
  // conflicts, vacation mode, break times and auto-reject all still apply.
  const appointment = appointmentsService.bookAppointment(userId, intent.booking, { prepaid: true });

  const gross = Number(intent.amount) || 0;
  const feePct = platformFeePercent();
  const platformFee = Math.round(gross * (feePct / 100) * 100) / 100;

  // Ask Razorpay directly what method was used, rather than trusting the client.
  const remote = await razorpay.fetchPayment(paymentId);
  const method = remote?.method || 'card';

  const payment = {
    id: uuidv4(),
    receiptNumber: receiptNumber(),
    userId,
    appointmentId: appointment.id,
    counselorId: intent.booking.counselorId,
    counselorName: intent.booking.counselorName,
    sessionType: intent.booking.sessionType,
    sessionDate: intent.booking.date,
    sessionTime: intent.booking.time,
    amount: gross,
    currency: intent.currency,
    platformFee,
    counselorPayout: Math.round((gross - platformFee) * 100) / 100,
    method,
    methodLabel: METHODS[method]?.label || (method === 'netbanking' ? 'Net Banking' : String(method).toUpperCase()),
    gateway: 'razorpay',
    gatewayOrderId: orderId,
    gatewayPaymentId: paymentId,
    gatewayReference: paymentId,
    // Real gateway, real signature check — but test-mode money.
    simulated: false,
    testMode: rzpConfig.isTestMode,
    status: 'paid',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const payments = readStore(STORE);
  payments.push(payment);
  writeStore(STORE, payments);

  // Link the payment onto the appointment.
  const appts = readStore('appointments.json');
  const ai = appts.findIndex(a => a.id === appointment.id);
  if (ai !== -1) {
    appts[ai].paymentId = payment.id;
    appts[ai].updatedAt = new Date().toISOString();
    writeStore('appointments.json', appts);
  }

  const fresh = readStore(INTENTS);
  const fi = fresh.findIndex(i => i.orderId === orderId);
  if (fi !== -1) {
    fresh[fi].status = 'paid';
    fresh[fi].paymentId = payment.id;
    fresh[fi].appointmentId = appointment.id;
    fresh[fi].paidAt = payment.paidAt;
    writeStore(INTENTS, fresh);
  }

  return { payment: decorate(payment), appointment: appts[ai] || appointment };
};

/** Records an abandoned or failed attempt so the intent isn't left dangling. */
const markBookingFailed = (userId, orderId, reason = '') => {
  const intents = readStore(INTENTS);
  const idx = intents.findIndex(i => i.orderId === orderId && i.userId === userId);
  if (idx === -1 || intents[idx].status === 'paid') return null;
  intents[idx].status = 'failed';
  intents[idx].failureReason = String(reason || '').slice(0, 200);
  intents[idx].failedAt = new Date().toISOString();
  writeStore(INTENTS, intents);
  return intents[idx];
};

/** Refund a payment — used when a paid session is cancelled. */
const refundForAppointment = (userId, appointmentId, reason = '') => {
  const payments = readStore(STORE);
  const idx = payments.findIndex(
    p => p.appointmentId === appointmentId && p.userId === userId && p.status === 'paid'
  );
  if (idx === -1) return null;

  payments[idx].status = 'refunded';
  payments[idx].refundedAt = new Date().toISOString();
  payments[idx].refundReason = reason;
  writeStore(STORE, payments);

  const appointments = readStore('appointments.json');
  const ai = appointments.findIndex(a => a.id === appointmentId);
  if (ai !== -1) {
    appointments[ai].paymentStatus = 'refunded';
    writeStore('appointments.json', appointments);
  }

  return payments[idx];
};

const decorate = (p) => ({
  ...p,
  amountLabel: fmtMoney(p.amount),
  dateLabel: new Date(p.paidAt || p.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }),
  timeLabel: new Date(p.paidAt || p.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  }),
});

/** A user's own payment history. */
const getMyPayments = (userId) => {
  const mine = readStore(STORE)
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
    .map(decorate);

  const paid = mine.filter(p => p.status === 'paid');
  const refunded = mine.filter(p => p.status === 'refunded');
  const totalSpent = paid.reduce((s, p) => s + p.amount, 0);

  // Sessions booked but not yet paid
  const outstanding = readStore('appointments.json')
    // Outstanding = accepted and unpaid. A pending request isn't a bill yet.
    .filter(a => a.userId === userId && a.status === 'confirmed'
      && a.paymentStatus !== 'paid' && a.paymentStatus !== 'refunded')
    .map(a => ({
      appointmentId: a.id,
      counselorName: a.counselorName,
      sessionType: a.sessionType,
      date: a.date,
      time: a.time,
      amount: Number(a.price) || 0,
      amountLabel: fmtMoney(a.price),
    }));

  return {
    payments: mine,
    summary: {
      currency: currency(),
      symbol: symbolFor(currency()),
      totalSpent,
      totalSpentLabel: fmtMoney(totalSpent),
      paidCount: paid.length,
      refundedCount: refunded.length,
      refundedTotalLabel: fmtMoney(refunded.reduce((s, p) => s + p.amount, 0)),
      outstandingCount: outstanding.length,
      outstandingTotalLabel: fmtMoney(outstanding.reduce((s, o) => s + o.amount, 0)),
    },
    outstanding,
    methods: Object.entries(METHODS).map(([id, m]) => ({ id, ...m })),
  };
};

const getReceipt = (userId, paymentId) => {
  const p = readStore(STORE).find(x => x.id === paymentId && x.userId === userId);
  if (!p) throw Object.assign(new Error('Receipt not found'), { statusCode: 404 });
  return decorate(p);
};

module.exports = {
  payForAppointment, refundForAppointment, getMyPayments, getReceipt,
  fmtMoney, currency, symbolFor, METHODS,
  // Razorpay pay-before-booking
  gatewayConfig, createBookingOrder, confirmBooking, markBookingFailed,
};
