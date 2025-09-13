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
  param('id').trim().notEmpty().withMessage('Student ID in URL parameter is required.')
];

const createStudentValidationRules = [
  body('id')
    .trim()
    .notEmpty().withMessage('Student ID is required.')
    .isAlphanumeric().withMessage('Student ID should contain only letters and numbers.'),
  // .isLength({ min: 8, max: 10 }).withMessage('Student ID must be between 8 and 10 characters.'),
  body('fullname').trim().notEmpty().withMessage('Fullname is required.'),
  body('departmentId').isUUID(4).withMessage('A valid Department ID is required.'),
  body('birthday').isISO8601().toDate().withMessage('A valid birthdate is required (format: DD-MM-YYYY).'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number format.'),
  body('status').optional().isIn(['active', 'graduated', 'expelled']).withMessage('Invalid status. Must be one of: active, graduated, expelled.'),
  body('profilePic').optional({ checkFalsy: true }).isURL().withMessage('Profile picture must be a valid URL.')
];

const updateStudentValidationRules = [
  body('fullname').optional().trim().notEmpty().withMessage('Fullname cannot be empty.'),
  body('departmentId').optional().isUUID(4).withMessage('Department ID must be a valid UUID.'),
  body('birthday').optional().isISO8601().toDate().withMessage('Birthdate must be a valid date (format: DD-MM-YYYY).'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number format.'),
  body('status').optional().isIn(['active', 'graduated', 'expelled']).withMessage('Invalid status.'),
  body('profilePic').optional({ checkFalsy: true }).isURL().withMessage('Profile picture must be a valid URL.')
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