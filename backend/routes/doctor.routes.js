const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/doctor.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// All doctor routes require an authenticated doctor
router.use(authenticate, requireRole('doctor'));

// Dashboard / analytics / notifications
router.get('/dashboard', ctrl.getDashboardStats);
router.get('/analytics', ctrl.getAnalytics);
router.get('/notifications', ctrl.getNotifications);
router.get('/feedback', ctrl.getFeedback);

// Profile
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);

// Patients
router.get('/patients', ctrl.getPatients);
router.get('/patients/:id', ctrl.getPatientDetail);

// Appointments
router.get('/appointments', ctrl.getAppointments);
router.put('/appointments/:id', ctrl.updateAppointment);

// Availability
router.get('/availability', ctrl.getAvailability);
router.put('/availability', ctrl.updateAvailability);

// Counseling notes
router.get('/notes', ctrl.getNotes);
router.post('/notes', ctrl.createNote);
router.put('/notes/:id', ctrl.updateNote);
router.delete('/notes/:id', ctrl.deleteNote);

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
router.delete('/documents/:id', ctrl.deleteDocument);

module.exports = router;
