// Video-call domain logic: who you may call, and the record of every call.

const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');
const rel = require('./relationship.service');

const CALLS = 'calls.json';

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(w => !/^dr\.?$/i.test(w)).slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '').join('') || '?';

const AVATAR_COLORS = ['#5E8B7E', '#2D6A4F', '#D8A48F', '#42A5F5', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];
const colorFor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/* ─────────────── contacts ─────────────── */

/**
 * The list of people this account is allowed to video-call.
 * Users see only their own counselors. Doctors see only their own clients.
 */
const getContacts = ({ id, role }) => {
  if (role === 'user') {
    const allowed = rel.counselorIdsForUser(id);
    return readStore('doctors.json')
      .filter(d => allowed.has(d.counselorId))
      .map(d => {
        const r = rel.relationshipSummary(id, d.counselorId);
        return {
          id: d.id,                    // socket target
          counselorId: d.counselorId,
          role: 'doctor',
          name: d.name,
          subtitle: d.specialty || d.title || 'Counselor',
          avatarUrl: d.image || d.avatar || '',
          initials: initials(d.name),
          color: colorFor(d.id),
          available: d.available !== false && d.status !== 'Suspended',
          ...r,
        };
      })
      .sort((a, b) => new Date(b.lastInteractionAt || 0) - new Date(a.lastInteractionAt || 0));
  }

  if (role === 'doctor') {
    const counselorId = rel.resolveCounselorId(id);
    if (!counselorId) return [];
    const allowed = rel.userIdsForCounselor(counselorId);
    return readStore('users.json')
      .filter(u => allowed.has(u.id))
      .map(u => {
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
        const r = rel.relationshipSummary(u.id, counselorId);
        return {
          id: u.id,
          role: 'user',
          name,
          // Email keeps same-named clients distinguishable
          subtitle: u.reason || u.email,
          email: u.email,
          avatarUrl: u.avatar || '',
          initials: initials(name),
          color: colorFor(u.id),
          available: u.status !== 'Suspended',
          ...r,
        };
      })
      .sort((a, b) => new Date(b.lastInteractionAt || 0) - new Date(a.lastInteractionAt || 0));
  }

  return [];
};

/* ─────────────── call records ─────────────── */

const nameOfUser = (userId) => {
  const u = readStore('users.json').find(x => x.id === userId);
  return u ? (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email) : 'Unknown user';
};

const nameOfDoctor = (doctorId) => {
  const d = readStore('doctors.json').find(x => x.id === doctorId);
  return d ? d.name : 'Unknown counselor';
};

/**
 * Opens a call record the moment someone dials.
 * `from`/`to` are { id, role }.
 */
const createCall = (from, to) => {
  const user = from.role === 'user' ? from : to;
  const doctor = from.role === 'doctor' ? from : to;
  const counselorId = rel.resolveCounselorId(doctor.id);

  const call = {
    id: uuidv4(),
    userId: user.id,
    doctorId: doctor.id,
    counselorId,
    userName: nameOfUser(user.id),
    doctorName: nameOfDoctor(doctor.id),
    initiatedBy: from.role,
    status: 'ringing',          // ringing → active → ended | missed | rejected | cancelled
    startedAt: null,
    endedAt: null,
    durationSec: 0,
    createdAt: new Date().toISOString(),
  };

  const calls = readStore(CALLS);
  calls.push(call);
  writeStore(CALLS, calls);
  return call;
};

const updateCall = (callId, updates) => {
  const calls = readStore(CALLS);
  const idx = calls.findIndex(c => c.id === callId);
  if (idx === -1) return null;

  Object.assign(calls[idx], updates);

  // Derive duration whenever a call closes
  if (updates.status && ['ended', 'missed', 'rejected', 'cancelled'].includes(updates.status)) {
    calls[idx].endedAt = calls[idx].endedAt || new Date().toISOString();
    if (calls[idx].startedAt) {
      calls[idx].durationSec = Math.max(
        0,
        Math.round((new Date(calls[idx].endedAt) - new Date(calls[idx].startedAt)) / 1000)
      );
    }
  }

  writeStore(CALLS, calls);
  return calls[idx];
};

const getCall = (callId) => readStore(CALLS).find(c => c.id === callId) || null;

/** Any call left hanging (server restart, browser killed) shouldn't stay "ringing" forever. */
const closeStaleCalls = () => {
  const calls = readStore(CALLS);
  let changed = false;
  const cutoff = Date.now() - 2 * 60 * 1000;

  calls.forEach(c => {
    if (['ringing', 'active'].includes(c.status) && new Date(c.createdAt).getTime() < cutoff) {
      c.status = c.startedAt ? 'ended' : 'missed';
      c.endedAt = c.endedAt || new Date().toISOString();
      if (c.startedAt) {
        c.durationSec = Math.max(0, Math.round((new Date(c.endedAt) - new Date(c.startedAt)) / 1000));
      }
      changed = true;
    }
  });

  if (changed) writeStore(CALLS, calls);
};

const fmtDuration = (s) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

/** Call history scoped to whoever is asking. */
const getHistory = ({ id, role }, limit = 50) => {
  const calls = readStore(CALLS);
  const mine = role === 'user'
    ? calls.filter(c => c.userId === id)
    : role === 'doctor'
      ? calls.filter(c => c.doctorId === id)
      : calls;

  return mine
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map(c => ({
      ...c,
      // From the caller's point of view, who was on the other end?
      peerName: role === 'user' ? c.doctorName : c.userName,
      direction: c.initiatedBy === role ? 'outgoing' : 'incoming',
      durationLabel: fmtDuration(c.durationSec),
      dateLabel: new Date(c.createdAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    }));
};

/** Aggregate view for the admin panel. */
const getAllCalls = (limit = 100) =>
  readStore(CALLS)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map(c => ({
      ...c,
      durationLabel: fmtDuration(c.durationSec),
      dateLabel: new Date(c.createdAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    }));

const getStats = () => {
  const calls = readStore(CALLS);
  const connected = calls.filter(c => c.status === 'ended' && c.durationSec > 0);
  const totalSec = connected.reduce((s, c) => s + c.durationSec, 0);
  return {
    total: calls.length,
    connected: connected.length,
    missed: calls.filter(c => c.status === 'missed').length,
    rejected: calls.filter(c => c.status === 'rejected').length,
    active: calls.filter(c => c.status === 'active').length,
    totalMinutes: Math.round(totalSec / 60),
    avgDurationSec: connected.length ? Math.round(totalSec / connected.length) : 0,
    avgDurationLabel: fmtDuration(connected.length ? Math.round(totalSec / connected.length) : 0),
  };
};

module.exports = {
  getContacts, createCall, updateCall, getCall, closeStaleCalls,
  getHistory, getAllCalls, getStats, fmtDuration,
};
