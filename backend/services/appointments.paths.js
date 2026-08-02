// Where client-attached appointment files live.
//
// Outside `uploads/` (served statically at /uploads) so intake forms and
// medical history are only reachable through an authenticated route.
const path = require('path');

const APPT_DOC_DIR = path.join(__dirname, '../private/appointments');

module.exports = { APPT_DOC_DIR };
