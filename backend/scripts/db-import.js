/**
 * Imports backend/data/*.json into MongoDB.
 *
 *   npm run db:import          import into collections that are still empty
 *   npm run db:import -- --force   wipe each collection first, then import
 *
 * The server does the same import automatically on first boot, so you only
 * need this to re-import after clearing the database, or to force the JSON
 * snapshot back over live data.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const dbConfig = require('../config/db.config');
const mongo = require('../utils/mongoStore.utils');
const { STORE_FILES, DATA_DIR } = require('../utils/fileStore.utils');

const force = process.argv.includes('--force');

(async () => {
  const client = new MongoClient(dbConfig.uri, {
    serverSelectionTimeoutMS: dbConfig.serverSelectionTimeoutMS,
  });

  try {
    await client.connect();
    await client.db(dbConfig.dbName).command({ ping: 1 });
  } catch (e) {
    console.error(`\nCannot reach MongoDB at ${dbConfig.uri}\n  ${e.message}\n`);
    console.error('Start MongoDB first, then run this again.\n');
    process.exit(1);
  }

  const db = client.db(dbConfig.dbName);
  console.log(`\nImporting into ${dbConfig.dbName} at ${dbConfig.uri}${force ? '  (--force: existing documents will be replaced)' : ''}\n`);

  let totalDocs = 0;
  for (const filename of STORE_FILES) {
    const name = mongo.collectionName(filename);
    const filePath = path.join(DATA_DIR, filename);
    const coll = db.collection(name);

    if (!fs.existsSync(filePath)) {
      await db.createCollection(name).catch(() => {});
      console.log(`  ${name.padEnd(24)} — no JSON file, empty collection created`);
      continue;
    }

    const existing = await coll.countDocuments();
    if (existing > 0 && !force) {
      console.log(`  ${name.padEnd(24)} skipped — already holds ${existing} document(s). Use --force to overwrite.`);
      continue;
    }

    let raw;
    try { raw = JSON.parse(fs.readFileSync(filePath, 'utf8') || 'null'); }
    catch (e) { console.log(`  ${name.padEnd(24)} SKIPPED — ${filename} is not valid JSON (${e.message})`); continue; }

    const docs = Array.isArray(raw)
      ? mongo._shape.arrayToDocs(raw)
      : (raw && typeof raw === 'object' ? mongo._shape.objectToDocs(raw) : []);

    if (force) await coll.deleteMany({});
    await db.createCollection(name).catch(() => {});

    if (docs.length) {
      await coll.bulkWrite(
        docs.map(d => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
        { ordered: false }
      );
    }
    totalDocs += docs.length;
    console.log(`  ${name.padEnd(24)} ${String(docs.length).padStart(4)} document(s)`);
  }

  console.log(`\n  ${totalDocs} document(s) imported.`);
  console.log(`  The JSON files under backend/data are left untouched as a backup.\n`);
  console.log(`  Open MongoDB Compass → ${dbConfig.uri} → ${dbConfig.dbName}\n`);
  await client.close();
})().catch(e => { console.error('\nImport failed:', e.message, '\n'); process.exit(1); });
