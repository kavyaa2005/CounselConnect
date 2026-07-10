const router = require('express').Router();
const ctrl = require('../controllers/counselors.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getCounselors);
router.get('/:id', ctrl.getCounselor);

module.exports = router;
