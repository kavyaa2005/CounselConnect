const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const hashPassword = async (plaintext) => {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
};

const comparePassword = async (plaintext, hashed) => {
  return bcrypt.compare(plaintext, hashed);
};

module.exports = { hashPassword, comparePassword };
