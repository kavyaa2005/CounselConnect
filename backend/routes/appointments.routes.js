const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { body } = require('express-validator');
const ctrl = require('../controllers/appointments.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { APPT_DOC_DIR } = require('../services/appointments.paths');

// Client-attached files (intake forms, prior reports) are private — stored
// outside the statically served uploads folder, same as clinical documents.
fs.mkdirSync(APPT_DOC_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, APPT_DOC_DIR),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/\.(pdf|docx?|png|jpe?g|webp|txt)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, Word, text or image files are accepted'));
  },
});

router.use(authenticate);
router.get('/', ctrl.getAppointments);
router.get('/:id', ctrl.getAppointment);
router.post('/',
  [
    body('counselorId').notEmpty().withMessage('counselorId is required'),
    body('counselorName').notEmpty().withMessage('counselorName is required'),
    body('sessionType').isIn(['video', 'chat']).withMessage('sessionType must be video or chat'),
    body('mode').optional().isIn(['online', 'offline', 'in-person']).withMessage('mode must be online or offline'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Keep the reason under 500 characters'),
    body('date').notEmpty().withMessage('date is required'),
    body('time').notEmpty().withMessage('time is required'),
  ],
  validate, ctrl.bookAppointment
);
router.put('/:id', ctrl.updateAppointment);
router.put('/:id/reschedule',
  [
    body('date').notEmpty().withMessage('Pick a new date'),
    body('time').notEmpty().withMessage('Pick a new time'),
  ],
  validate, ctrl.reschedule);

// Attachments
router.post('/:id/documents', upload.single('file'), ctrl.uploadDocument);
router.get('/:id/documents/:docId', ctrl.downloadDocument);
router.delete('/:id/documents/:docId', ctrl.deleteDocument);

// Printable details sheet
router.get('/:id/details.pdf', ctrl.downloadDetails);

module.exports = router;
