const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/support.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// FAQ is public — it's the first thing someone locked out will reach for.
router.get('/faq', ctrl.faq);

router.use(authenticate);
router.get('/tickets', ctrl.myTickets);
router.post('/tickets',
  [
    body('subject').trim().notEmpty().withMessage('Give your ticket a subject'),
    body('message').trim().isLength({ min: 10 }).withMessage('Tell us a bit more'),
  ],
  validate, ctrl.createTicket);
router.get('/tickets/:id', ctrl.myTicket);
router.post('/tickets/:id/reply',
  [body('text').trim().notEmpty().withMessage('Write something first')],
  validate, ctrl.replyAsUser);

module.exports = router;
