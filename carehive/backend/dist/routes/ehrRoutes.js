import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { uploadEhr, listEhrs } from '../controllers/ehrController.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.get('/', requireAuth, listEhrs);
router.post('/upload', requireAuth, upload.single('file'), uploadEhr);
export default router;
