import { Router } from 'express';
import { getAgentActivity } from '../controllers/agentsController.js';
const router = Router();
router.get('/activity', getAgentActivity);
export default router;
