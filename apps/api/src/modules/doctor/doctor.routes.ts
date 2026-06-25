import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { authenticate, requireRole } from '../../common/middleware/authMiddleware';

import { DoctorController } from './doctor.controller';
import { nearbyDoctorsSchema, availabilitySchema, doctorProfileSchema } from './doctor.validation';


const router = express.Router();
const controller = new DoctorController();

router.post('/', authenticate, requireRole(['doctor']), validateRequest(doctorProfileSchema), controller.createProfile.bind(controller));
router.get('/nearby', validateRequest(nearbyDoctorsSchema), controller.searchNearby.bind(controller));
router.get('/:id', controller.getDoctorById.bind(controller));
router.patch('/availability', authenticate, requireRole(['doctor']), validateRequest(availabilitySchema), controller.updateAvailability.bind(controller));

export default router;
