import express from "express";
import multer from "multer";
import path from "path";
import {
  getAllFileActivities,
  getFileActivityById,
  uploadFileActivity,
  deleteFileActivity,
  downloadFileActivity,
  getFilesByActivity,
  uploadMultipleFileActivities,
} from "../controllers/fileController.js";
import { authenticate } from "../middleware/middleware.js";

const router = express.Router();

// กำหนดการจัดเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/fileActivities/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// กรองประเภทไฟล์
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|zip|rar/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "ประเภทไฟล์ไม่ถูกต้อง! อนุญาตเฉพาะ jpeg, jpg, png, pdf, doc, docx, xls, xlsx, zip, rar"
      )
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // จำกัดขนาดไฟล์ 10MB
  },
  fileFilter: fileFilter,
});

// Routes
router.get("/", authenticate, getAllFileActivities);
router.get("/:id", authenticate, getFileActivityById);
router.post("/upload", authenticate, upload.single("file"), uploadFileActivity);
router.post(
  "/upload-multiple",
  authenticate,
  upload.array("files", 10),
  uploadMultipleFileActivities
);
router.delete("/:id", authenticate, deleteFileActivity);
router.get("/:id/download", authenticate, downloadFileActivity);
router.get("/activity/:activityId", authenticate, getFilesByActivity);

export default router;
