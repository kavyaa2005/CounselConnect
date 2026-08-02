const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.post('/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate, ctrl.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate, ctrl.login
);

router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
/* ── Password reset ── */
router.post('/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  validate, ctrl.forgotPassword
);
router.post('/verify-reset-code',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code'),
  ],
  validate, ctrl.verifyResetCode
);
router.post('/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('ticket').notEmpty().withMessage('Verify your code first'),
    body('password').isLength({ min: 8 }).withMessage('Use at least 8 characters'),
  ],
  validate, ctrl.resetPassword
);

/* ── Two-factor ── */
// Verify is public: the caller holds a challenge token, not a session yet.
router.post('/2fa/verify',
  [
    body('challenge').notEmpty().withMessage('Missing sign-in challenge'),
    body('code').notEmpty().withMessage('Enter your code'),
  ],
  validate, ctrl.twoFactorVerify
);

router.get('/2fa', authenticate, ctrl.twoFactorStatus);
router.post('/2fa/setup', authenticate, ctrl.twoFactorSetup);
router.post('/2fa/confirm',
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code')],
  validate, authenticate, ctrl.twoFactorConfirm
);
router.post('/2fa/disable',
  [body('password').notEmpty().withMessage('Confirm your password')],
  validate, authenticate, ctrl.twoFactorDisable
);

module.exports = router;
