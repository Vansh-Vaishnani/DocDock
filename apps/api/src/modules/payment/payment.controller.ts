import { Request, Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { PaymentService } from './payment.service';

const service = new PaymentService();

export class PaymentController {
  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const order = await service.createOrder(req.body.amount, 'INR', req.body.appointmentId);
      await service.createPaymentRecord(req.body.appointmentId, user.sub, order.id, req.body.amount);
      sendCreated(res, { orderId: order.id, amount: order.amount, currency: order.currency }, 'Payment order created.');
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const valid = await service.verifySignature(JSON.stringify(req.body), razorpaySignature);
      if (!valid) {
        throw new ApiError('Invalid payment signature', 400, 'INVALID_PAYMENT_SIGNATURE');
      }
      const payment = await service.markPaid(razorpayOrderId, razorpayPaymentId);
      sendSuccess(res, payment, 'Payment verified successfully.');
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const signature = req.headers['x-razorpay-signature'];
      const valid = await service.verifySignature(rawBody, typeof signature === 'string' ? signature : '');
      if (!valid) {
        throw new ApiError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
      }

      const event = JSON.parse(rawBody);
      if (event?.event === 'payment.captured') {
        const payment = event.payload?.payment?.entity;
        if (payment?.order_id && payment?.id) {
          await service.markPaid(payment.order_id, payment.id);
        }
      }

      sendSuccess(res, { received: true }, 'Webhook processed.');
    } catch (error) {
      next(error);
    }
  }
}
