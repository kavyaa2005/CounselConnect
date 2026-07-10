const router = require('express').Router();
const ctrl = require('../controllers/journey.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getTimeline);

module.exports = router;
