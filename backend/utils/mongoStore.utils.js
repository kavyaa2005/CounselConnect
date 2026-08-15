// MongoDB storage engine behind the existing synchronous store API.
//
// ── Why it works this way ──
//
// Every service in this codebase calls readStore()/writeStore() synchronously
// and uses the result immediately — 403 call sites across 25 files. The Mongo
// driver is asynchronous. Rewriting all of that to async/await would touch
// essentially the whole backend at once.
//
// So the collections are loaded into memory at boot and kept there:
//
//   • reads  → served from the in-process cache (synchronous, as before)
//   • writes → applied to the cache immediately, then written through to
//              MongoDB on a serialised queue so ordering is preserved
//
// MongoDB is the source of truth: it is loaded at startup and every change
// lands in it. The cache is a read-through copy, which is sound because a
// single Node process owns the data. If you ever run more than one instance,
// this is the thing that has to change.
//
// The JSON files are no longer written to once Mongo is connected; they stay
// on disk as the pre-migration snapshot.

const { MongoClient } = require('mongodb');
const dbConfig = require('../config/db.config');
const { redactUri } = require('./mongoUri.utils');

/** filename → collection name. `users.json` becomes the `users` collection. */
const collectionName = (filename) => String(filename).replace(/\.json$/i, '');

let client = null;
let db = null;
let connected = false;

/** collection name → array | plain object, mirroring the old file contents. */
const cache = new Map();

/** Serialises writes so two rapid saves can't land out of order. */
let writeChain = Promise.resolve();
let pendingWrites = 0;
let lastError = null;

/* ─────────────────────────── document shaping ─────────────────────────── */
//
// Documents are shaped for a human reading them in Compass, not just for the
// round trip. An array store keeps its own `id` field AND mirrors it into
// `_id`, so the collection is browsable and joins by id still read naturally.

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * A short, stable key derived from an item's own contents (FNV-1a).
 *
 * Needed because not every store gives its rows an `id` — the login history
 * doesn't. Keying those by array index looks fine until the array is trimmed:
 * `logins` keeps only the last 200 entries, so one login shifts every index
 * and rewrites all 200 documents, with their _ids churning in Compass.
 * Hashing the content instead means an untouched row keeps its key forever.
 */
const contentKey = (value) => {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

/** Array store → documents. */
const arrayToDocs = (arr) => {
  const used = new Set();
  return arr.map((item, i) => {
    // Prefer the record's own id so re-saving updates it in place.
    let _id = isPlainObject(item) && item.id != null ? String(item.id) : `k${contentKey(item)}`;
    // Two byte-identical rows are legal; give the second one its own key.
    if (used.has(_id)) {
      let n = 2;
      while (used.has(`${_id}-${n}`)) n++;
      _id = `${_id}-${n}`;
    }
    used.add(_id);
    return isPlainObject(item) ? { _id, ...item } : { _id, __value: item };
  });
};

const docToItem = (doc) => {
  if (!doc) return doc;
  if ('__value' in doc) return doc.__value;
  const { _id, ...rest } = doc;
  return rest;
};

/**
 * Object store → documents, keyed by the object's own keys.
 *
 * `{ "u1": { theme: "dark" } }` becomes `{ _id: "u1", theme: "dark" }` — which
 * reads well in Compass. Values that aren't plain objects (an array of read
 * ids, say) are wrapped in `__value`, because you can't spread them.
 */
const objectToDocs = (obj) =>
  Object.entries(obj).map(([key, value]) =>
    isPlainObject(value) ? { _id: key, ...value } : { _id: key, __value: value }
  );

const docsToObject = (docs) => {
  const out = {};
  docs.forEach(doc => { out[doc._id] = docToItem(doc); });
  return out;
};

/* ───────────────────────────── connection ───────────────────────────── */

/**
 * Connects and loads every collection into the cache.
 *
 * @param {string[]} storeNames filenames to manage, e.g. ['users.json', …]
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
async function connect(storeNames) {
  try {
    client = new MongoClient(dbConfig.uri, {
      serverSelectionTimeoutMS: dbConfig.serverSelectionTimeoutMS,
    });
    await client.connect();
    // connect() can resolve before the server is really reachable; a ping is
    // what actually proves mongod is there.
    await client.db(dbConfig.dbName).command({ ping: 1 });
    db = client.db(dbConfig.dbName);

    for (const filename of storeNames) {
      const name = collectionName(filename);
      const docs = await db.collection(name).find({}).toArray();
      cache.set(name, { docs, filename });
    }

    connected = true;
    return { ok: true };
  } catch (err) {
    connected = false;
    client = null;
    db = null;
    return { ok: false, reason: err.message };
  }
}

/** Creates any collection that doesn't exist yet, so all 21 show up in Compass. */
async function ensureCollections(storeNames) {
  if (!connected) return;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  for (const filename of storeNames) {
    const name = collectionName(filename);
    if (!existing.has(name)) {
      // An empty collection is still worth creating — a reviewer opening
      // Compass should see the full schema, not only the tables with rows.
      await db.createCollection(name).catch(() => {});
    }
  }
}

const isConnected = () => connected;

/* ─────────────────────────────── reads ─────────────────────────────── */

function readArray(filename) {
  const entry = cache.get(collectionName(filename));
  if (!entry) return [];
  return entry.docs.map(docToItem);
}

function readObject(filename) {
  const entry = cache.get(collectionName(filename));
  if (!entry) return {};
  return docsToObject(entry.docs);
}

/* ─────────────────────────────── writes ─────────────────────────────── */

/**
 * Replaces a collection's contents.
 *
 * Uses a bulk upsert plus a delete of anything no longer present, rather than
 * wiping and re-inserting — a drop-then-insert would leave the collection
 * empty if the process died between the two.
 */
function persist(name, docs) {
  if (!connected) return;

  pendingWrites++;
  writeChain = writeChain
    .then(async () => {
      const coll = db.collection(name);
      const keep = docs.map(d => d._id);

      if (docs.length) {
        await coll.bulkWrite(
          docs.map(d => ({
            replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
          })),
          { ordered: false }
        );
      }
      await coll.deleteMany(keep.length ? { _id: { $nin: keep } } : {});
    })
    .catch(err => {
      lastError = err;
      console.error(`[mongo] write to "${name}" failed:`, err.message);
    })
    .finally(() => { pendingWrites--; });
}

function writeArray(filename, data) {
  const name = collectionName(filename);
  const arr = Array.isArray(data) ? data : [];
  const docs = arrayToDocs(arr);
  cache.set(name, { docs, filename });      // readable immediately
  persist(name, docs);                       // durable shortly after
}

function writeObject(filename, data) {
  const name = collectionName(filename);
  const obj = isPlainObject(data) ? data : {};
  const docs = objectToDocs(obj);
  cache.set(name, { docs, filename });
  persist(name, docs);
}

/** Resolves once every queued write has hit the database. */
async function flush() {
  await writeChain;
  // A write queued by a .then() during the await needs one more turn.
  while (pendingWrites > 0) await writeChain;
}

async function close() {
  await flush();
  if (client) await client.close().catch(() => {});
  client = null; db = null; connected = false;
}

/** Snapshot for the boot banner and the health endpoint. */
const stats = () => ({
  connected,
  // Redacted, never raw: this is surfaced by the public /api/health endpoint,
  // and with Atlas the raw string contains the database password.
  uri: redactUri(dbConfig.uri),
  dbName: dbConfig.dbName,
  collections: [...cache.entries()].map(([name, e]) => ({ name, count: e.docs.length })),
  pendingWrites,
  lastError: lastError ? lastError.message : null,
});

module.exports = {
  connect, ensureCollections, isConnected, close, flush, stats,
  readArray, readObject, writeArray, writeObject,
  collectionName,
  // exported for tests
  _shape: { arrayToDocs, docToItem, objectToDocs, docsToObject },
};
