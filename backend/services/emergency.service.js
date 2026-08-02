// Crisis support.
//
// Two principles shape this file:
//
// 1. Nothing here depends on the network being up or the user being logged in
//    for long. Helplines are served as static data, not fetched from a third
//    party that could be down at the worst possible moment.
//
// 2. Numbers are region-aware but the list always falls back to something
//    usable. Showing a US number to someone in India during a crisis is worse
//    than showing a generic international line.

const { readStore, writeStore } = require('../utils/fileStore.utils');
const { v4: uuidv4 } = require('uuid');

const HELPLINES = {
  IN: [
    { name: 'Tele-MANAS', number: '14416', detail: "India's national 24/7 mental health helpline", hours: '24/7', languages: '20+ languages', tag: 'primary' },
    { name: 'AASRA', number: '+91-9820466726', detail: 'Suicide prevention and emotional support', hours: '24/7' },
    { name: 'Vandrevala Foundation', number: '+91-9999666555', detail: 'Free counselling and crisis intervention', hours: '24/7' },
    { name: 'iCall (TISS)', number: '+91-9152987821', detail: 'Counselling by trained mental health professionals', hours: 'Mon–Sat, 10am–8pm' },
    { name: 'Emergency services', number: '112', detail: 'Police, ambulance and fire', hours: '24/7', tag: 'emergency' },
  ],
  US: [
    { name: '988 Suicide & Crisis Lifeline', number: '988', detail: 'Call or text — free and confidential', hours: '24/7', tag: 'primary' },
    { name: 'Crisis Text Line', number: '741741', detail: 'Text HOME to reach a crisis counselor', hours: '24/7', textOnly: true },
    { name: 'Emergency services', number: '911', detail: 'Police, ambulance and fire', hours: '24/7', tag: 'emergency' },
  ],
  UK: [
    { name: 'Samaritans', number: '116 123', detail: 'Free, confidential, any time', hours: '24/7', tag: 'primary' },
    { name: 'SHOUT', number: '85258', detail: 'Text SHOUT for crisis support', hours: '24/7', textOnly: true },
    { name: 'Emergency services', number: '999', detail: 'Police, ambulance and fire', hours: '24/7', tag: 'emergency' },
  ],
  INTL: [
    { name: 'Find a helpline', number: 'findahelpline.com', detail: 'Verified crisis lines in over 130 countries', hours: '24/7', link: 'https://findahelpline.com', tag: 'primary' },
    { name: 'Befrienders Worldwide', number: 'befrienders.org', detail: 'Emotional support centres worldwide', hours: 'Varies', link: 'https://befrienders.org' },
  ],
};

/**
 * Grounding exercises, usable with no network and no reading stamina.
 *
 * Kept deliberately short. Someone in distress will not work through a
 * ten-step programme.
 */
const GROUNDING = [
  {
    id: '54321',
    title: '5-4-3-2-1',
    lead: 'Bring yourself back to the room',
    duration: '2 min',
    steps: [
      'Name 5 things you can see',
      'Name 4 things you can touch',
      'Name 3 things you can hear',
      'Name 2 things you can smell',
      'Name 1 thing you can taste',
    ],
  },
  {
    id: 'box',
    title: 'Box breathing',
    lead: 'Slow your breathing down',
    duration: '3 min',
    steps: [
      'Breathe in through your nose for 4 counts',
      'Hold for 4 counts',
      'Breathe out through your mouth for 4 counts',
      'Hold for 4 counts',
      'Repeat five times',
    ],
  },
  {
    id: 'anchor',
    title: 'Feet on the floor',
    lead: 'When everything feels far away',
    duration: '1 min',
    steps: [
      'Put both feet flat on the floor',
      'Press down and notice the ground holding you',
      'Say out loud where you are and what today is',
      'Name one thing you can do in the next hour',
    ],
  },
];

const regionFor = (raw) => {
  const key = String(raw || '').toUpperCase().trim();
  return HELPLINES[key] ? key : 'IN';
};

const getResources = (region) => {
  const key = regionFor(region);
  return {
    region: key,
    regionName: { IN: 'India', US: 'United States', UK: 'United Kingdom', INTL: 'International' }[key],
    available: Object.keys(HELPLINES),
    helplines: HELPLINES[key],
    international: HELPLINES.INTL,
    grounding: GROUNDING,
    // Said plainly, because the alternative is someone assuming otherwise.
    disclaimer: 'CounselConnect is not an emergency service and nobody monitors this app around the clock. If you are in immediate danger, call your local emergency number.',
  };
};

/* ── The user's own emergency contact ── */

const getContact = (userId) => {
  const u = readStore('users.json').find(x => x.id === userId);
  return u?.emergencyContact || null;
};

const saveContact = (userId, { name, relationship, phone, notifyOnCrisis }) => {
  const users = readStore('users.json');
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  const cleanName = String(name || '').trim();
  const digits = String(phone || '').replace(/\D/g, '');
  if (!cleanName) throw Object.assign(new Error('Give your contact a name'), { statusCode: 400 });
  if (digits.length < 7 || digits.length > 15) {
    throw Object.assign(new Error('Enter a valid phone number'), { statusCode: 400 });
  }

  users[idx].emergencyContact = {
    name: cleanName,
    relationship: String(relationship || '').trim(),
    phone: String(phone).trim(),
    notifyOnCrisis: !!notifyOnCrisis,
    updatedAt: new Date().toISOString(),
  };
  writeStore('users.json', users);
  return users[idx].emergencyContact;
};

const removeContact = (userId) => {
  const users = readStore('users.json');
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw Object.assign(new Error('Account not found'), { statusCode: 404 });
  delete users[idx].emergencyContact;
  writeStore('users.json', users);
};

/**
 * Records that someone opened crisis support.
 *
 * Deliberately minimal: what and when, never why. This exists so a counselor
 * can see that their client reached for help — a genuinely useful clinical
 * signal — not to build a profile of anyone's worst moments.
 */
const logUse = (userId, { action, counselorId }) => {
  const log = readStore('crisis-log.json');
  const entry = {
    id: uuidv4(),
    userId,
    action: String(action || 'opened').slice(0, 40),
    counselorId: counselorId || null,
    at: new Date().toISOString(),
  };
  log.push(entry);
  writeStore('crisis-log.json', log.slice(-500));
  return entry;
};

/** Crisis-support usage for a counselor's own clients, last 30 days. */
const recentForCounselor = (userIds) => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return readStore('crisis-log.json')
    .filter(e => userIds.has(e.userId))
    .filter(e => new Date(e.at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
};

module.exports = {
  getResources, getContact, saveContact, removeContact,
  logUse, recentForCounselor, HELPLINES, GROUNDING,
};
