// MongoDB connection settings.
//
// Defaults point at a stock local install, so a fresh clone works with
// MongoDB Community running on its default port and nothing else configured.

require('dotenv').config();

module.exports = {
  /** Standard local MongoDB. Override with MONGODB_URI in .env for Atlas. */
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',

  /** The database that shows up in Compass. */
  dbName: process.env.MONGODB_DB || 'counselconnect',

  /** Fail fast rather than hanging the boot if mongod isn't running. */
  serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 5000),

  /**
   * When true and MongoDB can't be reached, the server keeps running on the
   * JSON files instead of refusing to start. Handy during development; set
   * MONGODB_REQUIRED=true if you'd rather know immediately.
   */
  required: String(process.env.MONGODB_REQUIRED || 'false').toLowerCase() === 'true',
};
