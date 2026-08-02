const { v4: uuidv4 } = require('uuid');
const { readStore, writeStore } = require('../utils/fileStore.utils');

const getEntries = (userId, search = '') => {
  const entries = readStore('journal.json');
  return entries
    .filter(e => {
      if (e.userId !== userId) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getEntry = (userId, id) => {
  const entries = readStore('journal.json');
  const entry = entries.find(e => e.id === id && e.userId === userId);
  if (!entry) throw Object.assign(new Error('Journal entry not found'), { statusCode: 404 });
  return entry;
};

const createEntry = (userId, { title, content, moodEmoji, moodLabel, moodColor, tags, isPrivate }) => {
  const entries = readStore('journal.json');
  const now = new Date().toISOString();
  const entry = {
    id: uuidv4(),
    userId,
    title,
    content,
    moodEmoji: moodEmoji || '',
    moodLabel: moodLabel || '',
    moodColor: moodColor || '#355C4D',
    tags: tags || [],
    // Entries are visible to the patient's counselor unless explicitly locked
    isPrivate: !!isPrivate,
    date: now.split('T')[0],
    createdAt: now,
    updatedAt: now,
  };
  entries.push(entry);
  writeStore('journal.json', entries);
  return entry;
};

const updateEntry = (userId, id, updates) => {
  const entries = readStore('journal.json');
  const idx = entries.findIndex(e => e.id === id && e.userId === userId);
  if (idx === -1) throw Object.assign(new Error('Journal entry not found'), { statusCode: 404 });

  const allowed = ['title', 'content', 'moodEmoji', 'moodLabel', 'moodColor', 'tags', 'isPrivate'];
  allowed.forEach(k => { if (updates[k] !== undefined) entries[idx][k] = updates[k]; });
  entries[idx].updatedAt = new Date().toISOString();
  writeStore('journal.json', entries);
  return entries[idx];
};

const deleteEntry = (userId, id) => {
  const entries = readStore('journal.json');
  const exists = entries.find(e => e.id === id && e.userId === userId);
  if (!exists) throw Object.assign(new Error('Journal entry not found'), { statusCode: 404 });
  writeStore('journal.json', entries.filter(e => !(e.id === id && e.userId === userId)));
};

/* ─────────── doctor-facing access ─────────── */

/**
 * Journal entries a counselor is allowed to read for one of their patients.
 * Entries the patient locked as private are never returned — the counselor
 * only ever learns how many were withheld, not what they say.
 */
const getSharedEntries = (patientId) => {
  const all = readStore('journal.json').filter(e => e.userId === patientId);
  const shared = all
    .filter(e => !e.isPrivate)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    entries: shared,
    totalCount: all.length,
    privateCount: all.length - shared.length,
  };
};

/** Aggregate figures used by the doctor UI and the PDF header. */
const getSharedSummary = (patientId) => {
  const { entries, totalCount, privateCount } = getSharedEntries(patientId);

  const tagCounts = {};
  entries.forEach(e => (e.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));

  const moodCounts = {};
  entries.forEach(e => {
    if (e.moodLabel) moodCounts[e.moodLabel] = (moodCounts[e.moodLabel] || 0) + 1;
  });

  const words = entries.reduce((s, e) => s + String(e.content || '').trim().split(/\s+/).filter(Boolean).length, 0);

  return {
    entries,
    totalCount,
    privateCount,
    sharedCount: entries.length,
    topTags,
    moodCounts,
    totalWords: words,
    avgWords: entries.length ? Math.round(words / entries.length) : 0,
    firstEntryAt: entries.length ? entries[entries.length - 1].createdAt : null,
    lastEntryAt: entries.length ? entries[0].createdAt : null,
  };
};

module.exports = {
  getEntries, getEntry, createEntry, updateEntry, deleteEntry,
  getSharedEntries, getSharedSummary,
};
