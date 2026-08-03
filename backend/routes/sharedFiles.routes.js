const router = require('express').Router();
const ctrl = require('../controllers/sharedFiles.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id/download', ctrl.download);

module.exports = router;
