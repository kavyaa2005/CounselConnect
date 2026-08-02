// Counselor applications: a public intake form with credential uploads that an
// admin reviews before the applicant ever becomes a doctor account.

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/password.utils');
const { readStore, writeStore } = require('../utils/fileStore.utils');

const STORE = 'applications.json';

// Deliberately OUTSIDE `uploads/`, which is served statically at /uploads.
// Credentials are private documents — they must only ever be readable through
// the authenticated admin route, never by guessing a URL.
const CERT_DIR = path.join(__dirname, '../private/certificates');

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(w => !/^dr\.?$/i.test(w)).slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '').join('') || '?';

const COLORS = ['#5E8B7E', '#2D6A4F', '#D8A48F', '#42A5F5', '#F59E0B', '#8B5CF6'];
const colorFor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
};

const fmtBytes = (b) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const publicView = (a) => ({
  ...a,
  initials: initials(a.fullName),
  color: colorFor(a.id),
  submittedLabel: new Date(a.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }),
  documents: (a.documents || []).map(d => ({
    ...d,
    sizeLabel: fmtBytes(d.size),
    // Served through an authenticated admin route, never as a raw static path
    url: `/api/admin/applications/${a.id}/documents/${d.id}`,
  })),
});

/* ─────────── submission ─────────── */

const emailTaken = (email) => {
  const e = String(email).toLowerCase();
  return (
    readStore('doctors.json').some(d => d.email.toLowerCase() === e) ||
    readStore('users.json').some(u => u.email.toLowerCase() === e) ||
    readStore('admins.json').some(a => a.email.toLowerCase() === e) ||
    readStore(STORE).some(a => a.email.toLowerCase() === e && a.status === 'pending')
  );
};

const submit = async (body, files = []) => {
  const {
    fullName, email, phone, password,
    specialty, experience, qualification, licenseNumber,
    location, languages, bio, price,
  } = body;

  const required = { fullName, email, password, specialty, qualification, licenseNumber };
  const missing = Object.entries(required).filter(([, v]) => !String(v || '').trim()).map(([k]) => k);
  if (missing.length) {
    throw Object.assign(new Error(`Missing required field(s): ${missing.join(', ')}`), { statusCode: 400 });
  }
  if (String(password).length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
  }
  if (!files.length) {
    throw Object.assign(new Error('Please upload at least one degree or certification document'), { statusCode: 400 });
  }
  if (emailTaken(email)) {
    throw Object.assign(new Error('An account or pending application already exists for this email'), { statusCode: 409 });
  }

  const apps = readStore(STORE);
  const now = new Date().toISOString();

  const application = {
    id: uuidv4(),
    fullName: String(fullName).trim(),
    email: String(email).toLowerCase().trim(),
    phone: phone || '',
    // Hashed at submission — the plaintext is never stored, even while pending
    passwordHash: await hashPassword(password),
    specialty: specialty || '',
    experience: experience || '',
    qualification: qualification || '',
    licenseNumber: licenseNumber || '',
    location: location || '',
    languages: languages
      ? String(languages).split(',').map(s => s.trim()).filter(Boolean)
      : ['English'],
    bio: bio || '',
    price: Number(price) || 70,
    documents: files.map(f => ({
      id: uuidv4(),
      label: f.fieldname === 'degree' ? 'Degree certificate' : 'Certification',
      originalName: f.originalname,
      storedName: f.filename,
      mimeType: f.mimetype,
      size: f.size,
      uploadedAt: now,
    })),
    status: 'pending',          // pending → approved | rejected
    reviewNote: '',
    reviewedAt: null,
    reviewedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  apps.push(application);
  writeStore(STORE, apps);

  // Never echo the hash back to a public caller
  const { passwordHash, ...safe } = application;
  return safe;
};

/* ─────────── admin review ─────────── */

const list = (status) => {
  const apps = readStore(STORE)
    .filter(a => !status || status === 'all' || a.status === status)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(a => { const { passwordHash, ...safe } = a; return publicView(safe); });
  return apps;
};

const counts = () => {
  const apps = readStore(STORE);
  return {
    pending: apps.filter(a => a.status === 'pending').length,
    approved: apps.filter(a => a.status === 'approved').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
    total: apps.length,
  };
};

const getById = (id) => {
  const app = readStore(STORE).find(a => a.id === id);
  if (!app) throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  return app;
};

const getDetail = (id) => {
  const { passwordHash, ...safe } = getById(id);
  return publicView(safe);
};

/** Resolves a stored certificate to an absolute path, guarding against traversal. */
const getDocumentPath = (applicationId, documentId) => {
  const app = getById(applicationId);
  const doc = (app.documents || []).find(d => d.id === documentId);
  if (!doc) throw Object.assign(new Error('Document not found'), { statusCode: 404 });

  const resolved = path.resolve(CERT_DIR, doc.storedName);
  if (!resolved.startsWith(path.resolve(CERT_DIR))) {
    throw Object.assign(new Error('Invalid document path'), { statusCode: 400 });
  }
  if (!fs.existsSync(resolved)) {
    throw Object.assign(new Error('The uploaded file is no longer on disk'), { statusCode: 404 });
  }
  return { absolutePath: resolved, doc };
};

/**
 * Approving turns the application into a real, verified doctor account that can
 * log in immediately with the password they chose when applying.
 */
const approve = (id, adminId, note = '') => {
  const apps = readStore(STORE);
  const idx = apps.findIndex(a => a.id === id);
  if (idx === -1) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

  const app = apps[idx];
  if (app.status === 'approved') {
    throw Object.assign(new Error('This application has already been approved'), { statusCode: 409 });
  }

  const doctors = readStore('doctors.json');
  if (doctors.some(d => d.email.toLowerCase() === app.email)) {
    throw Object.assign(new Error('A counselor with this email already exists'), { statusCode: 409 });
  }

  const nextNum = doctors.reduce(
    (m, d) => Math.max(m, parseInt(String(d.id).replace(/\D/g, ''), 10) || 0), 0
  ) + 1;

  const clean = app.fullName.replace(/^Dr\.?\s*/i, '').trim();
  const parts = clean.split(/\s+/);
  const now = new Date().toISOString();

  const doctor = {
    id: `d${nextNum}`,
    counselorId: `c${nextNum}`,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
    name: /^dr\.?\s/i.test(app.fullName) ? app.fullName : `Dr. ${clean}`,
    email: app.email,
    passwordHash: app.passwordHash,     // reuse the hash they set when applying
    role: 'doctor',
    title: app.qualification || 'Counselor',
    specialty: app.specialty,
    rating: 0,
    sessions: 0,
    experience: app.experience || '',
    languages: app.languages,
    available: true,
    price: app.price,
    image: '',
    avatar: '',
    bio: app.bio,
    approach: '',
    badge: null,
    phone: app.phone,
    location: app.location,
    status: 'Verified',
    availability: 'Mon–Fri',
    licenseNumber: app.licenseNumber,
    qualification: app.qualification,
    // Keep the credential trail attached to the account for audit
    credentials: app.documents,
    applicationId: app.id,
    verifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  doctors.push(doctor);
  writeStore('doctors.json', doctors);

  apps[idx] = {
    ...app,
    status: 'approved',
    reviewNote: note,
    reviewedAt: now,
    reviewedBy: adminId,
    doctorId: doctor.id,
    updatedAt: now,
  };
  writeStore(STORE, apps);

  const { passwordHash, ...safeDoctor } = doctor;
  return { application: publicView((({ passwordHash: _p, ...r }) => r)(apps[idx])), doctor: safeDoctor };
};

const reject = (id, adminId, note = '') => {
  const apps = readStore(STORE);
  const idx = apps.findIndex(a => a.id === id);
  if (idx === -1) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

  const now = new Date().toISOString();
  apps[idx] = {
    ...apps[idx],
    status: 'rejected',
    reviewNote: note,
    reviewedAt: now,
    reviewedBy: adminId,
    updatedAt: now,
  };
  writeStore(STORE, apps);

  const { passwordHash, ...safe } = apps[idx];
  return publicView(safe);
};

/** Lets an applicant check where their application stands. */
const statusFor = (email) => {
  const app = readStore(STORE)
    .filter(a => a.email.toLowerCase() === String(email).toLowerCase())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (!app) return null;
  return {
    status: app.status,
    submittedAt: app.createdAt,
    reviewedAt: app.reviewedAt,
    reviewNote: app.status === 'rejected' ? app.reviewNote : '',
  };
};

module.exports = {
  submit, list, counts, getDetail, getById, getDocumentPath,
  approve, reject, statusFor, CERT_DIR,
};
