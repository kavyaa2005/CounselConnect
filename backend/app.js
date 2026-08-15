require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const corsConfig = require('./config/cors.config');
const { notFound, globalErrorHandler } = require('./middleware/error.middleware');

// Route imports
const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const moodRoutes         = require('./routes/mood.routes');
const journalRoutes      = require('./routes/journal.routes');
const appointmentRoutes  = require('./routes/appointments.routes');
const messageRoutes      = require('./routes/messages.routes');
const counselorRoutes    = require('./routes/counselors.routes');
const aiRoutes           = require('./routes/ai.routes');
const sessionNoteRoutes = require('./routes/sessionNotes.routes');
const journeyRoutes      = require('./routes/journey.routes');
const notifRoutes        = require('./routes/notifications.routes');
const doctorRoutes       = require('./routes/doctor.routes');
const adminRoutes        = require('./routes/admin.routes');
const videoRoutes        = require('./routes/video.routes');
const applicationRoutes  = require('./routes/applications.routes');
const billingRoutes      = require('./routes/billing.routes');
const feedbackRoutes     = require('./routes/feedback.routes');

const app = express();

// Behind Render/Vercel/Nginx the real client address arrives in
// X-Forwarded-For and the real scheme in X-Forwarded-Proto. Without this every
// request looks like it came from the load balancer.
app.set('trust proxy', 1);

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads.
// The directory is created here as well as in the routes: on a fresh clone or a
// fresh container it does not exist yet, and express.static on a missing path
// fails quietly in a way that looks like a broken image rather than a setup
// problem.
const UPLOAD_ROOT = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
app.use('/uploads', express.static(UPLOAD_ROOT));

// The API root. Without this, opening the service URL in a browser returns a
// bare 404 and fills the logs with "Route not found: /" — which looks like a
// broken deployment when it is simply an API with no homepage.
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'CounselConnect API',
    message: 'The API is running. The web app is served separately.',
    health: '/api/health',
    docs: 'https://github.com/Hyphenat/CounselConnect-',
  });
});

// Browsers request this automatically; 204 keeps it out of the error log.
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health check
app.get('/api/health', (req, res) => {
  // Reports which backend is live and what's in it, so you can confirm the
  // database is connected without opening Compass.
  const { storeStats, usingMongo } = require('./utils/fileStore.utils');
  const s = storeStats();
  res.json({
    success: true,
    message: 'CounselConnect API is running',
    timestamp: new Date().toISOString(),
    database: {
      engine: usingMongo() ? 'mongodb' : 'json-files',
      name: s.dbName,
      uri: s.uri,
      collections: s.collections.length,
      documents: s.collections.reduce((n, c) => n + c.count, 0),
      pendingWrites: s.pendingWrites,
      lastError: s.lastError,
    },
  });
});

// API Routes
app.use('/api/auth',          authRoutes);
app.use('/api/user',          userRoutes);
app.use('/api/mood',          moodRoutes);
app.use('/api/journal',       journalRoutes);
app.use('/api/appointments',  appointmentRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/counselors',    counselorRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/journey',       journeyRoutes);
app.use('/api/session-notes', sessionNoteRoutes);
app.use('/api/emergency',     require('./routes/emergency.routes'));
app.use('/api/support',       require('./routes/support.routes'));
app.use('/api/shared-files',  require('./routes/sharedFiles.routes'));
app.use('/api/notifications', notifRoutes);
app.use('/api/doctor',        doctorRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/video',         videoRoutes);
app.use('/api/applications',  applicationRoutes);
app.use('/api/billing',       billingRoutes);
app.use('/api/feedback',      feedbackRoutes);

// Error handling
app.use(notFound);
app.use(globalErrorHandler);

module.exports = app;
