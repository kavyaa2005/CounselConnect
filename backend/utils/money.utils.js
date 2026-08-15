// One place that decides how money is written down.
//
// Before this existed the currency symbol was typed literally as '$' in about a
// dozen files. Once real payments went through Razorpay — which charges in
// rupees — checkout said ₹80 while the dashboard, the reports and the PDFs all
// still said $80 for the same session. Same number, two currencies, no way for
// a reader to tell which one was true.
//
// The gateway wins when it is configured, because that is the currency the
// customer's bank is actually debited in. Otherwise the admin setting decides.

const { readStoreObj } = require('./fileStore.utils');
const rzpConfig = require('../config/razorpay.config');

const SYMBOLS = { USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$' };

/** The active currency code. */
const code = () => {
  if (rzpConfig.enabled && rzpConfig.currency) return rzpConfig.currency;
  const settings = readStoreObj('settings.json') || {};
  return settings.payments?.currency || 'USD';
};

/** The symbol for a code, falling back to the code itself when unknown. */
const symbolFor = (c) => SYMBOLS[c] || c || '$';

/** The active symbol. */
const symbol = () => symbolFor(code());

/** `1234.5` → `₹1,234.50` */
const money = (amount) =>
  `${symbol()}${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** `1234.5` → `₹1,235` — for tiles and chart axes where decimals are noise. */
const moneyShort = (amount) =>
  `${symbol()}${Math.round(Number(amount || 0)).toLocaleString('en-US')}`;

module.exports = { code, symbol, symbolFor, money, moneyShort, SYMBOLS };
