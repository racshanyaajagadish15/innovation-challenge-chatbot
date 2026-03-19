import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  uploadEhr,
  getEhrRecords,
  getEhrRecord,
  convertEhrToMedications,
} from '../controllers/ehrController.js';

const router = Router();

router.post('/upload', requireAuth, uploadEhr);
router.get('/', requireAuth, getEhrRecords);
router.get('/:id', requireAuth, getEhrRecord);
router.post('/convert-medications', requireAuth, convertEhrToMedications);

export default router;
