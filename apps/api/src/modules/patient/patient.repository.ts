import mongoose, { Schema, model } from 'mongoose';

export interface IPatientDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  bloodGroup?: string;
  allergies: string[];
  medicalHistory: Array<{ _id?: mongoose.Types.ObjectId; note: string; createdAt: Date }>;
  addresses: Array<{
    _id?: mongoose.Types.ObjectId;
    label: string;
    location: { type: 'Point'; coordinates: [number, number] };
    isDefault: boolean;
  }>;
}

const patientSchema = new Schema<IPatientDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    bloodGroup: { type: String },
    allergies: [{ type: String, default: [] }],
    medicalHistory: [
      {
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    addresses: [
      {
        label: { type: String, required: true },
        location: {
          type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
          },
          coordinates: { type: [Number], required: true }
        },
        isDefault: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true }
);

patientSchema.index({ 'addresses.location': '2dsphere' });

export const PatientModel = model<IPatientDocument>('Patient', patientSchema);
