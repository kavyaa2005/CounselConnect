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
   * Whether an unreachable MongoDB is fatal.
   *
   * On a laptop, falling back to the JSON files is convenient — you can keep
   * working with mongod stopped. On a deployed server it is dangerous: the disk
   * is wiped on every restart and redeploy, so the app would appear to work
   * while quietly writing every new booking, payment and message to storage
   * that is about to be thrown away, and none of it would ever reach Atlas.
   *
   * So this defaults to ON in production and OFF in development. Either can be
   * overridden explicitly with MONGODB_REQUIRED.
   */
  // A blank value (`MONGODB_REQUIRED=` with nothing after it, which is easy to
  // leave behind in a .env or a host's settings panel) counts as not set, not
  // as false — otherwise an empty box would quietly disable the guard.
  required: String(process.env.MONGODB_REQUIRED ?? '').trim() !== ''
    ? String(process.env.MONGODB_REQUIRED).trim().toLowerCase() === 'true'
    : process.env.NODE_ENV === 'production',
};
