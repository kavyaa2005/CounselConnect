const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/messages.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);
router.get('/conversations', ctrl.getConversations);
router.get('/:conversationId', ctrl.getMessages);
router.post('/init/:counselorId', ctrl.initConversation);
router.post('/send',
  [
    body('counselorId').notEmpty().withMessage('counselorId is required'),
    body('text').trim().notEmpty().withMessage('Message text is required'),
  ],
  validate, ctrl.sendMessage
);

module.exports = router;
