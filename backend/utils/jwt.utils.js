const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/app.config');

// In-memory token blacklist (for logout)
const blacklistedTokens = new Set();

const signToken = (payload, options = {}) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn, ...options});
};

const verifyToken = (token) => {
  if (blacklistedTokens.has(token)) {
    throw new Error('Token has been invalidated');
  }
  return jwt.verify(token, jwtSecret);
};

const blacklistToken = (token) => {
  blacklistedTokens.add(token);
};

module.exports = { signToken, verifyToken, blacklistToken };
