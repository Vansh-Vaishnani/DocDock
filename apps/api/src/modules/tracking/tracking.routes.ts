import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { authenticate, requireRole } from '../../common/middleware/authMiddleware';

import { TrackingController } from './tracking.controller';
import { trackingParamsSchema, updateLocationSchema } from './tracking.validation';


const router = express.Router();
const controller = new TrackingController();

router.get('/:appointmentId/location', authenticate, validateRequest(trackingParamsSchema), controller.getLocation.bind(controller));
router.patch('/:appointmentId/location', authenticate, requireRole(['doctor']), validateRequest(updateLocationSchema), controller.updateLocation.bind(controller));

export default router;
