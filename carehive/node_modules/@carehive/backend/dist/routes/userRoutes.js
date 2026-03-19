import { Router } from 'express';
import { getDemoUser, getMe, updateProfile } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.get('/demo', getDemoUser);
router.get('/me', requireAuth, getMe);
router.post('/profile', requireAuth, updateProfile);
export default router;
