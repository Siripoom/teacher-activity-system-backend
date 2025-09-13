import express from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/fileActivities'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const upload = multer({ storage });
import {authMiddleware} from '../middleware/middleware.js';

const router = express.Router();

// const validateRequest = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }
//   next();
// };

// const idValidationRule = [param('id').isUUID(4).withMessage('Activity ID must be a valid UUID v4.')];

// const activityValidationRules = [
//   body('name').trim().notEmpty().withMessage('Activity name is required.'),
//   body('date').isISO8601().toDate().withMessage('A valid date is required (format: YYYY-MM-DDTHH:mm:ss.sssZ).'),
//   body('address').trim().notEmpty().withMessage('Address is required.'),
//   body('departmentId').isUUID(4).withMessage('A valid Department ID is required.'),
//   body('employeeId').isUUID(4).withMessage('A valid Employee ID is required.'),
//   body('peopleCount').optional({ nullable: true }).isInt({ min: 0 }).withMessage('People count must be a non-negative integer.'),
//   body('maxPeopleCount').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Max people count must be a positive integer.'),
//   body('hour').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Hour must be a positive integer.'),
//   body('status').optional().isIn(['planned', 'inprogress', 'completed', 'cancelled']).withMessage('Invalid status.')
// ];

// router.use(authMiddleware); // Apply authentication middleware to all routes
router.route('/')
  .get(getAllActivities)
  .post(upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'pdf', maxCount: 3 }
  ]), createActivity);

router.route('/:id')
  .get(getActivityById)
  .put(updateActivity)
  .delete(deleteActivity);

export default router;