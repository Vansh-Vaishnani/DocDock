import express from 'express';
import { authenticate, requireRole } from '../../common/middleware/authMiddleware';
import { validateRequest } from '../../common/middleware/validateRequest';
import { PrescriptionController } from './prescription.controller';
import { createPrescriptionSchema, getPatientPrescriptionsSchema, getPrescriptionSchema } from './prescription.validation';

const router = express.Router();
const controller = new PrescriptionController();

router.post('/', authenticate, requireRole(['doctor']), validateRequest(createPrescriptionSchema), controller.createPrescription.bind(controller));
router.get('/:prescriptionId', authenticate, validateRequest(getPrescriptionSchema), controller.getPrescription.bind(controller));
router.get('/patient/me', authenticate, requireRole(['patient']), validateRequest(getPatientPrescriptionsSchema), controller.getPatientPrescriptions.bind(controller));

export default router;
