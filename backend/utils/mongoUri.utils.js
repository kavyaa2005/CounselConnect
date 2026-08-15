// Inspects a MongoDB connection string and reports what is wrong with it.
//
// Atlas answers almost every credential problem with the same three words —
// "bad auth : authentication failed" — whether the password placeholder was
// never replaced, the angle brackets were left in, the password contains an
// unescaped '@', or the user belongs to a different project. That single
// message sends people round in circles, so this pulls the string apart and
// names the specific cause.
//
// Nothing here ever returns the password itself, only its length, so the result
// is safe to print in a deploy log.

const RESERVED = ['@', ':', '/', '?', '#', '[', ']'];
const ENCODINGS = {
  '@': '%40', ':': '%3A', '/': '%2F', '?': '%3F',
  '#': '%23', '[': '%5B', ']': '%5D', '%': '%25',
};

/**
 * @param {string} uri
 * @returns {{ scheme, user, host, passwordLength, hasPassword, problems: {what, fix}[] }}
 */
function analyzeUri(rawUri) {
  const uri = String(rawUri || '');
  const problems = [];

  if (!uri.trim()) {
    return {
      scheme: null, user: '', host: '', passwordLength: 0, hasPassword: false,
      problems: [{
        what: 'No connection string is set.',
        fix: 'Set MONGODB_URI in the environment.',
      }],
    };
  }

  // Deliberately checked on the raw value: a stray quote or newline survives a
  // copy-paste into a hosting panel and is invisible in the UI afterwards.
  if (/^["']|["']$/.test(uri)) {
    problems.push({
      what: 'The string is wrapped in quotes.',
      fix: 'Remove the leading and trailing " or \' — an .env file and a hosting panel both store the raw value.',
    });
  }
  if (uri !== uri.trim()) {
    problems.push({
      what: 'The string has whitespace or a line break at one end.',
      fix: 'Re-paste it as a single line with nothing before or after.',
    });
  }
  if (/\s/.test(uri.trim())) {
    problems.push({
      what: 'The string contains a space or line break in the middle.',
      fix: 'It was probably wrapped when pasted. Make it one unbroken line.',
    });
  }

  const trimmed = uri.trim();

  if (trimmed.includes('<') || trimmed.includes('>')) {
    problems.push({
      what: 'The angle brackets from the Atlas template are still in the string.',
      fix: 'Replace <db_password> — brackets included — with the actual password.',
    });
  }
  if (/<?db_password>?|<?password>?/i.test(trimmed) && /[<>]/.test(trimmed)) {
    problems.push({
      what: 'The password placeholder was never replaced.',
      fix: 'Atlas hands you the string with <db_password> as a placeholder. Put the real password there.',
    });
  }
  if (!/^mongodb(\+srv)?:\/\//.test(trimmed)) {
    problems.push({
      what: 'The string does not start with mongodb+srv:// or mongodb://',
      fix: 'Copy it again from Atlas → Connect → Drivers → Node.js.',
    });
  }

  const scheme = trimmed.startsWith('mongodb+srv') ? 'mongodb+srv'
    : trimmed.startsWith('mongodb') ? 'mongodb' : null;

  // Split by hand rather than with a URL parser: an unencoded password is
  // exactly the case a parser mangles or rejects outright.
  const afterScheme = trimmed.replace(/^mongodb(\+srv)?:\/\//, '');
  const at = afterScheme.lastIndexOf('@');

  let user = '', password = '', host = '';
  if (at === -1) {
    problems.push({
      what: 'There is no username:password in the string.',
      fix: 'It should look like mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/',
    });
    host = afterScheme;
  } else {
    const creds = afterScheme.slice(0, at);
    host = afterScheme.slice(at + 1);
    const colon = creds.indexOf(':');
    if (colon === -1) {
      problems.push({
        what: 'There is a username but no password.',
        fix: 'Add :PASSWORD after the username.',
      });
      user = creds;
    } else {
      user = creds.slice(0, colon);
      password = creds.slice(colon + 1);
    }
  }

  // More than one '@' before the host means the password almost certainly
  // contains one and it was never escaped.
  if ((afterScheme.match(/@/g) || []).length > 1) {
    problems.push({
      what: 'The password appears to contain an unescaped "@".',
      fix: 'Write the @ inside the password as %40. Only the @ that separates the password from the hostname stays as it is.',
    });
  }

  if (password) {
    const found = RESERVED.filter(ch => password.includes(ch));
    if (found.length) {
      problems.push({
        what: `The password contains ${found.map(f => `"${f}"`).join(', ')}, which must be percent-encoded.`,
        fix: 'Encode ' + found.map(f => `${f} → ${ENCODINGS[f]}`).join(', ') +
             '. Simpler: set a new password in Atlas using only letters and numbers.',
      });
    }
    if (/%(?![0-9A-Fa-f]{2})/.test(password)) {
      problems.push({
        what: 'The password contains a "%" that is not a valid percent-escape.',
        fix: 'A literal % must be written as %25.',
      });
    }
  }

  const hostOnly = host.split(/[/?]/)[0];
  if (hostOnly && !/mongodb\.net|localhost|127\.0\.0\.1/.test(hostOnly)) {
    problems.push({
      what: `The hostname looks unusual: ${hostOnly}`,
      fix: 'An Atlas hostname ends in .mongodb.net',
    });
  }

  return {
    scheme,
    user,
    host: hostOnly,
    passwordLength: password.length,
    hasPassword: password.length > 0,
    problems,
  };
}

/**
 * A short, safe summary for a log. Shows the username, host and password
 * *length* — enough to tell two strings apart without revealing either.
 */
function describeUri(uri) {
  const a = analyzeUri(uri);
  return [
    `username        ${a.user || '(missing)'}`,
    `password        ${a.hasPassword ? `${a.passwordLength} characters (hidden)` : '(missing)'}`,
    `host            ${a.host || '(missing)'}`,
    `scheme          ${a.scheme || '(invalid)'}`,
  ].join('\n');
}

/**
 * A connection string with the password replaced by asterisks, safe to print
 * or return from an endpoint.
 *
 *   mongodb+srv://user:hunter2@cluster0.abc.mongodb.net/
 *   → mongodb+srv://user:****@cluster0.abc.mongodb.net/
 *
 * This matters more than it looks: /api/health is public and used to return
 * the raw string, which on Atlas means publishing the database password to
 * anyone who asked. On localhost the string held no credentials, so nothing
 * ever looked wrong.
 */
function redactUri(rawUri) {
  const uri = String(rawUri || '');
  if (!uri) return '';
  // `.*` is greedy on purpose, so it runs to the LAST '@'. A lazy match would
  // stop at the first one — and a password containing an unescaped '@' (the
  // single most common mistake here) would leave its tail exposed.
  return uri.replace(
    /^(mongodb(?:\+srv)?:\/\/)([^:/@]+):(.*)@/,
    (_m, scheme, user) => `${scheme}${user}:****@`
  );
}

module.exports = { analyzeUri, describeUri, redactUri, RESERVED, ENCODINGS };
