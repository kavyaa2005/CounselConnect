const router = require('express').Router();
const ctrl = require('../controllers/video.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Users and doctors both use these; each only ever sees their own contacts.
router.use(authenticate);

router.get('/contacts', ctrl.getContacts);
router.get('/history', ctrl.getHistory);
router.get('/stats', ctrl.getStats);
router.get('/check', ctrl.checkPeer);

module.exports = router;
