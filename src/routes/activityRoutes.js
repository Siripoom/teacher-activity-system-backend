import express from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const idValidationRule = [param('id').isUUID(4).withMessage('Activity ID must be a valid UUID v4.')];

const activityValidationRules = [
  body('name').trim().notEmpty().withMessage('Activity name is required.'),
  body('date').isISO8601().toDate().withMessage('A valid date is required (format: YYYY-MM-DDTHH:mm:ss.sssZ).'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('departmentId').isUUID(4).withMessage('A valid Department ID is required.'),
  body('employeeId').isUUID(4).withMessage('A valid Employee ID is required.'),
  body('peopleCount').optional({ nullable: true }).isInt({ min: 0 }).withMessage('People count must be a non-negative integer.'),
  body('maxPeopleCount').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Max people count must be a positive integer.'),
  body('hour').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Hour must be a positive integer.'),
  body('status').optional().isIn(['planned', 'inprogress', 'completed', 'cancelled']).withMessage('Invalid status.')
];

router.route('/')
  .get(getAllActivities)
  .post(activityValidationRules, validateRequest, createActivity);

router.route('/:id')
  .get(idValidationRule, validateRequest, getActivityById)
  .put(idValidationRule, validateRequest, updateActivity)
  .delete(idValidationRule, validateRequest, deleteActivity);

export default router;