const doctorService = require('../services/doctor.service');
const authService = require('../services/auth.service');
const { success } = require('../utils/response.utils');

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); } catch (err) { next(err); }
};

const wrapAsync = (fn) => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};

const getJournalOverview = wrap((req, res) =>
  success(res, { patients: doctorService.getJournalOverview(req.user.id) }));

const getPatientJournal = wrap((req, res) =>
  success(res, doctorService.getPatientJournal(req.user.id, req.params.id)));

/** Streams a branded PDF summary of everything the patient has shared. */
const downloadJournalPdf = wrap((req, res) => {
  const data = doctorService.getPatientJournal(req.user.id, req.params.id);
  const doctor = doctorService.getProfile(req.user.id);
  const { streamJournalSummary } = require('../services/pdf.service');

  streamJournalSummary(res, {
    patient: data.patient || { name: 'Patient' },
    doctor: { name: doctor.name, title: doctor.title || 'Counselor' },
    summary: data,
  });
});

const getSettings = wrap((req, res) =>
  success(res, { settings: doctorService.getSettings(req.user.id) }));

const updateSettings = wrap((req, res) =>
  success(res, { settings: doctorService.updateSettings(req.user.id, req.body) }, 'Settings saved'));

const changePassword = wrapAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, 'doctor', currentPassword, newPassword);
  return success(res, {}, 'Password changed successfully');
});

const getProfile = wrap((req, res) => success(res, { profile: doctorService.getProfile(req.user.id) }));
const updateProfile = wrap((req, res) => success(res, { profile: doctorService.updateProfile(req.user.id, req.body) }, 'Profile updated'));

const getPatients = wrap((req, res) => success(res, { patients: doctorService.getPatients(req.user.id) }));
const getPatientDetail = wrap((req, res) => success(res, { patient: doctorService.getPatientDetail(req.user.id, req.params.id) }));

/**
 * Patient list as a PDF.
 *
 * `ids` narrows the export to exactly what the counselor has on screen after
 * searching and filtering — but it is intersected with their own caseload, so
 * passing someone else's patient id can't widen access.
 */
const exportPatients = wrap((req, res) => {
  const profile = doctorService.getProfile(req.user.id);
  const all = doctorService.getPatients(req.user.id);

  const wanted = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
  const chosen = wanted.length ? all.filter(p => wanted.includes(p.id)) : all;

  const risk = (avg) => (avg == null ? 'medium' : avg >= 6.5 ? 'low' : avg >= 4 ? 'medium' : 'high');
  const rows = chosen.map(p => ({
    name: p.name,
    email: p.email,
    issue: p.reason || 'General wellbeing',
    sessions: p.appointmentCount,
    lastSeen: p.lastMood?.createdAt
      ? new Date(p.lastMood.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
    next: p.upcomingAppointment ? `${p.upcomingAppointment.date}, ${p.upcomingAppointment.time}` : 'Not scheduled',
    risk: risk(p.avgMood),
  }));

  const { streamPatientList } = require('../services/pdf.service');
  return streamPatientList(res, {
    doctor: { name: profile.name, title: profile.specialty || 'Counselor' },
    patients: rows,
  });
});

const getAppointments = wrap((req, res) => success(res, { appointments: doctorService.getAppointments(req.user.id) }));
const updateAppointment = wrap((req, res) => success(res, { appointment: doctorService.updateAppointment(req.user.id, req.params.id, req.body) }, 'Appointment updated'));

const getAvailability = wrap((req, res) => success(res, { availability: doctorService.getAvailability(req.user.id) }));
const updateAvailability = wrap((req, res) => success(res, { availability: doctorService.updateAvailability(req.user.id, req.body) }, 'Availability updated'));

const getNotes = wrap((req, res) => success(res, { notes: doctorService.getNotes(req.user.id) }));
const createNote = wrap((req, res) => success(res, { note: doctorService.createNote(req.user.id, req.body) }, 'Note created', 201));
const updateNote = wrap((req, res) => success(res, { note: doctorService.updateNote(req.user.id, req.params.id, req.body) }, 'Note updated'));
const deleteNote = wrap((req, res) => { doctorService.deleteNote(req.user.id, req.params.id); return success(res, {}, 'Note deleted'); });

const getConversations = wrap((req, res) => success(res, { conversations: doctorService.getConversations(req.user.id) }));
const getMessages = wrap((req, res) => success(res, { messages: doctorService.getDoctorMessages(req.user.id, req.params.userId) }));
const sendMessage = wrap((req, res) => success(res, { message: doctorService.sendDoctorMessage(req.user.id, req.params.userId, req.body.text) }, 'Message sent', 201));

const getDashboardStats = wrap((req, res) => success(res, { stats: doctorService.getDashboardStats(req.user.id) }));
const getAnalytics = wrap((req, res) => success(res, { analytics: doctorService.getAnalytics(req.user.id) }));
const getNotifications = wrap((req, res) => success(res, { notifications: doctorService.getNotifications(req.user.id) }));
const getBadges = wrap((req, res) => success(res, doctorService.getBadgeCounts(req.user.id)));
const getFeedback = wrap((req, res) => success(res, doctorService.getFeedback(req.user.id)));

const getLogins = wrap((req, res) => success(res, { logins: doctorService.getLogins(req.user.id) }));

const getDocuments = wrap((req, res) => success(res, { documents: doctorService.getDocuments(req.user.id) }));
const createDocument = wrap((req, res) => success(res, { document: doctorService.createDocument(req.user.id, req.body) }, 'Document added', 201));
const deleteDocument = wrap((req, res) => { doctorService.deleteDocument(req.user.id, req.params.id); return success(res, {}, 'Document deleted'); });

/* ── Appointments: doctor-side scheduling + summary export ────────── */

const createAppointment = wrap((req, res) =>
  success(res, { appointment: doctorService.createAppointment(req.user.id, req.body) },
    'Session scheduled', 201));

/** Session summary PDF for one appointment. */
const downloadAppointmentSummary = wrap((req, res) => {
  const data = doctorService.getAppointmentSummary(req.user.id, req.params.id);
  const { streamAppointmentSummary } = require('../services/pdf.service');
  streamAppointmentSummary(res, data);
});

/* ── Reports ──────────────────────────────────────────────────────── */

const getReports = wrap((req, res) =>
  success(res, doctorService.getReportData(req.user.id)));

/**
 * Exports the practice report.
 *
 * `format` picks the renderer: a branded PDF, or CSV (which Excel opens
 * natively, so the Excel button shares this path with a .csv extension).
 */
const exportReport = wrap((req, res) => {
  const data = doctorService.getReportData(req.user.id);
  const format = String(req.query.format || 'pdf').toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = String(data.doctor.name || 'practice').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  if (format === 'pdf') {
    const { streamPracticeReport } = require('../services/pdf.service');
    return streamPracticeReport(res, { ...data, period: req.query.period });
  }

  // ── CSV / Excel ──
  // Quote every field and double any embedded quotes, so names with commas
  // (and Excel's habit of eating leading zeros) can't corrupt the columns.
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const row = (cells) => cells.map(esc).join(',');
  const lines = [];

  lines.push(row([`CounselConnect practice report — ${data.doctor.name}`]));
  lines.push(row([`Generated ${new Date().toISOString()}`]));
  lines.push('');

  lines.push(row(['Key figures']));
  lines.push(row(['Metric', 'Value']));
  const t = data.totals || {};
  [['Total patients', t.totalPatients ?? 0],
   ['Total sessions', t.totalAppointments ?? 0],
   ['Average rating', t.avgRating ?? ''],
   ['Reviews', t.reviewCount ?? 0],
   ['Average mood (/10)', t.avgMood ?? ''],
   ['Revenue this month', t.monthlyRevenue ?? 0]].forEach(r => lines.push(row(r)));
  lines.push('');

  if (data.revenue?.length) {
    lines.push(row(['Revenue by month']));
    lines.push(row(['Month', 'Revenue']));
    data.revenue.forEach(r => lines.push(row([r.month, r.revenue])));
    lines.push('');
  }

  if (data.moodTrend?.length) {
    lines.push(row(['Average patient mood by month']));
    lines.push(row(['Month', 'Average mood (/10)']));
    data.moodTrend.forEach(m => lines.push(row([m.month, m.avg ?? ''])));
    lines.push('');
  }

  if (data.feedback?.distribution?.length) {
    lines.push(row(['Rating distribution']));
    lines.push(row(['Stars', 'Count']));
    data.feedback.distribution.forEach(d => lines.push(row([d.star, d.count])));
    lines.push('');
  }

  lines.push(row(['Patients']));
  lines.push(row(['Name', 'Email', 'Focus', 'Sessions booked', 'Completed', 'Average mood (/10)', 'Mood entries']));
  data.patients.forEach(p => lines.push(row([p.name, p.email, p.reason, p.sessions, p.completed, p.avgMood ?? '', p.moodCount])));
  lines.push('');

  lines.push(row(['Sessions']));
  lines.push(row(['Date', 'Time', 'Patient', 'Type', 'Status', 'Price']));
  data.appointments.forEach(a =>
    lines.push(row([a.date, a.time, a.patient?.name || '', a.sessionType, a.status, a.price])));

  // BOM so Excel detects UTF-8 rather than mangling accented names.
  const csv = '﻿' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="practice-report-${slug}-${stamp}.csv"`);
  res.send(csv);
});

/* ── Notes: export + AI summary ───────────────────────────────────── */

const downloadNotePdf = wrap((req, res) => {
  const data = doctorService.getNoteForExport(req.user.id, req.params.id);
  const { streamNote } = require('../services/pdf.service');
  streamNote(res, data);
});

/** Drafts a SOAP-shaped note from the patient's record, for the doctor to edit. */
const draftNote = wrap((req, res) =>
  success(res, { draft: doctorService.draftNote(req.user.id, req.body.patientId) }));

const summariseNote = wrap((req, res) =>
  success(res, { note: doctorService.summariseNote(req.user.id, req.params.id) }, 'Summary generated'));

/* ── AI assistant ─────────────────────────────────────────────────── */

const askAssistant = wrap((req, res) =>
  success(res, doctorService.askAssistant(req.user.id, req.body.question, req.body.patientId)));

/* ── Notifications ────────────────────────────────────────────────── */

const markNotificationsRead = wrap((req, res) =>
  success(res, doctorService.markNotificationsRead(req.user.id, req.body.ids), 'Marked as read'));

/* ── Feedback replies ─────────────────────────────────────────────── */

const replyToFeedback = wrap((req, res) =>
  success(res, { feedback: doctorService.replyToFeedback(req.user.id, req.params.id, req.body.reply) },
    'Reply posted'));

/* ── Documents: real file upload / download ───────────────────────── */

const uploadDocument = wrap((req, res) => {
  if (!req.file) {
    throw Object.assign(new Error('No file was uploaded'), { statusCode: 400 });
  }
  // 'true' arrives as a string from multipart form data
  const shared = req.body.sharedWithPatient === 'true' || req.body.sharedWithPatient === true;
  const doc = doctorService.createDocument(req.user.id, {
    name: req.file.originalname,
    type: req.body.type || 'file',
    patientId: req.body.patientId || null,
    sharedWithPatient: shared,
    note: req.body.note,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    bytes: req.file.size,
  });
  success(res, { document: doc }, shared ? 'Shared with your patient' : 'Document uploaded', 201);
});

const shareDocument = wrap((req, res) =>
  success(res, { document: doctorService.setDocumentShared(req.user.id, req.params.id, req.body.shared) },
    req.body.shared ? 'Shared with your patient' : 'No longer shared'));

const patientDocuments = wrap((req, res) =>
  success(res, { documents: doctorService.getPatientDocuments(req.user.id, req.params.id) }));

const downloadDocument = wrap((req, res) => {
  const path = require('path');
  const fs = require('fs');
  const doc = doctorService.getDocument(req.user.id, req.params.id);
  if (!doc.storedName) {
    throw Object.assign(new Error('This entry has no file attached'), { statusCode: 404 });
  }
  const { DOC_DIR } = require('../services/doctor.service.paths');
  const full = path.join(DOC_DIR, doc.storedName);
  if (!fs.existsSync(full)) {
    throw Object.assign(new Error('The stored file is missing'), { statusCode: 404 });
  }
  // inline=preview in a new tab, attachment=save to disk
  const disposition = req.query.inline === '1' ? 'inline' : 'attachment';

  // HTTP headers are latin-1 only, so a name like "CBT Worksheet — Thought
  // Records" (em-dash) throws ERR_INVALID_CHAR. Send an ASCII-safe fallback
  // plus an RFC 5987 filename* so modern browsers still get the real name.
  const ascii = doc.name.replace(/[^\x20-\x7E]/g, '-').replace(/["\\]/g, '');
  const encoded = encodeURIComponent(doc.name);

  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`
  );
  fs.createReadStream(full).pipe(res);
});


/* ── Approval workflow ────────────────────────────────────────────── */

const getPendingRequests = wrap((req, res) =>
  success(res, { requests: doctorService.getPendingRequests(req.user.id) }));

const acceptAppointment = wrap((req, res) =>
  success(res, { appointment: doctorService.updateAppointment(req.user.id, req.params.id, { status: 'confirmed' }) },
    'Session confirmed'));

const rejectAppointment = wrap((req, res) =>
  success(res, { appointment: doctorService.updateAppointment(req.user.id, req.params.id, { status: 'rejected', reason: req.body.reason }) },
    'Request declined'));

/* ── AI session summary ───────────────────────────────────────────── */

const summariseSession = wrap((req, res) =>
  success(res, { summary: doctorService.summariseSession(req.user.id, req.params.id) },
    'Session summary generated'));

const toggleSessionAction = wrap((req, res) =>
  success(res, { summary: doctorService.toggleSessionAction(req.user.id, req.params.id, Number(req.params.index)) }));

/* ── Reports: daily ───────────────────────────────────────────────── */

const getDaily = wrap((req, res) =>
  success(res, { daily: doctorService.getDailyBreakdown(req.user.id, Math.min(60, Number(req.query.days) || 14)) }));

/* ── Profile photo ────────────────────────────────────────────────── */

const uploadProfilePhoto = wrap((req, res) => {
  if (!req.file) throw Object.assign(new Error('No image was uploaded'), { statusCode: 400 });
  success(res, { profile: doctorService.setProfilePhoto(req.user.id, req.file.filename) }, 'Photo updated');
});

module.exports = {
  getProfile, updateProfile, getLogins,
  getSettings, updateSettings, changePassword,
  getJournalOverview, getPatientJournal, downloadJournalPdf,
  getPatients, getPatientDetail, exportPatients,
  getAppointments, updateAppointment,
  getAvailability, updateAvailability,
  getNotes, createNote, updateNote, deleteNote,
  getConversations, getMessages, sendMessage,
  getDashboardStats, getAnalytics, getNotifications, getFeedback,
  getDocuments, createDocument, deleteDocument, uploadDocument, downloadDocument,
  shareDocument, patientDocuments,
  createAppointment, downloadAppointmentSummary,
  getReports, exportReport,
  downloadNotePdf, summariseNote, draftNote,
  askAssistant, markNotificationsRead, replyToFeedback, getBadges,
  getPendingRequests, acceptAppointment, rejectAppointment,
  summariseSession, toggleSessionAction, getDaily, uploadProfilePhoto,
};
