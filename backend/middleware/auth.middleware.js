const { verifyToken } = require('../utils/jwt.utils');
const { error } = require('../utils/response.utils');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided. Please log in.', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);

    // A two-factor challenge token proves only that the *password* was
    // correct. It must never open the API — otherwise an attacker with
    // stolen credentials could skip the second factor entirely by using
    // the challenge as a bearer token.
    if (decoded.stage === '2fa') {
      return error(res, 'Complete two-factor authentication to continue.', 401);
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Session expired. Please log in again.', 401);
    }
    return error(res, 'Invalid token. Please log in.', 401);
  }
};

// Role guard — use after authenticate. e.g. requireRole('doctor')
const requireRole = (role) => (req, res, next) => {
  if (!req.user || (req.user.role || 'user') !== role) {
    return error(res, 'You do not have permission to access this resource.', 403);
  }
  next();
};

module.exports = { authenticate, requireRole };
