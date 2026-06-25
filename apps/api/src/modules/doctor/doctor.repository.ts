import mongoose, { Schema, model } from 'mongoose';

export interface IDoctorDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  licenseNumber: string;
  specialization: string;
  qualifications: string[];
  experience: number;
  bio: string;
  languages: string[];
  consultationFee: number;
  location: { type: 'Point'; coordinates: [number, number] };
  availability: { isAvailable: boolean; lastSeenAt?: Date };
  verificationStatus: 'pending' | 'approved' | 'rejected';
  averageRating: number;
  reviewCount: number;
}

const doctorSchema = new Schema<IDoctorDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    licenseNumber: { type: String, required: true, unique: true },
    specialization: { type: String, required: true },
    qualifications: [{ type: String, required: true }],
    experience: { type: Number, required: true, min: 0 },
    bio: { type: String, default: '' },
    languages: [{ type: String, default: [] }],
    consultationFee: { type: Number, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: { type: [Number], required: true }
    },
    availability: {
      isAvailable: { type: Boolean, default: false },
      lastSeenAt: { type: Date }
    },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

doctorSchema.index({ location: '2dsphere' });

doctorSchema.index({ verificationStatus: 1, 'availability.isAvailable': 1 });

export const DoctorModel = model<IDoctorDocument>('Doctor', doctorSchema);
