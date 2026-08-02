/**
 * Seed script — guarantees a known set of demo logins for all three panels.
 *
 *   node seed.js
 *
 * Safe to re-run: it resets the demo accounts' passwords and creates any that
 * are missing. Existing user-generated data (moods, journals, appointments)
 * is never touched.
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('./utils/fileStore.utils');

const SALT_ROUNDS = 12;
const hash = (p) => bcrypt.hashSync(p, SALT_ROUNDS);

/* ─────────────── credentials ─────────────── */

const ADMIN_PASSWORD   = 'Admin@123';
const DOCTOR_PASSWORD  = 'Doctor@123';
const USER_PASSWORD    = 'User@123';

const ADMINS = [
  {
    id: 'a1',
    firstName: 'Farhan',
    lastName: 'Sargatha',
    name: 'Farhan Sargatha',
    email: 'admin@counselconnect.com',
    role: 'admin',
    title: 'Super Admin',
    phone: '+91 98765 43210',
    bio: 'Platform administrator for CounselConnect.',
    avatar: '',
    timezone: 'Asia/Kolkata',
    language: 'English',
  },
  {
    id: 'a2',
    firstName: 'Priya',
    lastName: 'Nair',
    name: 'Priya Nair',
    email: 'moderator@counselconnect.com',
    role: 'admin',
    title: 'Moderator',
    phone: '+91 98765 11111',
    bio: 'Reviews counselor applications and flagged conversations.',
    avatar: '',
    timezone: 'Asia/Kolkata',
    language: 'English',
  },
];

const DEMO_USERS = [
  { firstName: 'Farhan', lastName: '', email: 'farhan@gmail.com', location: 'Bengaluru, IN', gender: 'Male', age: 22 },
  { firstName: 'Asra',   lastName: '', email: 'asra@gmail.com',   location: 'Hyderabad, IN', gender: 'Female', age: 21 },
];

/* ─────────────── seeding ─────────────── */

function seedAdmins() {
  const admins = readStore('admins.json');
  const now = new Date().toISOString();

  ADMINS.forEach(a => {
    const idx = admins.findIndex(x => x.email.toLowerCase() === a.email.toLowerCase());
    const record = {
      ...a,
      passwordHash: hash(ADMIN_PASSWORD),
      status: 'Active',
      createdAt: idx === -1 ? now : admins[idx].createdAt,
      updatedAt: now,
    };
    if (idx === -1) admins.push(record);
    else admins[idx] = { ...admins[idx], ...record };
  });

  writeStore('admins.json', admins);
  console.log(`  admins    : ${admins.length} account(s) — password "${ADMIN_PASSWORD}"`);
}

function seedDoctors() {
  const doctors = readStore('doctors.json');
  const now = new Date().toISOString();

  doctors.forEach(d => {
    d.passwordHash = hash(DOCTOR_PASSWORD);
    d.role = 'doctor';
    if (!d.status) d.status = 'Verified';
    if (!d.availability) d.availability = 'Mon–Fri';
    if (!d.location) d.location = '—';
    if (!d.createdAt) d.createdAt = now;
    d.updatedAt = now;
  });

  writeStore('doctors.json', doctors);
  console.log(`  doctors   : ${doctors.length} account(s) — password "${DOCTOR_PASSWORD}"`);
}

function seedUsers() {
  const users = readStore('users.json');
  const now = new Date().toISOString();

  // Reset passwords on every existing user so the demo login always works
  users.forEach(u => {
    u.passwordHash = hash(USER_PASSWORD);
    if (!u.status) u.status = 'Active';
    if (!u.createdAt) u.createdAt = now;
    u.updatedAt = now;
  });

  DEMO_USERS.forEach(d => {
    if (users.some(u => u.email.toLowerCase() === d.email.toLowerCase())) return;
    users.push({
      id: uuidv4(),
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email.toLowerCase(),
      passwordHash: hash(USER_PASSWORD),
      phone: '',
      bio: '',
      avatar: '',
      location: d.location,
      gender: d.gender,
      age: d.age,
      status: 'Active',
      reason: '',
      sessionType: '',
      frequency: '',
      goals: [],
      notifications: { sessions: true, moodReminders: true, messages: true, aiInsights: false, newsletter: false },
      privacy: { shareProgress: false, anonymousData: true, profileVisible: true },
      createdAt: now,
      updatedAt: now,
    });
  });

  writeStore('users.json', users);
  console.log(`  users     : ${users.length} account(s) — password "${USER_PASSWORD}"`);
}

function ensureFile(name, empty) {
  const fs = require('fs');
  const p = path.join(__dirname, 'data', name);
  if (!fs.existsSync(p)) fs.writeFileSync(p, empty, 'utf8');
}

/**
 * Give every demo user at least one counselor.
 *
 * A user and counselor become "connected" by having an appointment or a
 * message thread — that connection is what gates video calling, so without
 * it the call screen would legitimately show an empty contact list.
 */
function seedRelationships() {
  const users = readStore('users.json');
  const doctors = readStore('doctors.json');
  const appointments = readStore('appointments.json');
  const messages = require('./utils/fileStore.utils').readStoreObj('messages.json');
  const { writeStoreObj } = require('./utils/fileStore.utils');

  // demo email → the counselors they should be connected to
  const pairs = {
    'farhan@gmail.com': ['c1', 'c2'],
    'asra@gmail.com':   ['c1', 'c3'],
  };

  let added = 0;
  const now = new Date();

  Object.entries(pairs).forEach(([email, counselorIds]) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return;

    counselorIds.forEach((counselorId, i) => {
      const doc = doctors.find(d => d.counselorId === counselorId);
      if (!doc) return;

      const alreadyLinked =
        appointments.some(a => a.userId === user.id && a.counselorId === counselorId) ||
        ((messages[user.id] || {})[counselorId] || []).length > 0;
      if (alreadyLinked) return;

      // A completed session a few days back
      const when = new Date(now.getTime() - (i + 2) * 86400000);
      when.setHours(10 + i, 0, 0, 0);

      appointments.push({
        id: uuidv4(),
        userId: user.id,
        counselorId,
        counselorName: doc.name,
        counselorAvatar: doc.image || '',
        sessionType: 'video',
        date: when.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        time: `${10 + i}:00 ${10 + i < 12 ? 'AM' : 'PM'}`,
        dateTime: when.toISOString(),
        duration: '50 min',
        price: doc.price || 70,
        status: 'completed',
        createdAt: when.toISOString(),
        updatedAt: when.toISOString(),
      });

      // Opening message from the counselor so the thread exists
      messages[user.id] = messages[user.id] || {};
      messages[user.id][counselorId] = messages[user.id][counselorId] || [];
      messages[user.id][counselorId].push({
        id: uuidv4(),
        text: `Hi ${user.firstName}, good to have you here. Let me know how you're feeling today.`,
        time: when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isMe: false,
        read: true,
        createdAt: when.toISOString(),
        readByDoctor: true,
      });

      added++;
    });
  });

  writeStore('appointments.json', appointments);
  writeStoreObj('messages.json', messages);
  console.log(`  links     : ${added} new user↔counselor connection(s)`);
}

/* ─────────────── run ─────────────── */

/**
 * Gives the seeded document rows a real file on disk.
 *
 * Without this the Documents page lists six entries whose Download button is
 * permanently disabled, which reads as broken. Each seed row gets a small
 * generated PDF so upload/preview/download can be exercised out of the box.
 */
function seedDocumentFiles() {
  const fs = require('fs');
  const path = require('path');
  const PDFDocument = require('pdfkit');
  const { DOC_DIR } = require('./services/doctor.service.paths');
  fs.mkdirSync(DOC_DIR, { recursive: true });

  const docs = readStore('documents.json');
  let made = 0;

  docs.forEach((d) => {
    if (d.storedName && fs.existsSync(path.join(DOC_DIR, d.storedName))) return;

    const storedName = `seed-${d.id}.pdf`;
    const full = path.join(DOC_DIR, storedName);

    const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 64, right: 64 } });
    const out = fs.createWriteStream(full);
    doc.pipe(out);

    doc.rect(0, 0, doc.page.width, 96).fill('#355C4D');
    doc.fillColor('#FFFFFF').fontSize(19).font('Helvetica-Bold').text('CounselConnect', 64, 34);
    doc.fontSize(10).font('Helvetica').fillColor('#C9DBD3').text(d.type.toUpperCase(), 64, 62);

    doc.fillColor('#2C3A34').fontSize(20).font('Helvetica-Bold').text(d.name, 64, 140);
    doc.moveDown(0.8);
    doc.fontSize(11).font('Helvetica').fillColor('#4A5A53').text(
      'This is a sample document included with the CounselConnect demo data so the ' +
      'Documents page can be tried end to end — preview it, download it, or delete it. ' +
      'Upload your own files with the button above or by dropping them onto the page.',
      { width: doc.page.width - 128, lineGap: 3 }
    );
    doc.moveDown(1.4);
    doc.fontSize(9).fillColor('#8A9A93')
      .text(`Category: ${d.type}   ·   Added ${new Date(d.uploadedAt).toDateString()}`);
    doc.end();

    d.storedName = storedName;
    d.mimeType = 'application/pdf';
    d.ext = 'pdf';
    made++;
  });

  if (made) {
    writeStore('documents.json', docs);
    console.log(`   ✓ generated ${made} sample document file${made === 1 ? '' : 's'}`);
  }
}

console.log('\n🌱 Seeding CounselConnect demo data...\n');

['admins.json', 'payments.json', 'platform-notifications.json', 'calls.json'].forEach(f => ensureFile(f, '[]'));
['settings.json'].forEach(f => ensureFile(f, '{}'));
['notifications.json'].forEach(f => ensureFile(f, '[]'));

seedAdmins();
seedDoctors();
seedUsers();
seedRelationships();
seedDocumentFiles();

const admins = readStore('admins.json');
const doctors = readStore('doctors.json');
const users = readStore('users.json');

console.log('\n─────────────────────── LOGIN CREDENTIALS ───────────────────────\n');
console.log('ADMIN PANEL  →  http://localhost:5173/admin');
admins.forEach(a => console.log(`   ${a.email.padEnd(38)} ${ADMIN_PASSWORD}`));
console.log('\nDOCTOR PANEL →  http://localhost:5173/doctor');
doctors.forEach(d => console.log(`   ${d.email.padEnd(38)} ${DOCTOR_PASSWORD}   (${d.name})`));
console.log('\nUSER PANEL   →  http://localhost:5173/dashboard');
users.forEach(u => console.log(`   ${u.email.padEnd(38)} ${USER_PASSWORD}   (${u.firstName || u.email})`));
console.log('\nAll three roles sign in at the same page: http://localhost:5173/login');
console.log('─────────────────────────────────────────────────────────────────\n');
