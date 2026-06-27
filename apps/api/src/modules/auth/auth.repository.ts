import mongoose, { Schema, model } from 'mongoose';

export interface IUserDocument extends mongoose.Document {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'patient' | 'doctor' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  googleId?: string;
  avatar?: string;
  refreshTokenHash?: string;
  lastLogin?: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['patient', 'doctor', 'admin'] },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: undefined },
    googleId: { type: String, sparse: true },
    avatar: { type: String },
    refreshTokenHash: { type: String },
    lastLogin: { type: Date }
  },
  { timestamps: true }
);

export const UserModel = model<IUserDocument>('User', userSchema);
