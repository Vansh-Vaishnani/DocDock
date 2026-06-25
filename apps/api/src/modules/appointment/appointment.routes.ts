import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { requireRole } from '../../common/middleware/authMiddleware';

import { AppointmentController } from './appointment.controller';
import { createAppointmentSchema, updateAppointmentStatusSchema } from './appointment.validation';


const router = express.Router();
const controller = new AppointmentController();

router.post('/', requireRole(['patient']), validateRequest(createAppointmentSchema), controller.create.bind(controller));
router.patch('/:appointmentId/status', requireRole(['doctor', 'patient']), validateRequest(updateAppointmentStatusSchema), controller.updateStatus.bind(controller));

export default router;
