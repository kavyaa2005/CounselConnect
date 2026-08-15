// Which browsers are allowed to call this API.
//
// This used to be a fixed array, which was fine when the only client was
// http://localhost:5173. In production the frontend lives on a URL that isn't
// known until Vercel creates it, and every pull-request preview gets a *new*
// URL — so a hard-coded list would break the moment the site was deployed.
//
// The origin is therefore checked by a function:
//   • anything listed in FRONTEND_URL (comma-separated, so staging + production
//     can both be allowed)
//   • the usual local dev ports
//   • *.vercel.app preview builds, but only when ALLOW_VERCEL_PREVIEWS is on
//
// Requests with no Origin header at all (curl, Postman, server-to-server, and
// same-origin navigations) are allowed: the header is set by browsers, and
// blocking its absence stops health checks without stopping any attacker.

const { frontendUrl } = require('./app.config');

/** Trailing slashes are invisible in a browser but break a string compare. */
const normalise = (url) => String(url || '').trim().replace(/\/+$/, '').toLowerCase();

const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:4173',   // vite preview
];

/** FRONTEND_URL may hold one URL or several, comma-separated. */
const allowList = [
  ...String(frontendUrl || '').split(',').map(normalise).filter(Boolean),
  ...LOCAL_ORIGINS.map(normalise),
];

const allowVercelPreviews =
  String(process.env.ALLOW_VERCEL_PREVIEWS || 'true').toLowerCase() !== 'false';

const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

/** Exported so the deploy check and the tests can ask without starting a server. */
function isAllowedOrigin(origin) {
  if (!origin) return true;                       // not a browser request
  const o = normalise(origin);
  if (allowList.includes(o)) return true;
  if (allowVercelPreviews && VERCEL_PREVIEW.test(o)) return true;
  return false;
}

module.exports = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    // A clear message beats a silent browser-side failure that looks like a
    // network outage. This shows up in the Render logs.
    callback(new Error(
      `Origin ${origin} is not allowed by CORS. ` +
      `Set FRONTEND_URL on the server to your site's URL.`
    ));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  isAllowedOrigin,
  allowList,
};
