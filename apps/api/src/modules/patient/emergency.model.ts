import mongoose, { Schema, model } from 'mongoose';

export interface IEmergencyRequestDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  location: { type: 'Point'; coordinates: [number, number] };
  assignedDoctorId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  status: 'pending' | 'resolved' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const emergencyRequestSchema = new Schema<IEmergencyRequestDocument>(
  {
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true }
    },
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    status: { type: String, enum: ['pending', 'resolved', 'failed'], default: 'pending' }
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ location: '2dsphere' });

export const EmergencyRequestModel = model<IEmergencyRequestDocument>('EmergencyRequest', emergencyRequestSchema);
