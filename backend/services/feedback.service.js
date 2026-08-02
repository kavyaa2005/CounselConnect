// Client-submitted feedback: ratings and reviews for a counselor after a session.
//
// This is the missing write side of a loop that already existed — the doctor's
// Feedback page and the admin's Feedback page both read `feedback.json`, but
// nothing was creating entries.

const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');
const rel = require('./relationship.service');

const STORE = 'feedback.json';

const userName = (userId) => {
  const u = readStore('users.json').find(x => x.id === userId);
  return u ? (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email) : 'Anonymous';
};

const counselorName = (counselorId) => {
  const d = readStore('doctors.json').find(x => x.counselorId === counselorId);
  return d ? d.name : 'Unknown counselor';
};

/** Sessions the user can review: completed, and not already reviewed. */
const getReviewable = (userId) => {
  const existing = readStore(STORE).filter(f => f.userId === userId);
  const reviewedAppointments = new Set(existing.map(f => f.appointmentId).filter(Boolean));

  return readStore('appointments.json')
    .filter(a => a.userId === userId)
    .filter(a => String(a.status).toLowerCase() === 'completed')
    .filter(a => !reviewedAppointments.has(a.id))
    .sort((a, b) => new Date(b.dateTime || b.createdAt) - new Date(a.dateTime || a.createdAt))
    .map(a => ({
      appointmentId: a.id,
      counselorId: a.counselorId,
      counselorName: a.counselorName || counselorName(a.counselorId),
      counselorAvatar: a.counselorAvatar || '',
      sessionType: a.sessionType,
      date: a.date,
      time: a.time,
    }));
};

const decorate = (f) => ({
  ...f,
  dateLabel: new Date(f.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }),
  counselorName: f.counselorName || counselorName(f.counselorId),
});

/** Everything this user has already submitted. */
const getMyFeedback = (userId) =>
  readStore(STORE)
    .filter(f => f.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(decorate);

const submit = (userId, { counselorId, appointmentId, rating, comment, anonymous }) => {
  const score = Number(rating);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    throw Object.assign(new Error('Please give a rating between 1 and 5 stars'), { statusCode: 400 });
  }
  if (!counselorId) {
    throw Object.assign(new Error('A counselor is required'), { statusCode: 400 });
  }

  // You may only review a counselor you actually worked with
  if (!rel.counselorIdsForUser(userId).has(counselorId)) {
    throw Object.assign(new Error('You can only review a counselor you have worked with'), { statusCode: 403 });
  }

  const all = readStore(STORE);

  if (appointmentId) {
    const appt = readStore('appointments.json').find(a => a.id === appointmentId && a.userId === userId);
    if (!appt) {
      throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    }
    if (all.some(f => f.appointmentId === appointmentId && f.userId === userId)) {
      throw Object.assign(new Error("You've already reviewed this session"), { statusCode: 409 });
    }
  }

  const now = new Date().toISOString();
  const entry = {
    id: uuidv4(),
    userId,
    appointmentId: appointmentId || null,
    counselorId,
    counselorName: counselorName(counselorId),
    // Anonymous reviews still record userId internally so a person can't
    // review the same session twice — only the displayed name is hidden.
    patientName: anonymous ? 'Anonymous' : userName(userId),
    anonymous: !!anonymous,
    rating: score,
    comment: String(comment || '').trim(),
    date: now.slice(0, 10),
    status: 'Open',
    flagged: false,
    replies: [],
    createdAt: now,
  };

  all.push(entry);
  writeStore(STORE, all);

  refreshCounselorRating(counselorId);
  return decorate(entry);
};

/** Keep the counselor's headline rating in step with their reviews. */
const refreshCounselorRating = (counselorId) => {
  const reviews = readStore(STORE).filter(f => f.counselorId === counselorId);
  if (!reviews.length) return;

  const avg = reviews.reduce((s, f) => s + (Number(f.rating) || 0), 0) / reviews.length;
  const doctors = readStore('doctors.json');
  const idx = doctors.findIndex(d => d.counselorId === counselorId);
  if (idx === -1) return;

  doctors[idx].rating = Math.round(avg * 10) / 10;
  doctors[idx].updatedAt = new Date().toISOString();
  writeStore('doctors.json', doctors);
};

/** Public rating summary for a counselor, used on their profile. */
const getCounselorRating = (counselorId) => {
  const reviews = readStore(STORE).filter(f => f.counselorId === counselorId);
  const total = reviews.length;
  const avg = total ? Math.round((reviews.reduce((s, f) => s + f.rating, 0) / total) * 10) / 10 : 0;
  return {
    average: avg,
    total,
    distribution: [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
    })),
    recent: reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(r => ({
        name: r.anonymous ? 'Anonymous' : r.patientName,
        rating: r.rating,
        comment: r.comment,
        dateLabel: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      })),
  };
};

module.exports = { getReviewable, getMyFeedback, submit, getCounselorRating, refreshCounselorRating };
