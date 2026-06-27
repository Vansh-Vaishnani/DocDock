import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { authenticate, requireRole } from '../../common/middleware/authMiddleware';

import { DoctorController } from './doctor.controller';
import {
  nearbyDoctorsSchema,
  availabilitySchema,
  doctorProfileSchema,
  doctorRegisterSchema,
  updateDoctorProfileSchema,
  doctorAppointmentsSchema
} from './doctor.validation';

const router = express.Router();
const controller = new DoctorController();
const doctorOnly = requireRole(['doctor']);

router.post('/register', validateRequest(doctorRegisterSchema), controller.register.bind(controller));
router.get('/nearby', validateRequest(nearbyDoctorsSchema), controller.searchNearby.bind(controller));

router.get('/profile/me', authenticate, doctorOnly, controller.getProfileMe.bind(controller));
router.patch('/profile/me', authenticate, doctorOnly, validateRequest(updateDoctorProfileSchema), controller.updateProfileMe.bind(controller));
router.get('/dashboard', authenticate, doctorOnly, controller.getDashboard.bind(controller));
router.get('/appointments', authenticate, doctorOnly, validateRequest(doctorAppointmentsSchema), controller.getAppointments.bind(controller));
router.get('/prescriptions', authenticate, doctorOnly, controller.getPrescriptions.bind(controller));
router.get('/earnings', authenticate, doctorOnly, controller.getEarnings.bind(controller));
router.patch('/availability', authenticate, doctorOnly, validateRequest(availabilitySchema), controller.updateAvailability.bind(controller));

router.post('/', authenticate, doctorOnly, validateRequest(doctorProfileSchema), controller.createProfile.bind(controller));
router.get('/:id', controller.getDoctorById.bind(controller));

export default router;
