import express from 'express';
import { uploadFile } from '../controllers/fileControllers.js';
import multer from 'multer';
const router = express.Router();

//create log file
const upload = multer({ dest: 'uploads/logStudent' });
router.post('/upload-csv',upload.single('file') , uploadFile)
export default router;