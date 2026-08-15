// Razorpay payment gateway settings.
//
// Keys live in backend/.env and are never committed (.env is gitignored).
// Test-mode keys start with `rzp_test_` and move no real money.
//
// If no key is configured the app falls back to the original simulated
// checkout, so a teammate who clones the project without credentials still
// gets a working booking flow rather than a broken one.

require('dotenv').config();

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

module.exports = {
  keyId,
  keySecret,

  /** True only when both halves of the key pair are present. */
  enabled: Boolean(keyId && keySecret),

  /** Test keys are prefixed `rzp_test_`; anything else is live money. */
  isTestMode: keyId.startsWith('rzp_test_'),

  /**
   * Razorpay Indian accounts settle in INR, and amounts are sent in the
   * smallest unit (paise), so ₹80 is 8000.
   */
  currency: process.env.RAZORPAY_CURRENCY || 'INR',

  apiBase: 'https://api.razorpay.com/v1',
};
