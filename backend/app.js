require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

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
const journeyRoutes      = require('./routes/journey.routes');
const notifRoutes        = require('./routes/notifications.routes');
const doctorRoutes       = require('./routes/doctor.routes');

const app = express();

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CounselConnect API is running', timestamp: new Date().toISOString() });
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
app.use('/api/notifications', notifRoutes);
app.use('/api/doctor',        doctorRoutes);

// Error handling
app.use(notFound);
app.use(globalErrorHandler);

module.exports = app;
