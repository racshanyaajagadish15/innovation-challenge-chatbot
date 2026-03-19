import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getLinkedPatients,
  addRelationship,
  removeRelationship,
  searchUsers,
} from '../controllers/relationshipController.js';

const router = Router();

router.get('/', requireAuth, getLinkedPatients);
router.post('/', requireAuth, addRelationship);
router.delete('/:patientId', requireAuth, removeRelationship);
router.get('/search', requireAuth, searchUsers);

export default router;
