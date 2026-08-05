/**
 * Exports MongoDB back out to backend/data/*.json.
 *
 *   npm run db:export
 *
 * ── Why this exists ──
 *
 * The team shares this project by zipping the folder and sending it. That
 * worked while the JSON files WERE the database — the data travelled inside
 * the zip automatically.
 *
 * Now that MongoDB is the store, those files are frozen at the moment of
 * migration. Anything created since then lives only in MongoDB on your own
 * machine, so a zip would carry a stale snapshot and your teammate would be
 * missing every booking, message and mood logged since.
 *
 * Run this before zipping. It writes the current database back into the JSON
 * files, so the zip carries real, current data again — and the person who
 * unzips it gets all of it imported into their own MongoDB on first run.
 */

const path = require('path');
const {
  initStore, closeStore, usingMongo,
  readStore, readStoreObj, writeFileDirect,
  STORE_FILES, OBJECT_STORES, DATA_DIR,
} = require('../utils/fileStore.utils');
const dbConfig = require('../config/db.config');

(async () => {
  const res = await initStore({ quiet: true });

  if (!usingMongo()) {
    console.error(`\n  MongoDB is not running at ${dbConfig.uri}`);
    console.error(`  ${res.reason || ''}`);
    console.error(`\n  There is nothing to export — start MongoDB and try again.`);
    console.error(`  (If MongoDB has never run, backend/data/*.json is already your data.)\n`);
    process.exit(1);
  }

  console.log(`\n  Exporting ${dbConfig.dbName} to backend/data/ …\n`);

  let total = 0;
  for (const filename of STORE_FILES) {
    const isObject = OBJECT_STORES.has(filename);
    const data = isObject ? readStoreObj(filename) : readStore(filename);
    const count = isObject ? Object.keys(data).length : data.length;

    writeFileDirect(filename, data);
    total += count;
    console.log(`    ${filename.padEnd(28)} ${String(count).padStart(5)} ${isObject ? 'key(s)' : 'record(s)'}`);
  }

  console.log(`\n  ${total} record(s) written to ${path.relative(process.cwd(), DATA_DIR) || 'data'}\n`);
  console.log(`  You can zip the project now — your teammate will get this data.`);
  console.log(`  Remind them to read HOW-TO-RUN.md inside the zip.\n`);

  await closeStore();
})().catch(e => { console.error('\nExport failed:', e.message, '\n'); process.exit(1); });
