import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listMedications,
  addMedication,
  patchMedication,
  removeMedication,
  listReminders,
  addReminder,
  patchReminder,
  removeReminder,
} from '../controllers/medicationsController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listMedications);
router.post('/', addMedication);
router.patch('/:id', patchMedication);
router.delete('/:id', removeMedication);

router.get('/reminders', listReminders);
router.post('/:medicationId/reminders', addReminder);
router.patch('/:medicationId/reminders/:reminderId', patchReminder);
router.delete('/:medicationId/reminders/:reminderId', removeReminder);

export default router;
