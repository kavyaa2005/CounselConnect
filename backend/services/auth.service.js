const { v4: uuidv4 } = require('uuid');
const { hashPassword, comparePassword } = require('../utils/password.utils');
const { signToken, blacklistToken } = require('../utils/jwt.utils');
const { readStore, writeStore } = require('../utils/fileStore.utils');

const findUserByEmail = (email) => {
  const users = readStore('users.json');
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
};

const findUserById = (id) => {
  const users = readStore('users.json');
  return users.find(u => u.id === id) || null;
};

const createUser = async ({ firstName, email, password, reason, sessionType, frequency, goals }) => {
  const users = readStore('users.json');
  if (findUserByEmail(email)) {
    throw Object.assign(new Error('An account with this email already exists'), { statusCode: 409 });
  }

  const hashed = await hashPassword(password);
  const now = new Date().toISOString();
  const newUser = {
    id: uuidv4(),
    firstName,
    lastName: '',
    email: email.toLowerCase(),
    passwordHash: hashed,
    phone: '',
    bio: '',
    avatar: '',
    reason: reason || '',
    sessionType: sessionType || '',
    frequency: frequency || '',
    goals: goals || [],
    notifications: {
      sessions: true,
      moodReminders: true,
      messages: true,
      aiInsights: false,
      newsletter: false,
    },
    privacy: {
      shareProgress: false,
      anonymousData: true,
      profileVisible: true,
    },
    createdAt: now,
    updatedAt: now,
  };

  users.push(newUser);
  writeStore('users.json', users);
  return stripSensitive(newUser);
};

const findDoctorByEmail = (email) => {
  const doctors = readStore('doctors.json');
  return doctors.find(d => d.email.toLowerCase() === email.toLowerCase()) || null;
};

const findDoctorById = (id) => {
  const doctors = readStore('doctors.json');
  return doctors.find(d => d.id === id) || null;
};

const findAdminByEmail = (email) => {
  const admins = readStore('admins.json');
  return admins.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
};

const findAdminById = (id) => {
  const admins = readStore('admins.json');
  return admins.find(a => a.id === id) || null;
};

// Unified login: checks users, then doctors, then admins. Token carries the role.
const loginUser = async (email, password, meta = {}) => {
  let account = findUserByEmail(email);
  let role = 'user';

  if (!account) {
    account = findDoctorByEmail(email);
    role = 'doctor';
  }

  if (!account) {
    account = findAdminByEmail(email);
    role = 'admin';
  }

  if (!account) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  const valid = await comparePassword(password, account.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  // Admins can suspend accounts — blocked here at the door.
  if (account.status === 'Suspended') {
    throw Object.assign(new Error('This account has been suspended. Please contact support.'), { statusCode: 403 });
  }
  const token = signToken({ id: account.id, email: account.email, role });
  recordLogin(account.id, role, meta);
  return { token, user: { ...stripSensitive(account), role } };
};

// Real login history (kept to the most recent 200 entries)
const recordLogin = (accountId, role, meta = {}) => {
  const logins = readStore('logins.json');
  logins.push({
    accountId,
    role,
    device: meta.userAgent || 'Unknown device',
    ip: meta.ip || '',
    at: new Date().toISOString(),
    status: 'success',
  });
  writeStore('logins.json', logins.slice(-200));
};

const getLoginHistory = (accountId) => {
  return readStore('logins.json')
    .filter(l => l.accountId === accountId)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 10);
};

const logoutUser = (token) => {
  blacklistToken(token);
};

const stripSensitive = (user) => {
  const { passwordHash, ...safe } = user;
  return safe;
};

const getUserById = (id, role = 'user') => {
  const account =
    role === 'doctor' ? findDoctorById(id) :
    role === 'admin'  ? findAdminById(id)  :
    findUserById(id);
  if (!account) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return { ...stripSensitive(account), role };
};

// Update an admin's own profile
const updateAdminProfile = (id, updates) => {
  const admins = readStore('admins.json');
  const idx = admins.findIndex(a => a.id === id);
  if (idx === -1) throw Object.assign(new Error('Admin not found'), { statusCode: 404 });

  const allowed = ['firstName', 'lastName', 'name', 'email', 'phone', 'bio', 'avatar', 'title', 'timezone', 'language'];
  allowed.forEach(key => {
    if (updates[key] !== undefined) admins[idx][key] = updates[key];
  });
  admins[idx].updatedAt = new Date().toISOString();
  writeStore('admins.json', admins);
  return stripSensitive(admins[idx]);
};

// Change password for any role
const changePassword = async (id, role, currentPassword, newPassword) => {
  const file = role === 'doctor' ? 'doctors.json' : role === 'admin' ? 'admins.json' : 'users.json';
  const list = readStore(file);
  const idx = list.findIndex(a => a.id === id);
  if (idx === -1) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  const ok = await comparePassword(currentPassword, list[idx].passwordHash);
  if (!ok) throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('New password must be at least 6 characters'), { statusCode: 400 });
  }

  list[idx].passwordHash = await hashPassword(newPassword);
  list[idx].updatedAt = new Date().toISOString();
  writeStore(file, list);
  return true;
};

const updateUserProfile = (id, updates) => {
  const users = readStore('users.json');
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const allowed = ['firstName', 'lastName', 'email', 'phone', 'bio', 'avatar'];
  allowed.forEach(key => {
    if (updates[key] !== undefined) users[idx][key] = updates[key];
  });
  users[idx].updatedAt = new Date().toISOString();
  writeStore('users.json', users);
  return stripSensitive(users[idx]);
};

const updateNotifications = (id, prefs) => {
  const users = readStore('users.json');
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  users[idx].notifications = { ...users[idx].notifications, ...prefs };
  users[idx].updatedAt = new Date().toISOString();
  writeStore('users.json', users);
  return users[idx].notifications;
};

const updatePrivacy = (id, prefs) => {
  const users = readStore('users.json');
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  users[idx].privacy = { ...users[idx].privacy, ...prefs };
  users[idx].updatedAt = new Date().toISOString();
  writeStore('users.json', users);
  return users[idx].privacy;
};

const deleteUser = (id) => {
  const users = readStore('users.json');
  const filtered = users.filter(u => u.id !== id);
  writeStore('users.json', filtered);
};

module.exports = {
  createUser, loginUser, logoutUser, getUserById,
  updateUserProfile, updateNotifications, updatePrivacy, deleteUser,
  findDoctorById, findAdminById, findAdminByEmail,
  updateAdminProfile, changePassword, getLoginHistory,
};
