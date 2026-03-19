import { Router } from 'express';
import { logHealth, getHistory } from '../controllers/healthController.js';
import { optionalAuth } from '../middleware/auth.js';
const router = Router();
router.post('/log', optionalAuth, logHealth);
router.get('/history', optionalAuth, getHistory);
export default router;
