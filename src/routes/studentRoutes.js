import express from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} from '../controllers/studentController.js';
import { authMiddleware } from '../middleware/middleware.js';

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const idValidationRule = [
  param('id').isUUID(4).withMessage('Student ID must be a valid UUID v4.')
];

const createStudentValidationRules = [
  body('fullname').trim().notEmpty().withMessage('Fullname is required.'),
  body('departmentId').isUUID(4).withMessage('A valid Department ID is required.'),
  body('birthdate').isISO8601().toDate().withMessage('A valid birthdate is required (format: YYYY-MM-DD).'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number format.'),
  body('status').optional().isIn(['active', 'graduated', 'expelled']).withMessage('Invalid status. Must be one of: active, graduated, expelled.')
];

const updateStudentValidationRules = [
  body('fullname').optional().trim().notEmpty().withMessage('Fullname cannot be empty.'),
  body('departmentId').optional().isUUID(4).withMessage('Department ID must be a valid UUID.'),
  body('birthdate').optional().isISO8601().toDate().withMessage('Birthdate must be a valid date (format: YYYY-MM-DD).'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number format.'),
  body('status').optional().isIn(['active', 'graduated', 'expelled']).withMessage('Invalid status.')
];

router.use(authMiddleware)

router.route('/')
  .get(getAllStudents)
  .post(createStudentValidationRules, validateRequest, createStudent);

router.route('/:id')
  .get(idValidationRule, validateRequest, getStudentById)
  .put([...idValidationRule, ...updateStudentValidationRules], validateRequest, updateStudent)
  .delete(idValidationRule, validateRequest, deleteStudent);

export default router;