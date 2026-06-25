import mongoose, { Schema, model } from 'mongoose';

export interface IPaymentDocument extends mongoose.Document {
  appointmentId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  amount: number;
  paidAt?: Date;
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment' },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
    amount: { type: Number, required: true },
    paidAt: { type: Date }
  },
  { timestamps: true }
);

paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ appointmentId: 1 });

export const PaymentModel = model<IPaymentDocument>('Payment', paymentSchema);
