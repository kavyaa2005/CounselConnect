const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/mood.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);
router.get('/', ctrl.getHistory);
router.get('/streak', ctrl.getStreak);
router.get('/stats', ctrl.getStats);
router.get('/history', ctrl.getFullHistory);
router.get('/report', ctrl.getReport);
router.get('/report.pdf', ctrl.downloadReport);
router.post('/',
  [
    body('value').isInt({ min: 1, max: 5 }).withMessage('Mood value must be 1–5'),
    body('label').notEmpty().withMessage('Mood label is required'),
    body('intensity').optional({ nullable: true }).isInt({ min: 1, max: 10 })
      .withMessage('Intensity must be 1–10'),
  ],
  validate, ctrl.logMood
);

module.exports = router;
