import mongoose, { Schema, model } from 'mongoose';

export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'auto_rejected'
  | 'doctor_on_way'
  | 'in_consultation'
  | 'completed'
  | 'cancelled_by_patient'
  | 'cancelled_by_doctor';

export interface IAppointmentDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  address: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
  status: AppointmentStatus;
  notes?: string;
  paymentId?: mongoose.Types.ObjectId;
  prescriptionId?: mongoose.Types.ObjectId;
}

const appointmentSchema = new Schema<IAppointmentDocument>(
  {
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient' },
    doctorId: { type: Schema.Types.ObjectId, required: true, ref: 'Doctor' },
    scheduledAt: { type: Date, required: true },
    address: {
      label: { type: String, required: true },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
          default: 'Point'
        },
        coordinates: { type: [Number], required: true }
      }
    },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'auto_rejected',
        'doctor_on_way',
        'in_consultation',
        'completed',
        'cancelled_by_patient',
        'cancelled_by_doctor'
      ],
      default: 'pending'
    },
    notes: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' }
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ scheduledAt: 1 });

export const AppointmentModel = model<IAppointmentDocument>('Appointment', appointmentSchema);
