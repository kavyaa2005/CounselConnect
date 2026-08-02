const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { body } = require('express-validator');
const ctrl = require('../controllers/messages.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { CHAT_DIR } = require('../services/chat.paths');

fs.mkdirSync(CHAT_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CHAT_DIR),
    filename: (req, file, cb) => {
      // Voice notes arrive as a blob with no useful name — give them one.
      const ext = path.extname(file.originalname) || (file.mimetype.includes('audio') ? '.webm' : '');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext.toLowerCase()}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|docx?|png|jpe?g|webp|gif|txt|mp3|wav|webm|ogg|m4a)$/i.test(file.originalname)
      || /^(audio|image)\//.test(file.mimetype);
    cb(ok ? null : new Error('That file type is not supported'), ok);
  },
});

router.use(authenticate);
router.get('/conversations', ctrl.getConversations);
router.get('/:conversationId', ctrl.getMessages);
router.post('/init/:counselorId', ctrl.initConversation);
router.post('/:counselorId/attach', upload.single('file'), ctrl.attach);
router.get('/:counselorId/attachments/:attachmentId', ctrl.downloadAttachment);
router.post('/:counselorId/read', ctrl.markRead);
router.post('/send',
  [
    body('counselorId').notEmpty().withMessage('counselorId is required'),
    body('text').trim().notEmpty().withMessage('Message text is required'),
  ],
  validate, ctrl.sendMessage
);

module.exports = router;
