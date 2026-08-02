const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/sessionNotes.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/',
  [body('content').trim().notEmpty().withMessage('Write something first')],
  validate, ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
