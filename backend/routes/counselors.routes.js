const router = require('express').Router();
const ctrl = require('../controllers/counselors.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getCounselors);
router.get('/:id', ctrl.getCounselor);
router.get('/:id/reviews', ctrl.getReviews);
router.get('/:id/slots', ctrl.getSlots);

module.exports = router;
