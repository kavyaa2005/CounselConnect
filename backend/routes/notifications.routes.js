const router = require('express').Router();
const ctrl = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getNotifications);
router.put('/:id/read', ctrl.markRead);

module.exports = router;
