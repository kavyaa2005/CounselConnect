const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// Every route below requires a valid token AND the admin role.
router.use(authenticate, requireRole('admin'));

/* overview */
router.get('/dashboard', ctrl.dashboard);
router.get('/analytics', ctrl.analytics);
router.get('/reports', ctrl.reports);
router.get('/reports/:type/download', ctrl.downloadReport);
router.get('/audit-log', ctrl.auditLog);

/* users */
router.get('/users', ctrl.listUsers);
router.post('/users', ctrl.createUser);
router.get('/users/:id', ctrl.getUser);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

/* counselor applications (credential review) */
router.get('/applications', ctrl.listApplications);
router.get('/applications/:id', ctrl.getApplication);
router.get('/applications/:id/documents/:docId', ctrl.getApplicationDocument);
router.put('/applications/:id/approve', ctrl.approveApplication);
router.put('/applications/:id/reject', ctrl.rejectApplication);

/* counselors */
router.get('/counselors', ctrl.listCounselors);
router.post('/counselors', ctrl.createCounselor);
router.get('/counselors/:id', ctrl.getCounselor);
router.put('/counselors/:id', ctrl.updateCounselor);
router.delete('/counselors/:id', ctrl.deleteCounselor);

/* appointments & sessions */
router.get('/appointments', ctrl.listAppointments);
router.put('/appointments/:id', ctrl.updateAppointment);
router.delete('/appointments/:id', ctrl.deleteAppointment);
router.get('/sessions', ctrl.listSessions);
router.get('/calls', ctrl.listCalls);

/* feedback */
router.get('/feedback', ctrl.listFeedback);
router.put('/feedback/:id', ctrl.updateFeedback);
router.delete('/feedback/:id', ctrl.deleteFeedback);

/* payments */
router.get('/payments', ctrl.listPayments);

/* notifications */
router.get('/notifications', ctrl.listNotifications);
router.post('/notifications', ctrl.createNotification);
router.put('/notifications/:id/read', ctrl.readNotification);
router.delete('/notifications/:id', ctrl.deleteNotification);

/* settings & profile */
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSettings);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/profile/password', ctrl.changePassword);

module.exports = router;
