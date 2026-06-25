import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { requireRole } from '../../common/middleware/authMiddleware';

import { PaymentController } from './payment.controller';
import { createPaymentSchema, verifyPaymentSchema } from './payment.validation';


const router = express.Router();
const controller = new PaymentController();

router.post('/create-order', requireRole(['patient']), validateRequest(createPaymentSchema), controller.createOrder.bind(controller));
router.post('/verify', requireRole(['patient', 'doctor', 'admin']), validateRequest(verifyPaymentSchema), controller.verifyPayment.bind(controller));
router.post('/webhook', controller.handleWebhook.bind(controller));

export default router;
