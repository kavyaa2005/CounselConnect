/**
 * Prints what's in the database.
 *
 *   npm run db:status
 *
 * Useful before a demo: confirms the connection works and shows the row count
 * for every collection, so you know Compass will have something to show.
 */

const { initStore, closeStore, storeStats, usingMongo } = require('../utils/fileStore.utils');
const dbConfig = require('../config/db.config');

(async () => {
  const res = await initStore({ quiet: true });

  console.log('\n─────────────── CounselConnect database ───────────────\n');
  console.log(`  URI       : ${dbConfig.uri}`);
  console.log(`  Database  : ${dbConfig.dbName}`);
  console.log(`  Engine    : ${usingMongo() ? 'MongoDB ✅' : 'JSON files (MongoDB unreachable) ⚠️'}`);

  if (!res.ok) {
    console.log(`\n  ${res.reason}\n`);
    console.log('  Start MongoDB and try again:');
    console.log('    Windows : net start MongoDB          (or run mongod)');
    console.log('    macOS   : brew services start mongodb-community');
    console.log('    Linux   : sudo systemctl start mongod\n');
    process.exit(1);
  }

  const s = storeStats();
  const width = Math.max(...s.collections.map(c => c.name.length));
  console.log(`\n  ${'COLLECTION'.padEnd(width)}   DOCUMENTS`);
  console.log(`  ${'-'.repeat(width)}   ---------`);
  s.collections
    .slice()
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .forEach(c => console.log(`  ${c.name.padEnd(width)}   ${String(c.count).padStart(6)}`));

  const total = s.collections.reduce((n, c) => n + c.count, 0);
  console.log(`  ${'-'.repeat(width)}   ---------`);
  console.log(`  ${'TOTAL'.padEnd(width)}   ${String(total).padStart(6)}\n`);
  console.log(`  Browse it in MongoDB Compass: ${dbConfig.uri}  →  ${dbConfig.dbName}\n`);

  await closeStore();
})().catch(e => { console.error('\nFailed:', e.message, '\n'); process.exit(1); });
