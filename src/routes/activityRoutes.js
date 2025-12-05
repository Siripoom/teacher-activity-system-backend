import express from "express";
import {
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivitiesByResponsible,
} from "../controllers/activityController.js";

const router = express.Router();

router.get("/", getAllActivities);
router.get("/:id", getActivityById);
router.post("/", createActivity);
router.put("/:id", updateActivity);
router.delete("/:id", deleteActivity);
router.get("/responsible/:userId", getActivitiesByResponsible);

export default router;
