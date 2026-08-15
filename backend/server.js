const app = require('./app');
const { port, nodeEnv } = require('./config/app.config');
const dbConfig = require('./config/db.config');
const { attachSignaling } = require('./realtime/signaling');
const { initStore, closeStore, usingMongo, storeStats } = require('./utils/fileStore.utils');
const { redactUri } = require('./utils/mongoUri.utils');

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
    // On a host the public URL is not localhost, and printing localhost sends
    // people to their own machine. Render supplies RENDER_EXTERNAL_URL.
    const publicUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
    console.log(`   Health      : ${publicUrl}/api/health`);
    console.log(`   Video calls : signaling live on ${publicUrl.replace(/^http/, 'ws')}`);

    if (store.ok) {
      const s = storeStats();
      const total = s.collections.reduce((n, c) => n + c.count, 0);
      // Redacted: deploy logs are retained and readable by anyone with access
      // to the dashboard, and with Atlas this string contains the database
      // password. A local mongodb:// URI has no credentials, so it prints
      // unchanged and stays useful for copying into Compass.
      const safeUri = redactUri(dbConfig.uri);
      console.log(`   Database    : MongoDB — ${dbConfig.dbName} at ${safeUri}`);
      console.log(`                 ${s.collections.length} collections, ${total} documents`);
      console.log(`                 open Compass at ${safeUri} to browse them`);
      if (safeUri !== dbConfig.uri) {
        console.log('                 (password hidden — use the string from your own .env)');
      }
      console.log('');
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
