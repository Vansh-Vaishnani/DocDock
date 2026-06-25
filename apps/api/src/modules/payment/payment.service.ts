import Razorpay from 'razorpay';

import { AppointmentModel } from '../appointment/appointment.repository';
import { config } from '../../common/config';
import { ApiError } from '../../common/errors/ApiError';

import { IPaymentDocument, PaymentModel } from './payment.repository';

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export class PaymentService {
  private razorpay = new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });

  async createOrder(amount: number, currency = 'INR', receipt?: string): Promise<RazorpayOrder> {
    const amountInPaise = Math.round(amount * 100);
    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      payment_capture: true
    });
    return { ...order, amount: amountInPaise } as RazorpayOrder;
  }

  async verifySignature(body: string, signature: string): Promise<boolean> {
    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha256', config.razorpayKeySecret).update(body).digest('hex');
    return expected === signature;
  }

  async createPaymentRecord(appointmentId: string, patientId: string, razorpayOrderId: string, amount: number): Promise<IPaymentDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    const payment = await PaymentModel.create({
      appointmentId: appointment._id,
      patientId,
      razorpayOrderId,
      amount,
      status: 'created'
    });
    appointment.paymentId = payment._id;
    await appointment.save();
    return payment;
  }

  async markPaid(razorpayOrderId: string, razorpayPaymentId: string): Promise<IPaymentDocument> {
    const payment = await PaymentModel.findOne({ razorpayOrderId });
    if (!payment) {
      throw new ApiError('Payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }
    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paidAt = new Date();
    await payment.save();
    return payment;
  }
}
