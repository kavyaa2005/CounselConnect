const app = require('./app');
const { port, nodeEnv } = require('./config/app.config');

const server = app.listen(port, () => {
  console.log(`\n🌿 CounselConnect API`);
  console.log(`   Environment : ${nodeEnv}`);
  console.log(`   Port        : ${port}`);
  console.log(`   Health      : http://localhost:${port}/api/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});

module.exports = server;
