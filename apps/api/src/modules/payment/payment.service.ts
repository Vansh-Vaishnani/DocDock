import mongoose from 'mongoose';
import Razorpay from 'razorpay';

import { AppointmentModel } from '../appointment/appointment.repository';
import { config } from '../../common/config';
import { ApiError } from '../../common/errors/ApiError';
import { isRazorpayEnabled } from '../../common/config/providers';

import { IPaymentDocument, PaymentModel } from './payment.repository';

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

interface PaymentBookingPayload {
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  addressId?: string;
  notes?: string;
  address?: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
}

export class PaymentService {
  private razorpayInstance: Razorpay | null = null;

  private ensureRazorpayEnabled(): void {
    if (!isRazorpayEnabled()) {
      throw new ApiError('Razorpay integration is not configured.', 503, 'RAZORPAY_NOT_CONFIGURED');
    }
  }

  private getRazorpay(): Razorpay {
    if (!this.razorpayInstance) {
      this.ensureRazorpayEnabled();
      this.razorpayInstance = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret
      });
    }
    return this.razorpayInstance;
  }

  async createOrder(amount: number, currency = 'INR', bookingPayload?: PaymentBookingPayload): Promise<RazorpayOrder> {
    const razorpay = this.getRazorpay();
    const amountInPaise = Math.round(amount * 100);
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: bookingPayload?.doctorId,
      payment_capture: true
    });
    return { ...order, amount: amountInPaise } as RazorpayOrder;
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    this.ensureRazorpayEnabled();
    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha256', config.razorpayKeySecret).update(payload).digest('hex');
    return expected === signature;
  }

  async createPaymentRecord(appointmentId: string, patientId: string, razorpayOrderId: string, amount: number, bookingPayload?: PaymentBookingPayload): Promise<IPaymentDocument> {
    const payment = await PaymentModel.create({
      appointmentId: new mongoose.Types.ObjectId(appointmentId),
      patientId: new mongoose.Types.ObjectId(patientId),
      razorpayOrderId,
      amount,
      status: 'created',
      bookingPayload
    });
    return payment;
  }

  async markPaid(razorpayOrderId: string, razorpayPaymentId: string): Promise<IPaymentDocument> {
    let payment = await PaymentModel.findOne({ razorpayOrderId });
    if (!payment) {
      payment = await PaymentModel.findOne({ appointmentId: razorpayOrderId });
    }
    if (!payment) {
      throw new ApiError('Payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }
    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.paidAt = new Date();
    await payment.save();
    return payment;
  }

  async markFailed(razorpayOrderId: string): Promise<IPaymentDocument> {
    const payment = await PaymentModel.findOne({ razorpayOrderId });
    if (!payment) {
      throw new ApiError('Payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }
    payment.status = 'failed';
    await payment.save();
    return payment;
  }

  async initiateRefund(razorpayPaymentId: string, amount?: number): Promise<{ refundId?: string; refundStatus: 'initiated' | 'completed' | 'failed'; refund?: any }> {
    const razorpay = this.getRazorpay();
    try {
      const refund = await razorpay.payments.refund(razorpayPaymentId, amount ? { amount: Math.round(amount * 100) } : {} as any);
      const stored = await PaymentModel.findOne({ razorpayPaymentId });
      if (stored) {
        stored.refundId = refund.id;
        const statusStr = String(refund.status);
        const completed = statusStr === 'processed' || statusStr === 'completed';
        stored.refundStatus = completed ? 'completed' : 'initiated';
        if (completed) {
          stored.status = 'refunded';
        }
        stored.refundAmount = refund.amount ?? undefined;
        stored.refundCreatedAt = refund.created_at ? new Date(refund.created_at * 1000) : new Date();
        await stored.save();
      }
      return { refundId: refund.id, refundStatus: stored?.refundStatus ?? 'initiated', refund };
    } catch (error: unknown) {
      const stored = await PaymentModel.findOne({ razorpayPaymentId });
      if (stored) {
        stored.refundStatus = 'failed';
        stored.refundFailureReason = error instanceof Error ? error.message : String(error);
        await stored.save();
      }
      return { refundStatus: 'failed' };
    }
  }
}
