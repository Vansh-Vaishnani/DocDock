import express from 'express';
import { PaymentController } from './payment.controller';
import { validateRequest } from '../../common/middleware/validateRequest';
import { createPaymentSchema, verifyPaymentSchema } from './payment.validation';
import { requireRole } from '../../common/middleware/authMiddleware';

const router = express.Router();
const controller = new PaymentController();

router.post('/create-order', requireRole(['patient']), validateRequest(createPaymentSchema), controller.createOrder.bind(controller));
router.post('/verify', requireRole(['patient', 'doctor', 'admin']), validateRequest(verifyPaymentSchema), controller.verifyPayment.bind(controller));

export default router;
