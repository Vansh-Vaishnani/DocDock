import mongoose, { Schema, model } from 'mongoose';

export interface IAppointmentOtpDocument extends mongoose.Document {
  appointmentId: mongoose.Types.ObjectId;
  otpHash: string;
  plainTextOtp?: string; // used for testing in development/localhost environment
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentOtpSchema = new Schema<IAppointmentOtpDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment', unique: true },
    otpHash: { type: String, required: true },
    plainTextOtp: { type: String },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

appointmentOtpSchema.index({ appointmentId: 1 });

export const AppointmentOtpModel = model<IAppointmentOtpDocument>('AppointmentOtp', appointmentOtpSchema);
