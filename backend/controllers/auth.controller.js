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

const forgotPassword = (req, res, next) => {
  try {
    // Mock: in production this sends an email
    return success(res, {}, 'If this email exists, a reset link has been sent.');
  } catch (err) { next(err); }
};

module.exports = { register, login, logout, me, forgotPassword };
