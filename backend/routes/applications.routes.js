const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ctrl = require('../controllers/applications.controller');
const { CERT_DIR } = require('../services/applications.service');

// Certificates live in their own folder, away from public avatar uploads.
// Nothing in here is statically served — access goes through an admin route.
fs.mkdirSync(CERT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CERT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|jpe?g|png|webp)$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG or WEBP files are accepted'));
  },
});

// Public — anyone can apply to become a counselor
router.post(
  '/',
  upload.fields([
    { name: 'degree', maxCount: 3 },
    { name: 'certifications', maxCount: 3 },
  ]),
  ctrl.submit
);

router.get('/status', ctrl.status);

module.exports = router;
