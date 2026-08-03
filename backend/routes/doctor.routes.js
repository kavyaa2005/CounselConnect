const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { body } = require('express-validator');
const ctrl = require('../controllers/doctor.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { DOC_DIR } = require('../services/doctor.service.paths');

// Clinical documents are stored outside the statically-served uploads folder.
fs.mkdirSync(DOC_DIR, { recursive: true });

// Avatars ARE public — they appear on every counselor card a client browses,
// so unlike clinical documents they belong under the static uploads folder.
const AVATAR_DIR = path.join(__dirname, '../uploads/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) =>
      cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Profile photos must be an image'));
  },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DOC_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/\.(pdf|docx?|png|jpe?g|webp|txt|csv|xlsx?)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, Word, Excel, text or image files are accepted'));
  },
});

// All doctor routes require an authenticated doctor
router.use(authenticate, requireRole('doctor'));

// Dashboard / analytics / notifications
router.get('/dashboard', ctrl.getDashboardStats);
router.get('/analytics', ctrl.getAnalytics);
router.get('/badges', ctrl.getBadges);
router.get('/notifications', ctrl.getNotifications);
router.post('/notifications/read', ctrl.markNotificationsRead);
router.get('/feedback', ctrl.getFeedback);
router.post('/feedback/:id/reply',
  [body('reply').trim().notEmpty().withMessage('Write something before posting')],
  validate, ctrl.replyToFeedback);

// Reports
router.get('/reports', ctrl.getReports);
router.get('/reports/export', ctrl.exportReport);
router.get('/reports/daily', ctrl.getDaily);

// AI assistant
router.post('/ai/ask',
  [body('question').trim().notEmpty().withMessage('Ask a question first')],
  validate, ctrl.askAssistant);

// Profile
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.post('/profile/photo', avatarUpload.single('photo'), ctrl.uploadProfilePhoto);

// Settings
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSettings);
router.put('/password', ctrl.changePassword);

// Patients
router.get('/patients', ctrl.getPatients);
router.get('/patients/:id', ctrl.getPatientDetail);
router.get('/patients/:id/documents', ctrl.patientDocuments);

// Patient journals (shared entries only) + PDF export
router.get('/journals', ctrl.getJournalOverview);
router.get('/journals/:id', ctrl.getPatientJournal);
router.get('/journals/:id/pdf', ctrl.downloadJournalPdf);

// Appointments
// Approval workflow
router.get('/requests', ctrl.getPendingRequests);
router.put('/appointments/:id/accept', ctrl.acceptAppointment);
router.put('/appointments/:id/reject', ctrl.rejectAppointment);

// AI session summary
router.post('/appointments/:id/summarise', ctrl.summariseSession);
router.put('/appointments/:id/actions/:index', ctrl.toggleSessionAction);

router.get('/appointments', ctrl.getAppointments);
router.post('/appointments',
  [
    body('patientId').notEmpty().withMessage('Choose a patient'),
    body('date').notEmpty().withMessage('Pick a date'),
    body('time').notEmpty().withMessage('Pick a time'),
  ],
  validate, ctrl.createAppointment);
router.put('/appointments/:id', ctrl.updateAppointment);
router.get('/appointments/:id/summary.pdf', ctrl.downloadAppointmentSummary);

// Availability
router.get('/availability', ctrl.getAvailability);
router.put('/availability', ctrl.updateAvailability);

// Counseling notes
router.get('/notes', ctrl.getNotes);
router.post('/notes', ctrl.createNote);
router.put('/notes/:id', ctrl.updateNote);
router.delete('/notes/:id', ctrl.deleteNote);
router.get('/notes/:id/pdf', ctrl.downloadNotePdf);
router.post('/notes/:id/summarise', ctrl.summariseNote);
router.post('/notes/draft',
  [body('patientId').notEmpty().withMessage('Choose a patient to draft for')],
  validate, ctrl.draftNote);

// Chat
router.get('/conversations', ctrl.getConversations);
router.get('/messages/:userId', ctrl.getMessages);
router.post('/messages/:userId',
  [body('text').trim().notEmpty().withMessage('Message text is required')],
  validate, ctrl.sendMessage
);

// Security
router.get('/logins', ctrl.getLogins);

// Documents
router.get('/documents', ctrl.getDocuments);
router.post('/documents', ctrl.createDocument);
router.post('/documents/upload', upload.single('file'), ctrl.uploadDocument);
router.get('/documents/:id/download', ctrl.downloadDocument);
router.put('/documents/:id/share', ctrl.shareDocument);
router.delete('/documents/:id', ctrl.deleteDocument);

module.exports = router;
