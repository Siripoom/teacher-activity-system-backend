import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
// import prisma from './config/db.js'; // นำ Prisma Client มาใช้
import multer from 'multer';
import { parse } from 'csv-parse';
import fs from 'fs';
import employeeRoutes from './routes/employeeRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import testUploadRoute from './routes/testUploadRoute.js';
import activityRoutes from './routes/activityRoutes.js';
import { attendanceRouter, activityRouter } from './routes/attendanceRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import logRoutes from './routes/logRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();


app.use(cors());
app.use(express.json());

// use Routes
app.use('/api/auth', authRoutes); // Serve static files from 'public' directory
app.use('/api/employees', employeeRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/test', testUploadRoute);
app.use('/api/activities', activityRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/logs', logRoutes)
app.use('/api/attendances', attendanceRouter);
app.use('/api/activities/:activityId', activityRouter);

const upload = multer({ dest: 'uploads/' });

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