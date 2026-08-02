const app = require('./app');
const { port, nodeEnv } = require('./config/app.config');
const { attachSignaling } = require('./realtime/signaling');

const server = app.listen(port, () => {
  console.log(`\n🌿 CounselConnect API`);
  console.log(`   Environment : ${nodeEnv}`);
  console.log(`   Port        : ${port}`);
  console.log(`   Health      : http://localhost:${port}/api/health`);
  console.log(`   Video calls : signaling live on ws://localhost:${port}\n`);
});

// WebRTC signaling shares the same port as the REST API
const io = attachSignaling(server);
app.set('io', io);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  io.close();
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down...');
  io.close();
  server.close(() => process.exit(0));
});

module.exports = server;
