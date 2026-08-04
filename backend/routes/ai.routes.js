const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);
router.post('/match',
  [body('answers').isArray({ min: 1 }).withMessage('answers must be a non-empty array')],
  validate, ctrl.match
);
router.get('/recommended', ctrl.getRecommended);
router.get('/insights', ctrl.getInsights);
router.get('/summary', ctrl.getSummary);

module.exports = router;
