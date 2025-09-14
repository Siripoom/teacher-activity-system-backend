import express from 'express';
import { getFileById, uploadFile } from '../controllers/fileControllers.js';
import multer from 'multer';
const router = express.Router();

//create log file
const upload = multer({ dest: 'uploads/logStudent' });
router.post('/upload-csv', upload.single('file'), uploadFile);
router.get('/activityfile/:id', getFileById);
export default router;