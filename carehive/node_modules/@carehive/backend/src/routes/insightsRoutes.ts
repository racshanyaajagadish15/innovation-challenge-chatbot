import { Router } from 'express';
import { getInsights, runOrchestratorForUser } from '../controllers/insightsController.js';

const router = Router();
router.get('/', getInsights);
router.post('/orchestrate', runOrchestratorForUser);
export default router;
