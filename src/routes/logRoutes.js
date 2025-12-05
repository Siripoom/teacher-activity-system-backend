import express from "express";
import {
  getAllLogs,
  getLogById,
  createLog,
  deleteLog,
  deleteOldLogs,
  getLogStats,
} from "../controllers/logController.js";
import { authenticate } from "../middleware/middleware.js";

const router = express.Router();

// ทุก route ต้อง authenticate
router.get("/", authenticate, getAllLogs);
router.get("/stats", authenticate, getLogStats);
router.get("/:id", authenticate, getLogById);
router.post("/", authenticate, createLog);
router.delete("/:id", authenticate, deleteLog);
router.post("/delete-old", authenticate, deleteOldLogs);

export default router;
