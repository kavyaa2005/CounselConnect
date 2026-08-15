// The storage API every service uses.
//
// Historically this read and wrote JSON files under backend/data. It now
// delegates to MongoDB (see mongoStore.utils.js) whenever a connection is up,
// and falls back to those same JSON files when it isn't — so the app still
// runs if mongod happens to be stopped.
//
// The signatures are unchanged on purpose: 403 call sites across 25 services
// keep working exactly as they did, and MongoDB becomes the database of record
// without a rewrite of the entire backend.

const fs = require('fs');
const path = require('path');
const mongo = require('./mongoStore.utils');

const DATA_DIR = path.join(__dirname, '../data');

/** Every store the app uses. Each becomes a MongoDB collection of the same name. */
const STORE_FILES = [
  'admins.json',
  'applications.json',
  'appointments.json',
  'availability.json',
  'calls.json',
  'crisis-log.json',
  'doctors.json',
  'documents.json',
  'feedback.json',
  'journal.json',
  'logins.json',
  'messages.json',
  'moods.json',
  'notes.json',
  'notification-reads.json',
  'notifications-read.json',
  'notifications.json',
  'payment-intents.json',
  'payments.json',
  'platform-notifications.json',
  'settings.json',
  'users.json',
];

/**
 * The stores that are key/value maps rather than lists.
 *
 * Stated explicitly rather than inferred from whatever the file happens to
 * contain: an empty `{}` and an empty `[]` are indistinguishable once written,
 * and guessing wrong would silently change a store's shape on export.
 */
const OBJECT_STORES = new Set([
  'availability.json',
  'messages.json',
  'notification-reads.json',
  'settings.json',
]);

/* ─────────────────────────── file fallback ─────────────────────────── */

const readFile = (filename, empty) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return empty;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || (Array.isArray(empty) ? '[]' : '{}'));
  } catch {
    return empty;
  }
};

const writeFile = (filename, data) => {
  const filePath = path.join(DATA_DIR, filename);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

/* ───────────────────────────── public API ───────────────────────────── */

const readStore = (filename) =>
  mongo.isConnected() ? mongo.readArray(filename) : readFile(filename, []);

const writeStore = (filename, data) => {
  if (mongo.isConnected()) mongo.writeArray(filename, data);
  else writeFile(filename, data);
};

const readStoreObj = (filename) =>
  mongo.isConnected() ? mongo.readObject(filename) : readFile(filename, {});

const writeStoreObj = (filename, data) => {
  if (mongo.isConnected()) mongo.writeObject(filename, data);
  else writeFile(filename, data);
};

/* ─────────────────────────── boot / shutdown ─────────────────────────── */

/**
 * Connects to MongoDB and, the first time, imports whatever is already in the
 * JSON files. Call once before the server starts listening.
 *
 * Never throws: if MongoDB is unreachable the app keeps working on files, and
 * says so loudly, rather than refusing to boot.
 */
async function initStore({ quiet = false } = {}) {
  const dbConfig = require('../config/db.config');
  const res = await mongo.connect(STORE_FILES);

  if (!res.ok) {
    const msg =
      `[store] MongoDB not reachable at ${dbConfig.uri} — ${res.reason}\n` +
      `        Running on JSON files instead. Start MongoDB and restart to use the database.`;
    if (dbConfig.required) {
      throw new Error(`MongoDB is required but unreachable: ${res.reason}`);
    }
    if (!quiet) console.warn(msg);
    return { ok: false, reason: res.reason, mode: 'files' };
  }

  await mongo.ensureCollections(STORE_FILES);
  const imported = await importFromFiles({ quiet });
  await mongo.flush();

  return { ok: true, mode: 'mongodb', imported, stats: mongo.stats() };
}

/**
 * Copies the JSON files into MongoDB — but only into collections that are
 * still empty, so restarting the server never overwrites live data with a
 * stale snapshot.
 */
async function importFromFiles({ quiet = false } = {}) {
  const moved = [];
  for (const filename of STORE_FILES) {
    const name = mongo.collectionName(filename);
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    const current = mongo.stats().collections.find(c => c.name === name);
    if (current && current.count > 0) continue;   // already has data — leave it

    const raw = readFile(filename, null);
    if (raw == null) continue;

    if (Array.isArray(raw)) {
      if (!raw.length) continue;
      mongo.writeArray(filename, raw);
      moved.push({ collection: name, documents: raw.length });
    } else if (raw && typeof raw === 'object') {
      const keys = Object.keys(raw);
      if (!keys.length) continue;
      mongo.writeObject(filename, raw);
      moved.push({ collection: name, documents: keys.length });
    }
  }
  await mongo.flush();
  if (moved.length && !quiet) {
    console.log(`[store] imported ${moved.reduce((s, m) => s + m.documents, 0)} document(s) from JSON into MongoDB:`);
    moved.forEach(m => console.log(`        ${m.collection.padEnd(24)} ${m.documents}`));
  }
  return moved;
}

/** Waits for queued writes then closes the connection. */
const closeStore = () => mongo.close();

/** True when MongoDB is the active backend. */
const usingMongo = () => mongo.isConnected();

const storeStats = () => mongo.stats();

module.exports = {
  readStore, writeStore, readStoreObj, writeStoreObj,
  initStore, closeStore, usingMongo, storeStats, flushStore: () => mongo.flush(),
  STORE_FILES, OBJECT_STORES, DATA_DIR,
  /** Direct file write, bypassing MongoDB — used by the export script. */
  writeFileDirect: writeFile,
};
