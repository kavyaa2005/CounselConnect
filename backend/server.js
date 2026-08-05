const app = require('./app');
const { port, nodeEnv } = require('./config/app.config');
const dbConfig = require('./config/db.config');
const { attachSignaling } = require('./realtime/signaling');
const { initStore, closeStore, usingMongo, storeStats } = require('./utils/fileStore.utils');

let server = null;
let io = null;

/**
 * The database has to be connected and loaded before the first request can be
 * served — every service reads from the store synchronously, so listening
 * early would mean answering requests against an empty cache.
 */
async function start() {
  const store = await initStore();

  server = app.listen(port, () => {
    console.log(`\n🌿 CounselConnect API`);
    console.log(`   Environment : ${nodeEnv}`);
    console.log(`   Port        : ${port}`);
    console.log(`   Health      : http://localhost:${port}/api/health`);
    console.log(`   Video calls : signaling live on ws://localhost:${port}`);

    if (store.ok) {
      const s = storeStats();
      const total = s.collections.reduce((n, c) => n + c.count, 0);
      console.log(`   Database    : MongoDB — ${dbConfig.dbName} at ${dbConfig.uri}`);
      console.log(`                 ${s.collections.length} collections, ${total} documents`);
      console.log(`                 open Compass at ${dbConfig.uri} to browse them\n`);
    } else {
      console.log(`   Database    : JSON files (MongoDB unreachable)\n`);
    }
  });

  // WebRTC signaling shares the same port as the REST API
  io = attachSignaling(server);
  app.set('io', io);

  return server;
}

/** Finish writing anything queued before the process goes away. */
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down…`);
  try {
    io?.close();
    if (usingMongo()) {
      await closeStore();
      console.log('Pending database writes flushed.');
    }
  } catch (e) {
    console.error('Shutdown error:', e.message);
  }
  server ? server.close(() => process.exit(0)) : process.exit(0);
  // Don't hang forever on a stuck socket.
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch(err => {
  console.error('\nFailed to start:', err.message, '\n');
  process.exit(1);
});

module.exports = { start, app };
