const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/billing.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.get('/', ctrl.getMyPayments);
router.get('/receipt/:id', ctrl.getReceipt);

/** Pay for a booking the counselor already accepted (original flow, unchanged). */
router.post('/pay',
  [
    body('appointmentId').notEmpty().withMessage('appointmentId is required'),
    body('method').notEmpty().withMessage('Choose a payment method'),
  ],
  validate, ctrl.pay
);

/* ── Pay-before-booking, via Razorpay ── */

/** Whether Checkout is available, and the publishable key id. */
router.get('/config', ctrl.getConfig);

/**
 * Step 1 — create the payment order.
 * Note there is no `price` field: the fee is read from the counselor's record
 * server-side, so a tampered client cannot set its own amount.
 */
router.post('/order',
  [
    body('counselorId').notEmpty().withMessage('Choose a counselor'),
    body('date').notEmpty().withMessage('Choose a date'),
    body('time').notEmpty().withMessage('Choose a time'),
  ],
  validate, ctrl.createOrder
);

/** Step 2 — verify Razorpay's signature and create the appointment. */
router.post('/verify',
  [
    body('razorpay_order_id').notEmpty().withMessage('Missing order id'),
    body('razorpay_payment_id').notEmpty().withMessage('Missing payment id'),
    body('razorpay_signature').notEmpty().withMessage('Missing signature'),
  ],
  validate, ctrl.verifyAndBook
);

/** The customer dismissed the payment sheet, or it failed. */
router.post('/abandon',
  [body('orderId').notEmpty().withMessage('Missing order id')],
  validate, ctrl.abandonOrder
);

module.exports = router;
