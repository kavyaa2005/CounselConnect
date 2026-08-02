const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/billing.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.get('/', ctrl.getMyPayments);
router.get('/receipt/:id', ctrl.getReceipt);
router.post('/pay',
  [
    body('appointmentId').notEmpty().withMessage('appointmentId is required'),
    body('method').notEmpty().withMessage('Choose a payment method'),
  ],
  validate, ctrl.pay
);

module.exports = router;
