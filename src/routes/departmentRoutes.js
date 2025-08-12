import express from "express";
import { body, validationResult } from 'express-validator';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/departmentController.js";

const route = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

route.route("/")
  .get(getAllDepartments)
  .post(
    [
      body('name')
        .trim()
        .notEmpty().withMessage('Department name is required.'),

      body('shortName')
        .trim()
        .notEmpty().withMessage('Short name is required.')
        .isLength({ max: 10 }).withMessage('Short name must not exceed 10 characters.')
    ],
    validateRequest,
    createDepartment
  );

route.route("/:id")
  .get(getDepartmentById)
  .put(
    [
      body('name')
        .optional()
        .trim()
        .notEmpty().withMessage('Department name cannot be empty if provided.'),

      body('shortName')
        .optional()
        .trim()
        .notEmpty().withMessage('Short name cannot be empty if provided.')
        .isLength({ max: 10 }).withMessage('Short name must not exceed 10 characters.')
    ],
    validateRequest,
    updateDepartment
  )
  .delete(deleteDepartment);

export default route;