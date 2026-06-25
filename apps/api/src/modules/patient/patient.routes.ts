import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { requireRole } from '../../common/middleware/authMiddleware';

import { PatientController } from './patient.controller';
import { addAddressSchema } from './patient.validation';


const router = express.Router();
const controller = new PatientController();

router.post('/addresses', requireRole(['patient']), validateRequest(addAddressSchema), controller.addAddress.bind(controller));

export default router;
