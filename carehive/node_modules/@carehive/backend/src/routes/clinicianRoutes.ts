import { Router } from 'express';
import { getClinicianSummary } from '../controllers/clinicianController.js';

const router = Router();
router.get('/summary', getClinicianSummary);
export default router;
