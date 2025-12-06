import express from 'express';
import {
  createTypeActivity,
  getAllTypeActivities,
  getTypeActivityById,
  updateTypeActivity,
  deleteTypeActivity
} from '../controllers/typeActivityController.js';

const router = express.Router();

// POST /api/type-activities
router.post('/', createTypeActivity);

// GET /api/type-activities
router.get('/', getAllTypeActivities);

// GET /api/type-activities/:id
router.get('/:id', getTypeActivityById);

// PUT /api/type-activities/:id
router.put('/:id', updateTypeActivity);

// DELETE /api/type-activities/:id
router.delete('/:id', deleteTypeActivity);

export default router;
