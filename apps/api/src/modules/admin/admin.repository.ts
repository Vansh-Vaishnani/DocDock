import mongoose, { Schema, model } from 'mongoose';
import { IUserDocument } from '../auth/auth.repository';

export interface IAdminProfileDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  role: 'admin';
}

const adminSchema = new Schema<IAdminProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    role: { type: String, default: 'admin' }
  },
  { timestamps: true }
);

export const AdminModel = model<IAdminProfileDocument>('Admin', adminSchema);
