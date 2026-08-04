// One place that decides when a counselor is bookable.
//
// Before this existed, three things disagreed:
//   • the doctor's Availability page wrote to availability.json
//   • the client-facing slot generator read `doctor.availability`, which is the
//     seed STRING 'Mon–Fri' — so the schedule a counselor edited had no effect
//     whatsoever on what clients could book
//   • vacation mode, break time and auto-reject were persisted but never read
//     by anything at all
//
// Both the slot generator and the booking guard now come through here.

const { readStore, readStoreObj } = require('../utils/fileStore.utils');
const { DEFAULT_AVAILABILITY } = require('./availability.defaults');

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DEFAULT_SETTINGS = {
  vacationMode: false,
  vacationFrom: '',
  vacationTo: '',
  breakStart: '',
  breakEnd: '',
  autoReject: false,
};

/** Minutes past midnight for "HH:MM". */
const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

/** YYYY-MM-DD in the server's local zone. Never toISOString — that shifts the
 *  day for any timezone ahead of UTC. */
const localKey = (d) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

/** The doctor record behind a counselor card. */
const doctorFor = (counselorId) =>
  readStore('doctors.json').find(d => d.counselorId === counselorId) || null;

/** Raw stored record: the seven days plus a `settings` object. */
const rawRecord = (doctorId) => {
  if (!doctorId) return {};
  const store = readStoreObj('availability.json');
  return store[doctorId] || {};
};

/** The seven-day schedule, defaults filled in for anything unset. */
const scheduleFor = (doctorId) => {
  const rec = rawRecord(doctorId);
  const out = {};
  DAY_KEYS.forEach(k => {
    const day = rec[k];
    out[k] = day && typeof day === 'object'
      ? { enabled: !!day.enabled, slots: Array.isArray(day.slots) ? day.slots : [] }
      : DEFAULT_AVAILABILITY[k];
  });
  return out;
};

const settingsFor = (doctorId) => ({ ...DEFAULT_SETTINGS, ...(rawRecord(doctorId).settings || {}) });

/**
 * Is `date` inside the counselor's declared vacation?
 *
 * Vacation mode with no dates means "closed until further notice" — that's the
 * honest reading of a toggle switched on with the range left blank.
 */
const onVacation = (settings, date) => {
  if (!settings.vacationMode) return false;
  const key = localKey(date);
  const { vacationFrom: from, vacationTo: to } = settings;
  if (!from && !to) return true;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
};

/** Does [start,end) minute range collide with the counselor's break? */
const inBreak = (settings, startMin, endMin) => {
  if (!settings.breakStart || !settings.breakEnd) return false;
  const bs = toMinutes(settings.breakStart);
  const be = toMinutes(settings.breakEnd);
  if (be <= bs) return false;
  return startMin < be && endMin > bs;
};

/**
 * Can this exact moment be booked?
 *
 * @returns {{ ok: boolean, reason?: string }} reason is client-facing prose.
 */
const checkBookable = (counselorId, when, slotMinutes = 60) => {
  const doctor = doctorFor(counselorId);
  if (!doctor) return { ok: true }; // nothing to enforce against

  const settings = settingsFor(doctor.id);

  if (onVacation(settings, when)) {
    const range = settings.vacationFrom && settings.vacationTo
      ? ` (${settings.vacationFrom} to ${settings.vacationTo})`
      : '';
    return { ok: false, reason: `Your counselor is away${range} and is not taking sessions then.` };
  }

  const schedule = scheduleFor(doctor.id);
  const rule = schedule[DAY_KEYS[when.getDay()]];
  if (!rule || rule.enabled === false || !(rule.slots || []).length) {
    return { ok: false, reason: 'Your counselor does not work on that day.' };
  }

  const startMin = when.getHours() * 60 + when.getMinutes();
  const endMin = startMin + slotMinutes;

  const insideAWindow = (rule.slots || []).some(({ start, end }) =>
    startMin >= toMinutes(start) && endMin <= toMinutes(end));
  if (!insideAWindow) {
    return { ok: false, reason: 'That time falls outside your counselor\'s working hours.' };
  }

  if (inBreak(settings, startMin, endMin)) {
    return { ok: false, reason: `That time overlaps your counselor's ${settings.breakStart}–${settings.breakEnd} break.` };
  }

  return { ok: true };
};

module.exports = {
  DAY_KEYS,
  toMinutes,
  localKey,
  doctorFor,
  scheduleFor,
  settingsFor,
  onVacation,
  inBreak,
  checkBookable,
};
