import express from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  joinActivity,
  updateAttendanceStatus,
  leaveActivity,
  getActivityAttendances
} from '../controllers/attendanceController.js';

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
const router = express.Router();

const attendanceIdRule = [
  param('attendanceId').isUUID(4).withMessage('Attendance ID must be a valid UUID v4.')
];


const updateStatusRules = [
  body('status')
    .trim()
    .notEmpty().withMessage('Status is required.')
    .isIn(['joined', 'accepted', 'rejected', 'Inprogress', 'completed', 'uncompleted'])
    .withMessage('Invalid status value.')
];


router.put('/:attendanceId',
  [...attendanceIdRule, ...updateStatusRules],
  validateRequest,
  updateAttendanceStatus
);

router.delete('/:attendanceId',
  attendanceIdRule,
  validateRequest,
  leaveActivity
);


const activityRouter = express.Router({ mergeParams: true });


const joinActivityRules = [
  param('activityId').isUUID(4).withMessage('Activity ID in URL must be a valid UUID v4.'),
  body('studentId').trim().notEmpty().withMessage('studentId is required in the body.')
];

const getActivityAttendancesRule = [
  param('activityId').isUUID(4).withMessage('Activity ID in URL must be a valid UUID v4.')
];


activityRouter.post('/attend',
  joinActivityRules,
  validateRequest,
  joinActivity
);

activityRouter.get('/attendances',
  getActivityAttendancesRule,
  validateRequest,
  getActivityAttendances
);

export { router as attendanceRouter, activityRouter };