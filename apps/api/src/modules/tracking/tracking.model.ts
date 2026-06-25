import mongoose, { Schema, model } from 'mongoose';

export interface ITrackingDocument extends mongoose.Document {
  appointmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  status: 'idle' | 'active' | 'completed';
  doctorCurrentLocation?: {
    type: 'Point';
    coordinates: [number, number];
    updatedAt: Date;
  };
  patientLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  lastHeartbeatAt?: Date;
}

const trackingSchema = new Schema<ITrackingDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment', unique: true },
    doctorId: { type: Schema.Types.ObjectId, required: true, ref: 'Doctor' },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient' },
    status: { type: String, enum: ['idle', 'active', 'completed'], default: 'idle' },
    doctorCurrentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: { type: [Number], required: true },
      updatedAt: { type: Date, default: Date.now }
    },
    patientLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: { type: [Number] }
    },
    lastHeartbeatAt: { type: Date }
  },
  { timestamps: true }
);

trackingSchema.index({ appointmentId: 1 });
trackingSchema.index({ doctorCurrentLocation: '2dsphere' });

export const TrackingModel = model<ITrackingDocument>('Tracking', trackingSchema);
