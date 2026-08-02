const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/feedback.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.get('/', ctrl.getMine);
router.get('/counselor/:counselorId', ctrl.forCounselor);
router.post('/',
  [
    body('counselorId').notEmpty().withMessage('counselorId is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5 stars'),
  ],
  validate, ctrl.submit
);

module.exports = router;
