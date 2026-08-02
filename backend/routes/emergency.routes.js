const router = require('express').Router();
const ctrl = require('../controllers/emergency.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Deliberately NOT authenticated — someone in crisis may be logged out, or
// have a session that just expired. Helplines should never be gated.
router.get('/resources', ctrl.resources);

router.get('/contact', authenticate, ctrl.getContact);
router.put('/contact', authenticate, ctrl.saveContact);
router.delete('/contact', authenticate, ctrl.removeContact);
router.post('/log', authenticate, ctrl.log);

module.exports = router;
