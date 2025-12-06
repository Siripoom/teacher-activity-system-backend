import express from 'express';
import {
  createMajor,
  getAllMajors,
  getMajorById,
  updateMajor,
  deleteMajor
} from '../controllers/majorController.js';

const router = express.Router();

// POST /api/majors
router.post('/', createMajor);

// GET /api/majors
router.get('/', getAllMajors);

// GET /api/majors/:id
router.get('/:id', getMajorById);

// PUT /api/majors/:id
router.put('/:id', updateMajor);

// DELETE /api/majors/:id
router.delete('/:id', deleteMajor);

export default router;
