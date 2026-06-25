import express from 'express';
import { PatientController } from './patient.controller';
import { validateRequest } from '../../common/middleware/validateRequest';
import { addAddressSchema } from './patient.validation';
import { requireRole } from '../../common/middleware/authMiddleware';

const router = express.Router();
const controller = new PatientController();

router.post('/addresses', requireRole(['patient']), validateRequest(addAddressSchema), controller.addAddress.bind(controller));

export default router;
