import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { AppointmentService } from '../appointment/appointment.service';
import { PatientModel } from '../patient/patient.repository';
import { PaymentService } from './payment.service';

const service = new PaymentService();
const appointmentService = new AppointmentService();

export class PaymentController {
  private async resolveBookingPayload(
    userId: string,
    body: {
      doctorId: string;
      appointmentDate: string;
      appointmentTime: string;
      addressId?: string;
      location?: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
      notes?: string;
    }
  ) {
    const patientProfile = await PatientModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!patientProfile) {
      throw new ApiError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');
    }

    let resolvedAddress: { label: string; location: { type: 'Point'; coordinates: [number, number] } } | undefined;

    if (body.addressId) {
      const address = patientProfile.addresses.find((item) => item._id?.toString() === body.addressId);
      if (!address) {
        throw new ApiError('Selected address not found', 404, 'ADDRESS_NOT_FOUND');
      }
      resolvedAddress = {
        label: address.label,
        location: address.location
      };
    } else if (body.location) {
      resolvedAddress = body.location;
    } else {
      throw new ApiError('Selected address is required', 400, 'ADDRESS_REQUIRED');
    }

    return {
      doctorId: body.doctorId,
      appointmentDate: body.appointmentDate,
      appointmentTime: body.appointmentTime,
      addressId: body.addressId,
      notes: body.notes,
      address: resolvedAddress
    };
  }

  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const bookingPayload = await this.resolveBookingPayload(user.sub, req.body);
      const order = await service.createOrder(req.body.amount, 'INR', bookingPayload);
      const appointmentId = new mongoose.Types.ObjectId().toString();
      await service.createPaymentRecord(appointmentId, user.sub, order.id, req.body.amount, bookingPayload);
      sendCreated(res, { orderId: order.id, amount: order.amount, currency: order.currency }, 'Payment order created.');
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const valid = await service.verifySignature(`${razorpayOrderId}|${razorpayPaymentId}`, razorpaySignature);
      if (!valid) {
        await service.markFailed(razorpayOrderId);
        throw new ApiError('Invalid payment signature', 400, 'INVALID_PAYMENT_SIGNATURE');
      }
      const payment = await service.markPaid(razorpayOrderId, razorpayPaymentId);
      const appointment = await appointmentService.confirmAfterPayment(payment.appointmentId.toString(), payment.bookingPayload, payment.patientId.toString());
      sendSuccess(res, { ...payment.toObject(), appointmentId: appointment._id.toString() }, 'Payment verified successfully.');
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
