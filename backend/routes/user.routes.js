const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.use(authenticate);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.post('/profile/photo', upload.single('photo'), ctrl.uploadPhoto);
router.put('/settings/notifications', ctrl.updateNotifications);
router.put('/settings/privacy', ctrl.updatePrivacy);
router.delete('/account', ctrl.deleteAccount);

module.exports = router;
