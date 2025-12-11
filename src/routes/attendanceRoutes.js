import express from "express";
import {
  getAllAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendancesByUser,
  getAttendancesByActivity,
  completeAttendanceIfInProgress,
  getAttendancesByUserAndYear,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.get("/", getAllAttendances);
router.get("/:id", getAttendanceById);
router.post("/", createAttendance);
router.post("/complete", completeAttendanceIfInProgress);
router.put("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);
router.get("/user/:userId", getAttendancesByUser);
router.get("/user/:userId/year", getAttendancesByUserAndYear);
router.get("/activity/:activityId", getAttendancesByActivity);

export default router;
