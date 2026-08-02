const authService = require('../services/auth.service');
const { success, error } = require('../utils/response.utils');

const register = async (req, res, next) => {
  try {
    const { firstName, email, password, reason, sessionType, frequency, goals } = req.body;
    const user = await authService.createUser({ firstName, email, password, reason, sessionType, frequency, goals });
    const { loginUser } = require('../services/auth.service');
    const result = await loginUser(email, password);
    return success(res, result, 'Account created successfully', 201);
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const meta = { userAgent: req.headers['user-agent'] || '', ip: req.ip || '' };
    const result = await authService.loginUser(email, password, meta);
    return success(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const logout = (req, res, next) => {
  try {
    authService.logoutUser(req.token);
    return success(res, {}, 'Logged out successfully');
  } catch (err) { next(err); }
};

const me = (req, res, next) => {
  try {
    const user = authService.getUserById(req.user.id, req.user.role || 'user');
    return success(res, { user });
  } catch (err) { next(err); }
};

/* ── Password reset (real, replaces the mock that sent nothing) ── */

const reset = require('../services/passwordReset.service');

const forgotPassword = (req, res, next) => {
  try { return success(res, reset.requestReset(req.body.email), 'Check your email for a 6-digit code'); }
  catch (err) { next(err); }
};

const verifyResetCode = (req, res, next) => {
  try { return success(res, reset.verifyCode(req.body.email, req.body.code), 'Code verified'); }
  catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const out = await reset.resetPassword(req.body.email, req.body.ticket, req.body.password);
    return success(res, out, 'Password updated — you can sign in now');
  } catch (err) { next(err); }
};

/* ── Two-factor ── */

const twoFactorStatus = (req, res, next) => {
  try { return success(res, authService.getTwoFactorStatus(req.user.id, req.user.role)); }
  catch (err) { next(err); }
};

const twoFactorSetup = (req, res, next) => {
  try { return success(res, authService.startTwoFactorSetup(req.user.id, req.user.role)); }
  catch (err) { next(err); }
};

const twoFactorConfirm = (req, res, next) => {
  try {
    return success(res, authService.confirmTwoFactorSetup(req.user.id, req.user.role, req.body.code),
      'Two-factor authentication is on');
  } catch (err) { next(err); }
};

const twoFactorDisable = async (req, res, next) => {
  try {
    return success(res, await authService.disableTwoFactor(req.user.id, req.user.role, req.body.password),
      'Two-factor authentication is off');
  } catch (err) { next(err); }
};

/** Second step of a login that stopped at the 2FA challenge. */
const twoFactorVerify = (req, res, next) => {
  try {
    const { verifyToken } = require('../utils/jwt.utils');
    let payload;
    try { payload = verifyToken(req.body.challenge); }
    catch { throw Object.assign(new Error('That sign-in attempt expired — start again'), { statusCode: 401 }); }

    const meta = { userAgent: req.headers['user-agent'] || '', ip: req.ip || '' };
    return success(res, authService.completeTwoFactorLogin(payload, req.body.code, meta), 'Login successful');
  } catch (err) { next(err); }
};

module.exports = {
  register, login, logout, me,
  forgotPassword, verifyResetCode, resetPassword,
  twoFactorStatus, twoFactorSetup, twoFactorConfirm, twoFactorDisable, twoFactorVerify,
};
