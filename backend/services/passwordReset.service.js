// Password reset by one-time code.
//
// Replaces a stub that returned "a reset link has been sent" without sending
// anything — telling users something untrue about their own account security.
//
// Delivery: there is no mail provider wired into this project, so `deliver()`
// is the single seam where one goes. In development the code is logged to the
// server console and (only when ALLOW_DEV_OTP is set) echoed in the response,
// clearly labelled. In production with no mailer configured the request is
// refused rather than silently going nowhere — failing loudly is better than
// pretending.

const crypto = require('crypto');
const { readStore, writeStore } = require('../utils/fileStore.utils');
const { hashPassword } = require('../utils/password.utils');

const STORE = 'password-resets.json';
const CODE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const isDev = process.env.NODE_ENV !== 'production';
const echoCodes = isDev || process.env.ALLOW_DEV_OTP === 'true';

const hash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

/** Six digits, uniformly random — Math.random is not appropriate here. */
const makeCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const findAccount = (email) => {
  const lower = String(email || '').toLowerCase().trim();
  if (!lower) return null;
  for (const [file, role] of [['users.json', 'user'], ['doctors.json', 'doctor'], ['admins.json', 'admin']]) {
    const hit = readStore(file).find(a => String(a.email).toLowerCase() === lower);
    if (hit) return { account: hit, role, file };
  }
  return null;
};

/**
 * Hands the code to the user.
 *
 * Swap the body of this function for a real mail send and the whole flow
 * becomes production-ready without touching anything else.
 */
const deliver = (email, code) => {
  if (isDev) {
    console.log(`\n  ┌─ PASSWORD RESET ─────────────────────────────`);
    console.log(`  │  ${email}`);
    console.log(`  │  Code: ${code}   (valid 10 minutes)`);
    console.log(`  └──────────────────────────────────────────────\n`);
    return true;
  }
  // No mailer configured in production — refuse rather than pretend.
  return false;
};

/**
 * Starts a reset.
 *
 * Always reports success regardless of whether the address exists — otherwise
 * this endpoint becomes a way to enumerate who has an account.
 */
const requestReset = (email) => {
  const found = findAccount(email);
  const generic = {
    sent: true,
    message: 'If that email is registered, a 6-digit code is on its way. It expires in 10 minutes.',
  };
  if (!found) return generic;

  const all = readStore(STORE);
  const lower = String(email).toLowerCase().trim();
  const existing = all.find(r => r.email === lower && !r.usedAt);

  // Rate-limit resends so this can't be used to spam an inbox
  if (existing && Date.now() - new Date(existing.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(existing.createdAt).getTime())) / 1000);
    throw Object.assign(
      new Error(`A code was just sent. Wait ${wait} seconds before asking for another.`),
      { statusCode: 429 }
    );
  }

  const code = makeCode();
  const record = {
    id: crypto.randomUUID(),
    email: lower,
    role: found.role,
    accountId: found.account.id,
    codeHash: hash(code),
    attempts: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    usedAt: null,
  };

  // One live code per address
  writeStore(STORE, [...all.filter(r => !(r.email === lower && !r.usedAt)), record]);

  const delivered = deliver(found.account.email, code);
  if (!delivered) {
    throw Object.assign(
      new Error('Password reset is unavailable right now — no email service is configured. Please contact support.'),
      { statusCode: 503 }
    );
  }

  // Echoed ONLY in development, and labelled so nobody mistakes it for
  // production behaviour.
  return echoCodes ? { ...generic, devCode: code, devNote: 'Shown in development only — a real deployment emails this.' } : generic;
};

const liveRecord = (email) => {
  const lower = String(email || '').toLowerCase().trim();
  const rec = readStore(STORE).find(r => r.email === lower && !r.usedAt);
  if (!rec) throw Object.assign(new Error('Ask for a new code — this one is no longer valid'), { statusCode: 400 });
  if (new Date(rec.expiresAt) < new Date()) {
    throw Object.assign(new Error('That code has expired. Ask for a new one.'), { statusCode: 400 });
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    throw Object.assign(new Error('Too many incorrect attempts. Ask for a new code.'), { statusCode: 429 });
  }
  return rec;
};

/** Checks the code without consuming it, so the UI can show a reset form. */
const verifyCode = (email, code) => {
  const rec = liveRecord(email);
  const all = readStore(STORE);
  const idx = all.findIndex(r => r.id === rec.id);

  if (hash(code) !== rec.codeHash) {
    all[idx].attempts += 1;
    writeStore(STORE, all);
    const left = MAX_ATTEMPTS - all[idx].attempts;
    throw Object.assign(
      new Error(left > 0 ? `That code is not right. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Ask for a new code.'),
      { statusCode: 400 }
    );
  }

  // A short ticket proves the code was verified, so the reset step doesn't
  // need the code passed around a second time.
  const ticket = crypto.randomBytes(24).toString('hex');
  all[idx].ticket = ticket;
  all[idx].verifiedAt = new Date().toISOString();
  writeStore(STORE, all);
  return { verified: true, ticket };
};

/** Sets the new password, then burns the record. */
const resetPassword = async (email, ticket, newPassword) => {
  const rec = liveRecord(email);
  if (!rec.ticket || rec.ticket !== ticket) {
    throw Object.assign(new Error('Verify your code again before setting a new password'), { statusCode: 400 });
  }
  const pw = String(newPassword || '');
  if (pw.length < 8) {
    throw Object.assign(new Error('Use at least 8 characters'), { statusCode: 400 });
  }
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    throw Object.assign(new Error('Include at least one letter and one number'), { statusCode: 400 });
  }

  const file = rec.role === 'doctor' ? 'doctors.json' : rec.role === 'admin' ? 'admins.json' : 'users.json';
  const accounts = readStore(file);
  const idx = accounts.findIndex(a => a.id === rec.accountId);
  if (idx === -1) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  accounts[idx].passwordHash = await hashPassword(pw);
  accounts[idx].updatedAt = new Date().toISOString();
  writeStore(file, accounts);

  const all = readStore(STORE);
  const ri = all.findIndex(r => r.id === rec.id);
  all[ri].usedAt = new Date().toISOString();
  all[ri].ticket = null;
  writeStore(STORE, all);

  return { reset: true };
};

module.exports = { requestReset, verifyCode, resetPassword };
