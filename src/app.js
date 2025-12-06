import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import prisma from "./config/db.js"; // นำ Prisma Client มาใช้
import multer from "multer";
import { parse } from "csv-parse";
import fs from "fs";

// Import routes
import userRoutes from "./routes/userRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import majorRoutes from "./routes/majorRoutes.js";
import typeActivityRoutes from "./routes/typeActivityRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Use Routes
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/majors", majorRoutes);
app.use("/api/type-activities", typeActivityRoutes);

const upload = multer({ dest: "uploads/" });

app.get("/", async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อกับ DB
    await prisma.$connect();
    res.json({ message: "API is running!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

export default app;
