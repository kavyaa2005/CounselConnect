require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * The development fallback secret.
 *
 * It is committed to a public repository, so anyone who can read the repo can
 * forge a token for any account — including an admin. That is harmless on
 * localhost and unacceptable on a public URL, so production refuses to start
 * without a real one rather than booting quietly with a known key.
 */
const FALLBACK_SECRET = 'counselconnect_secret_fallback';
const jwtSecret = process.env.JWT_SECRET || FALLBACK_SECRET;

if (isProduction && jwtSecret === FALLBACK_SECRET) {
  throw new Error(
    'JWT_SECRET is not set.\n' +
    '  In production every login token would be signed with the fallback key that\n' +
    '  ships in the public repo, so anyone could mint an admin token.\n' +
    '  Set JWT_SECRET on the host to a long random string, e.g.\n' +
    '    node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

if (isProduction && !process.env.FRONTEND_URL) {
  // Not fatal — the API still works — but every browser request from the real
  // site would be refused by CORS, which looks like a total outage.
  console.warn(
    '[config] FRONTEND_URL is not set. Browser requests from your deployed site\n' +
    '         will be blocked by CORS. Set it to your site URL, e.g.\n' +
    '         FRONTEND_URL=https://counselconnect.vercel.app'
  );
}

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv,
  isProduction,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  uploadDir: 'uploads',
  maxFileSize: 5 * 1024 * 1024, // 5MB
};
