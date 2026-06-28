import mongoose, { Schema, model } from 'mongoose';

export interface IPaymentDocument extends mongoose.Document {
  appointmentId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  amount: number;
  paidAt?: Date;
  bookingPayload?: {
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    addressId?: string;
    address?: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
    notes?: string;
  };
  refundId?: string;
  refundStatus?: 'initiated' | 'completed' | 'failed';
  refundAmount?: number;
  refundCreatedAt?: Date;
  refundFailureReason?: string;
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment' },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
    amount: { type: Number, required: true },
    paidAt: { type: Date },
    bookingPayload: {
      doctorId: { type: String, required: false },
      appointmentDate: { type: String, required: false },
      appointmentTime: { type: String, required: false },
      addressId: { type: String, required: false },
      address: {
        label: { type: String, required: false },
        location: {
          type: {
            type: String,
            enum: ['Point'],
            required: false,
            default: 'Point'
          },
          coordinates: { type: [Number], required: false }
        }
      },
      notes: { type: String, required: false }
    }
    ,
    refundId: { type: String, required: false },
    refundStatus: { type: String, enum: ['initiated', 'completed', 'failed'], required: false },
    refundAmount: { type: Number, required: false },
    refundCreatedAt: { type: Date, required: false },
    refundFailureReason: { type: String, required: false }
  },
  { timestamps: true }
);

paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ appointmentId: 1 });

export const PaymentModel = model<IPaymentDocument>('Payment', paymentSchema);
