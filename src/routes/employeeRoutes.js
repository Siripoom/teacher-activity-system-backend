import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeControllers.js';

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const createEmployeeValidationRules = [
  body('fullname').trim().notEmpty().withMessage('Fullname is required.'),
  body('email').isEmail().withMessage('Must be a valid email address.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number format.'),
  body('departmentId').optional({ nullable: true }).isUUID().withMessage('Department ID must be a valid UUID format.'),
  body('role').optional().isIn(['admin', 'teacher']).withMessage('Invalid role. Must be admin or teacher.')
];

const updateEmployeeValidationRules = [
  body('fullname').optional().trim().notEmpty().withMessage('Fullname cannot be empty.'),
  body('email').optional().isEmail().withMessage('Must be a valid email address if provided.'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long if provided.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number format if provided.'),
  body('departmentId').optional({ nullable: true }).isUUID().withMessage('Department ID must be a valid UUID format if provided.'),
  body('role').optional().isIn(['admin', 'teacher']).withMessage('Invalid role. Must be admin or teacher if provided.')
];

router.route('/')
  .get(getAllEmployees)
  .post(createEmployeeValidationRules, validateRequest, createEmployee);

router.route('/:id')
  .get(getEmployeeById)
  .put(updateEmployeeValidationRules, validateRequest, updateEmployee)
  .delete(deleteEmployee);

export default router;