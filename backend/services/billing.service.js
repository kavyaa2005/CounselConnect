// Billing for session bookings.
//
// This is a *simulated* gateway — no card data is ever collected, transmitted or
// stored. It models the states a real integration (Stripe, Razorpay) would go
// through so the flow, receipts and admin reporting are all genuine, while the
// authorisation step is stubbed. Swapping in a real gateway means replacing
// `authorise()` and nothing else.

const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore, readStoreObj } = require('../utils/fileStore.utils');

const STORE = 'payments.json';

const METHODS = {
  card:   { label: 'Card',        hint: 'Visa, Mastercard, RuPay' },
  upi:    { label: 'UPI',         hint: 'GPay, PhonePe, Paytm' },
  wallet: { label: 'Wallet',      hint: 'Platform credit' },
  netbanking: { label: 'Net Banking', hint: 'All major banks' },
};

const currency = () => {
  const s = readStoreObj('settings.json');
  return s?.payments?.currency || 'USD';
};

const symbolFor = (code) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£' }[code] || '$');

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
};
