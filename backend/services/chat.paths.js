// Chat attachments and voice notes.
//
// Private by design — counselling attachments must never be guessable URLs,
// so they live outside the statically served uploads folder.
const path = require('path');

const CHAT_DIR = path.join(__dirname, '../private/chat');

module.exports = { CHAT_DIR };
