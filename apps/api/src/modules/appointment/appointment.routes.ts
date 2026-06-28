import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { requireRole } from '../../common/middleware/authMiddleware';

import { AppointmentController } from './appointment.controller';
import {
  availableSlotsSchema,
  createAppointmentSchema,
  listAppointmentsSchema,
  updateAppointmentStatusSchema
} from './appointment.validation';

const router = express.Router();
const controller = new AppointmentController();

router.get('/doctors/:id/available-slots', validateRequest(availableSlotsSchema), controller.getAvailableSlots.bind(controller));
router.get('/', requireRole(['patient']), validateRequest(listAppointmentsSchema), controller.list.bind(controller));
router.get('/:appointmentId', requireRole(['patient', 'doctor', 'admin']), controller.getById.bind(controller));
router.post('/', requireRole(['patient']), validateRequest(createAppointmentSchema), controller.create.bind(controller));
router.patch('/:appointmentId/status', requireRole(['doctor', 'patient']), validateRequest(updateAppointmentStatusSchema), controller.updateStatus.bind(controller));

export default router;
