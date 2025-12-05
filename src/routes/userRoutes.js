import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  permanentDeleteUser,
  getAllEmployees,
  getAllStudents,
} from "../controllers/userController.js";

const router = express.Router();

// User routes (ทั้งหมด)
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.delete("/:id/permanent", permanentDeleteUser);

// Employee routes (admin + teacher)
router.get("/employees/all", getAllEmployees);

// Student routes
router.get("/students/all", getAllStudents);

export default router;
