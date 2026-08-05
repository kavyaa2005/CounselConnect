const svc = require('../services/admin.service');
const authService = require('../services/auth.service');
const videoService = require('../services/video.service');
const { success } = require('../utils/response.utils');

// Small wrapper so each handler stays a one-liner
const h = (fn) => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};

/* dashboard / analytics */
const dashboard = h((req, res) => success(res, svc.getDashboard()));
const analytics = h((req, res) => success(res, svc.getAnalytics()));
const reports   = h((req, res) => success(res, svc.getReports()));
const auditLog  = h((req, res) => success(res, { entries: svc.getAuditLog() }));

const downloadReport = h((req, res) => {
  const csv = svc.buildCsv(req.params.type);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-report.csv"`);
  res.send(csv);
});

/* users */
const listUsers   = h((req, res) => success(res, { users: svc.listUsers() }));
const getUser     = h((req, res) => success(res, { user: svc.getUserDetail(req.params.id) }));
const createUser  = h(async (req, res) => success(res, { user: await svc.createUser(req.body) }, 'User created', 201));
const updateUser  = h((req, res) => success(res, { user: svc.updateUser(req.params.id, req.body) }, 'User updated'));
const deleteUser  = h((req, res) => { svc.deleteUser(req.params.id); return success(res, {}, 'User deleted'); });

/* counselors */
const listCounselors  = h((req, res) => success(res, { counselors: svc.listCounselors() }));
const getCounselor    = h((req, res) => success(res, { counselor: svc.getCounselorDetail(req.params.id) }));
const createCounselor = h(async (req, res) => success(res, { counselor: await svc.createCounselor(req.body) }, 'Counselor created', 201));
const updateCounselor = h((req, res) => success(res, { counselor: svc.updateCounselor(req.params.id, req.body) }, 'Counselor updated'));
const deleteCounselor = h((req, res) => { svc.deleteCounselor(req.params.id); return success(res, {}, 'Counselor deleted'); });

/* appointments & sessions */
const listAppointments  = h((req, res) => success(res, { appointments: svc.listAppointments() }));
const updateAppointment = h((req, res) => success(res, { appointment: svc.updateAppointment(req.params.id, req.body) }, 'Appointment updated'));
const deleteAppointment = h((req, res) => { svc.deleteAppointment(req.params.id); return success(res, {}, 'Appointment deleted'); });
const listSessions      = h((req, res) => success(res, svc.listSessions()));

/* video calls */
const listCalls = h((req, res) => success(res, {
  calls: videoService.getAllCalls(),
  stats: videoService.getStats(),
}));

/* counselor applications */
const applicationsService = require('../services/applications.service');

const listApplications = h((req, res) => success(res, {
  applications: applicationsService.list(req.query.status),
  counts: applicationsService.counts(),
}));

const getApplication = h((req, res) =>
  success(res, { application: applicationsService.getDetail(req.params.id) }));

/**
 * Certificates are never statically served — they're streamed here so only an
 * authenticated admin can ever read an applicant's credentials.
 */
const getApplicationDocument = h((req, res) => {
  const { absolutePath, doc } = applicationsService.getDocumentPath(req.params.id, req.params.docId);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  // inline so the admin can preview PDFs/images without downloading first
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
  res.sendFile(absolutePath);
});

const approveApplication = h((req, res) => {
  const result = applicationsService.approve(req.params.id, req.user.id, req.body?.note || '');
  return success(res, result, `${result.doctor.name} approved and can now sign in`);
});

const rejectApplication = h((req, res) => {
  const application = applicationsService.reject(req.params.id, req.user.id, req.body?.note || '');
  return success(res, { application }, 'Application rejected');
});


/* feedback */
const listFeedback  = h((req, res) => success(res, svc.listFeedback()));
const updateFeedback = h((req, res) => { svc.updateFeedback(req.params.id, req.body); return success(res, {}, 'Feedback updated'); });
const deleteFeedback = h((req, res) => { svc.deleteFeedback(req.params.id); return success(res, {}, 'Feedback deleted'); });

/* payments */
const listPayments = h((req, res) => success(res, svc.listPayments()));

/* notifications */
const listNotifications  = h((req, res) => success(res, { notifications: svc.listNotifications() }));
const createNotification = h((req, res) => {
  const n = svc.createNotification(req.body);
  return success(res, { notification: n },
    n.scheduledFor ? 'Notification scheduled' : 'Notification sent', 201);
});
const readNotification   = h((req, res) => { svc.markNotificationRead(req.params.id); return success(res, {}, 'Marked as read'); });
const deleteNotification = h((req, res) => { svc.deleteNotification(req.params.id); return success(res, {}, 'Notification deleted'); });

/* settings & profile */
const getSettings    = h((req, res) => success(res, { settings: svc.getSettings() }));
const updateSettings = h((req, res) => success(res, { settings: svc.updateSettings(req.body) }, 'Settings saved'));

const getProfile = h((req, res) =>
  success(res, { profile: authService.getUserById(req.user.id, 'admin') }));

const updateProfile = h((req, res) =>
  success(res, { profile: authService.updateAdminProfile(req.user.id, req.body) }, 'Profile updated'));

const changePassword = h(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, 'admin', currentPassword, newPassword);
  return success(res, {}, 'Password changed successfully');
});

module.exports = {
  dashboard, analytics, reports, auditLog, downloadReport,
  listUsers, getUser, createUser, updateUser, deleteUser,
  listCounselors, getCounselor, createCounselor, updateCounselor, deleteCounselor,
  listAppointments, updateAppointment, deleteAppointment, listSessions, listCalls,
  listApplications, getApplication, getApplicationDocument, approveApplication, rejectApplication,
  listFeedback, updateFeedback, deleteFeedback,
  listPayments,
  listNotifications, createNotification, readNotification, deleteNotification,
  getSettings, updateSettings, getProfile, updateProfile, changePassword,
};
