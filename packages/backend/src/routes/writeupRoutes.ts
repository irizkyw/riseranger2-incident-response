import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, requireAdmin } from '../middlewares/auth.ts';
import { 
  getMyWriteup, 
  uploadWriteup, 
  downloadWriteup, 
  viewWriteupInline,
  getAllWriteupsAdmin, 
  evaluateWriteupAdmin,
  getWriteupUploadDir
} from '../controllers/writeupController.ts';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getWriteupUploadDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `writeup_${cleanName}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.docx', '.doc', '.md', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap upload .pdf, .zip, .rar, .docx, atau .md'));
    }
  }
});

// Participant Routes
router.get('/', authenticate, getMyWriteup);
router.post('/upload', authenticate, upload.single('file'), uploadWriteup);
router.get('/download/:id', authenticate, downloadWriteup);
router.get('/view/:id', authenticate, viewWriteupInline);

// Admin / Juri Evaluation Routes
router.get('/admin/all', authenticate, requireAdmin, getAllWriteupsAdmin);
router.post('/admin/upload', authenticate, requireAdmin, upload.single('file'), uploadWriteup);
router.post('/admin/evaluate/:id', authenticate, requireAdmin, evaluateWriteupAdmin);

export default router;
