import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { analyzeVision } from '../controllers/visionController.js';

const router = Router();
router.post('/analyze', requireAuth, analyzeVision);
export default router;
