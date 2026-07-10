const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/journal.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);
router.get('/', ctrl.getEntries);
router.get('/:id', ctrl.getEntry);
router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
  ],
  validate, ctrl.createEntry
);
router.put('/:id', ctrl.updateEntry);
router.delete('/:id', ctrl.deleteEntry);

module.exports = router;
