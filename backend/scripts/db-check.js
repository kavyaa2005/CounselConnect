/**
 * Diagnoses a MongoDB connection string.
 *
 *   npm run db:check                          # checks MONGODB_URI from backend/.env
 *   npm run db:check -- "mongodb+srv://..."   # checks a string you paste in
 *
 * Atlas reports almost every problem as the same three words — "bad auth :
 * authentication failed" — whether you forgot to replace the password
 * placeholder, left the angle brackets in, used a password with an unescaped
 * `@`, or created the user in a different project. This checks each of those
 * causes separately and names the one that applies, then actually connects and
 * confirms the user can write.
 *
 * It never prints your password.
 */

require('dotenv').config();

const { analyzeUri } = require('../utils/mongoUri.utils');

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

// Quotes are stripped here because Windows cmd keeps them when the argument
// contains no spaces, and they would then look like part of the password.
const uri = (process.argv[2] || process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');

console.log('');
if (!uri) {
  console.log(c.red('No connection string found.'));
  console.log('  Set MONGODB_URI in backend/.env, or pass one:');
  console.log(c.dim('    npm run db:check -- "mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/"'));
  process.exit(1);
}

/* ────────────────── 1. Check the string before dialling ────────────────── */

const info = analyzeUri(uri);
const dbName = process.env.MONGODB_DB || 'counselconnect';

console.log(c.bold('Connection string'));
console.log(`  scheme    ${info.scheme === 'mongodb+srv' ? 'mongodb+srv (Atlas)' : info.scheme ? 'mongodb (direct)' : c.red('(invalid)')}`);
console.log(`  username  ${info.user || c.red('(missing)')}`);
console.log(`  password  ${info.hasPassword ? c.dim(`${info.passwordLength} characters, hidden`) : c.red('(missing)')}`);
console.log(`  host      ${info.host || c.red('(missing)')}`);
console.log(`  database  ${dbName}`);
console.log('');

if (info.problems.length) {
  console.log(c.red(c.bold(`Found ${info.problems.length} problem(s) in the string itself:`)));
  info.problems.forEach((p, i) => {
    console.log(`\n  ${i + 1}. ${c.yellow(p.what)}`);
    console.log(`     ${p.fix}`);
  });
  console.log('\nFix these first, then run this again.\n');
  process.exit(1);
}

console.log(c.green('The string looks well-formed.') + ' Trying to connect…\n');

/* ────────────────────────── 2. Actually connect ────────────────────────── */

const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    console.log(c.green(c.bold('Connected successfully.')));
    console.log(`  database    ${dbName}`);
    console.log(`  collections ${collections.length}`);

    if (collections.length) {
      let total = 0;
      for (const col of collections) total += await db.collection(col.name).countDocuments();
      console.log(`  documents   ${total}`);
    } else {
      console.log(c.dim('  (empty — the server will import backend/data/*.json on first boot)'));
    }

    // Writing is a separate permission from reading, and Atlas users are
    // sometimes created read-only by accident.
    try {
      const probe = db.collection('__db_check__');
      await probe.insertOne({ at: new Date() });
      await probe.drop();
      console.log(c.green('  write access confirmed'));
    } catch {
      console.log(c.red('  READ-ONLY: this user cannot write.'));
      console.log('    Atlas → Database Access → edit the user → "Read and write to any database".');
    }
    console.log('');
  } catch (err) {
    const msg = String(err.message || err);
    console.log(c.red(c.bold('Could not connect.')));
    console.log(c.dim(`  ${msg}\n`));

    if (/bad auth|Authentication failed|AuthenticationFailed/i.test(msg)) {
      console.log(c.bold('  Atlas rejected the username or password.'));
      console.log('  The string is formatted correctly, so it is one of these:\n');
      console.log('   1. The password is wrong. Atlas → Database Access → your user');
      console.log('      → Edit → Edit Password. Use letters and numbers only, then');
      console.log('      update MONGODB_URI everywhere it appears.');
      console.log(`   2. The username is wrong. Check "${info.user}" appears under Database Access.`);
      console.log('   3. The user was created in a different Atlas project than the cluster.');
      console.log('      Check the project name at the top-left of the Atlas dashboard.');
      console.log('   4. The user authenticates by certificate rather than password.');
      console.log('      It should say SCRAM under Authentication Method.\n');
    } else if (/ENOTFOUND|querySrv|getaddrinfo/i.test(msg)) {
      console.log(c.bold('  The cluster hostname could not be resolved.'));
      console.log('  Re-copy the string from Atlas → Connect → Drivers.\n');
    } else if (/timed out|ETIMEDOUT|ECONNREFUSED|ServerSelectionTimeout|connection.*closed/i.test(msg)) {
      console.log(c.bold('  Reached the network but got no answer.'));
      console.log('  Usually the IP access list. Atlas → Network Access → Add IP Address');
      console.log('  → Allow Access from Anywhere (0.0.0.0/0) → wait for status Active.\n');
    } else {
      console.log('  Check Atlas → Network Access allows your address, and that the');
      console.log('  cluster is running (not paused).\n');
    }
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
})();
