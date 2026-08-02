// Time-based one-time passwords (RFC 6238).
//
// Implemented on Node's built-in crypto rather than pulling in a dependency —
// TOTP is a short, well-specified algorithm and this keeps the project
// self-contained. Compatible with Google Authenticator, Authy, 1Password etc.

const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

/** Base32 (RFC 4648, no padding) — the encoding authenticator apps expect. */
const base32Encode = (buf) => {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
};

const base32Decode = (str) => {
  const clean = String(str).toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character in secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

/** A fresh 160-bit secret, base32 encoded. */
const generateSecret = () => base32Encode(crypto.randomBytes(20));

/** The 6-digit code for a given counter step. */
const hotp = (secret, counter) => {
  const key = base32Decode(secret);

  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();

  // Dynamic truncation, per the spec
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);

  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
};

/** The code valid right now. */
const generateToken = (secret, at = Date.now()) =>
  hotp(secret, Math.floor(at / 1000 / STEP_SECONDS));

/**
 * Checks a submitted code.
 *
 * `window` allows for clock drift between the phone and the server — 1 means
 * the previous and next 30-second step are also accepted, which is the usual
 * trade-off. Comparison is constant-time so a submitted code can't be probed
 * digit by digit through timing.
 */
const verifyToken = (secret, token, window = 1) => {
  const clean = String(token || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return false;

  const step = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let i = -window; i <= window; i++) {
    const expected = hotp(secret, step + i);
    const a = Buffer.from(expected);
    const b = Buffer.from(clean);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
};

/**
 * otpauth:// URI for the QR code.
 *
 * Authenticator apps scan this; it carries the secret, the account label and
 * the issuer shown in the app's list.
 */
const otpauthUrl = ({ secret, account, issuer = 'CounselConnect' }) => {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
};

/**
 * Single-use recovery codes, for when the phone is lost.
 *
 * Stored hashed — a leaked database shouldn't hand over working codes.
 */
const generateRecoveryCodes = (count = 8) =>
  Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });

const hashRecoveryCode = (code) =>
  crypto.createHash('sha256').update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

module.exports = {
  generateSecret,
  generateToken,
  verifyToken,
  otpauthUrl,
  generateRecoveryCodes,
  hashRecoveryCode,
  STEP_SECONDS,
  DIGITS,
};
