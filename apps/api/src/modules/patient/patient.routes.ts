import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { requireRole } from '../../common/middleware/authMiddleware';

import { PatientController } from './patient.controller';
import { addAddressSchema, addressIdSchema, updateAddressSchema, updateProfileSchema } from './patient.validation';

const router = express.Router();
const controller = new PatientController();
const patientOnly = requireRole(['patient']);

router.get('/profile/me', patientOnly, controller.getProfile.bind(controller));
router.patch('/profile/me', patientOnly, validateRequest(updateProfileSchema), controller.updateProfile.bind(controller));

router.get('/addresses', patientOnly, controller.listAddresses.bind(controller));
router.post('/addresses', patientOnly, validateRequest(addAddressSchema), controller.addAddress.bind(controller));
router.patch('/addresses/:addressId', patientOnly, validateRequest(updateAddressSchema), controller.updateAddress.bind(controller));
router.delete('/addresses/:addressId', patientOnly, validateRequest(addressIdSchema), controller.deleteAddress.bind(controller));
router.patch('/addresses/:addressId/default', patientOnly, validateRequest(addressIdSchema), controller.setDefaultAddress.bind(controller));

export default router;
