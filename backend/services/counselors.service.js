const { readStore } = require('../utils/fileStore.utils');
const { DEFAULT_AVAILABILITY } = require('./availability.defaults');

// Counselor cards are derived from real doctor accounts (doctors.json).
// This keeps the user panel and the doctor panel in sync — every counselor
// a user sees is a real doctor who can log in to the doctor portal.
const toCounselorCard = (d) => ({
  id: d.counselorId,
  name: d.name,
  specialty: d.specialty || '',
  rating: d.rating || 0,
  sessions: d.sessions || 0,
  experience: d.experience || '',
  languages: d.languages || [],
  available: d.available !== false,
  price: d.price || 0,
  image: d.image || d.avatar || '',
  bio: d.bio || '',
  approach: d.approach || '',
  badge: d.badge || null,
  // Free-text like "8 years" — parsed once here so sorting is numeric.
  experienceYears: parseInt(String(d.experience || '').replace(/\D/g, ''), 10) || 0,
  location: d.location || '',
  qualification: d.qualification || '',
});

const getAllCounselors = () => readStore('doctors.json').map(toCounselorCard);

const SORTS = {
  rating:     (a, b) => b.rating - a.rating,
  'fee-low':  (a, b) => a.price - b.price,
  'fee-high': (a, b) => b.price - a.price,
  experience: (a, b) => b.experienceYears - a.experienceYears,
  sessions:   (a, b) => b.sessions - a.sessions,
  name:       (a, b) => a.name.localeCompare(b.name),
};

const getCounselors = ({ search = '', specialty = 'All', sort = 'rating' } = {}) => {
  let result = getAllCounselors();

  if (specialty && specialty !== 'All') {
    result = result.filter(c =>
      c.specialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.specialty.toLowerCase().includes(q) ||
      c.bio.toLowerCase().includes(q)
    );
  }

  // Available counselors always float above busy ones, then the chosen sort.
  const cmp = SORTS[sort] || SORTS.rating;
  result.sort((a, b) => (a.available === b.available ? cmp(a, b) : a.available ? -1 : 1));

  return result;
};

/** Reviews left for this counselor, newest first, with the rating breakdown. */
const getCounselorReviews = (counselorId) => {
  const reviews = readStore('feedback.json')
    .filter(f => f.counselorId === counselorId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(f => ({
      id: f.id,
      patientName: f.patientName,
      rating: f.rating,
      comment: f.comment,
      reply: f.reply || null,
      replyBy: f.replyBy || null,
      createdAt: f.createdAt,
      date: new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  return {
    reviews,
    total: reviews.length,
    avg,
    distribution: [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
    })),
  };
};

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SLOT_MINUTES = 60;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
/** YYYY-MM-DD in the server's local zone. */
const localKey = (d) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const toLabel = (mins) => {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Real bookable slots for the next `days` days.
 *
 * Built from the counselor's own availability schedule (the same record the
 * doctor edits on their Availability page), minus anything already booked,
 * minus slots already in the past. Previously the UI only showed an
 * Available/Busy badge and the time was free text.
 */
const getCounselorSlots = (counselorId, days = 14) => {
  const doctor = readStore('doctors.json').find(d => d.counselorId === counselorId);
  if (!doctor) throw Object.assign(new Error('Counselor not found'), { statusCode: 404 });

  const availability = { ...DEFAULT_AVAILABILITY, ...(doctor.availability || {}) };

  const taken = new Set(
    readStore('appointments.json')
      .filter(a => a.counselorId === counselorId && a.status !== 'cancelled')
      .map(a => new Date(a.dateTime).getTime())
  );

  const out = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const rule = availability[DAY_KEYS[day.getDay()]];
    if (!rule || rule.enabled === false) continue;

    const slots = [];
    (rule.slots || []).forEach(({ start, end }) => {
      for (let m = toMinutes(start); m + SLOT_MINUTES <= toMinutes(end); m += SLOT_MINUTES) {
        const at = new Date(day);
        at.setHours(Math.floor(m / 60), m % 60, 0, 0);
        // Skip anything already gone, and anything already booked
        if (at <= now) continue;
        slots.push({
          time: toLabel(m),
          iso: at.toISOString(),
          booked: taken.has(at.getTime()),
        });
      }
    });

    if (slots.length) {
      out.push({
        date: day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        dayLabel: day.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: day.getDate(),
        // Local date key, NOT toISOString(): for any timezone ahead of UTC
        // that returns the PREVIOUS day, so the client looked up the wrong
        // bucket and saw times that had already passed.
        iso: localKey(day),
        slots,
        openCount: slots.filter(s => !s.booked).length,
      });
    }
  }
  return out;
};

const getCounselorById = (id) => {
  const c = getAllCounselors().find(c => c.id === id);
  if (!c) throw Object.assign(new Error('Counselor not found'), { statusCode: 404 });
  // The profile card carries its own reviews so the modal needs one request
  return { ...c, ...getCounselorReviews(id) };
};

module.exports = {
  getCounselors, getCounselorById, getAllCounselors,
  getCounselorReviews, getCounselorSlots,
};
