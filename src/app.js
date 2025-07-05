import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
// import prisma from './config/db.js'; // นำ Prisma Client มาใช้
import multer from 'multer';
import { parse } from 'csv-parse';
import fs from 'fs';
import employeeRoutes from './routes/employeeRoutes.js'; // นำเข้า employeeRoutes
import studentRoutes from './routes/studentRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import testUploadRoute from './routes/testUploadRoute.js'


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// use Routes
app.use('/api/employee', employeeRoutes); // ใช้ employeeRoutes
app.use('/api/student', studentRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/test', testUploadRoute);

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

app.post('/upload-csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        res.json({ data: results });
      })
      .on('error', (err) => {
        res.status(500).json({ error: err.message });
      });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }

});

export default app;