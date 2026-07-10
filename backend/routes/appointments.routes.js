const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/appointments.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);
router.get('/', ctrl.getAppointments);
router.get('/:id', ctrl.getAppointment);
router.post('/',
  [
    body('counselorId').notEmpty().withMessage('counselorId is required'),
    body('counselorName').notEmpty().withMessage('counselorName is required'),
    body('sessionType').isIn(['video', 'chat']).withMessage('sessionType must be video or chat'),
    body('date').notEmpty().withMessage('date is required'),
    body('time').notEmpty().withMessage('time is required'),
  ],
  validate, ctrl.bookAppointment
);
router.put('/:id', ctrl.updateAppointment);

module.exports = router;
