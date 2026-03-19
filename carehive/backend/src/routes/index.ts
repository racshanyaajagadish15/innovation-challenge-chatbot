import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import insightsRoutes from './insightsRoutes.js';
import clinicianRoutes from './clinicianRoutes.js';
import agentsRoutes from './agentsRoutes.js';
import chatRoutes from './chatRoutes.js';
import userRoutes from './userRoutes.js';
import visionRoutes from './visionRoutes.js';
import medicationRoutes from './medicationRoutes.js';
import ehrRoutes from './ehrRoutes.js';
import relationshipRoutes from './relationshipRoutes.js';

const router = Router();
router.use('/user', userRoutes);
router.use('/health', healthRoutes);
router.use('/vision', visionRoutes);
router.use('/insights', insightsRoutes);
router.use('/clinician', clinicianRoutes);
router.use('/agents', agentsRoutes);
router.use('/chat', chatRoutes);
router.use('/medications', medicationRoutes);
router.use('/ehr', ehrRoutes);
router.use('/relationships', relationshipRoutes);

export default router;
