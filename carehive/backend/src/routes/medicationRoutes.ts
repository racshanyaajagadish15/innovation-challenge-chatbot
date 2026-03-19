import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMedications,
  addMedication,
  updateMedication,
  deleteMedication,
  logMedicationDose,
  getMedicationLogs,
  getDailySchedule,
} from '../controllers/medicationController.js';

const router = Router();

router.get('/', requireAuth, getMedications);
router.post('/', requireAuth, addMedication);
router.put('/:id', requireAuth, updateMedication);
router.delete('/:id', requireAuth, deleteMedication);
router.post('/log', requireAuth, logMedicationDose);
router.get('/logs', requireAuth, getMedicationLogs);
router.get('/schedule', requireAuth, getDailySchedule);

export default router;
