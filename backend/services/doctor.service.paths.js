// Where doctor-uploaded documents are stored.
//
// Deliberately OUTSIDE `uploads/`, which app.js serves statically at /uploads —
// clinical documents must only ever be reachable through an authenticated route.
const path = require('path');

const DOC_DIR = path.join(__dirname, '../private/documents');

module.exports = { DOC_DIR };
