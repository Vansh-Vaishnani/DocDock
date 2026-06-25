import express from 'express';
import { DoctorController } from './doctor.controller';
import { validateRequest } from '../../common/middleware/validateRequest';
import { nearbyDoctorsSchema, availabilitySchema, doctorProfileSchema } from './doctor.validation';
import { authenticate, requireRole } from '../../common/middleware/authMiddleware';

const router = express.Router();
const controller = new DoctorController();

router.post('/', authenticate, requireRole(['doctor']), validateRequest(doctorProfileSchema), controller.createProfile.bind(controller));
router.get('/nearby', validateRequest(nearbyDoctorsSchema), controller.searchNearby.bind(controller));
router.patch('/availability', authenticate, requireRole(['doctor']), validateRequest(availabilitySchema), controller.updateAvailability.bind(controller));

export default router;
