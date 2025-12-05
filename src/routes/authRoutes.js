import express from "express";
import {
  register,
  login,
  getMe,
  changePassword,
  resetPassword,
  logout,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/middleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes (ต้อง authenticate)
router.get("/me", authenticate, getMe);
router.post("/change-password", authenticate, changePassword);
router.post("/reset-password/:userId", authenticate, resetPassword);
router.post("/logout", authenticate, logout);

export default router;
