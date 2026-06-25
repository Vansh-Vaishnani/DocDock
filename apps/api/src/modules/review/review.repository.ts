import mongoose, { Schema, model } from 'mongoose';

export interface IReviewDocument extends mongoose.Document {
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  reply?: string;
  replyAt?: Date;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReviewDocument>(
  {
    doctorId: { type: Schema.Types.ObjectId, required: true, ref: 'Doctor' },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient' },
    appointmentId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'Appointment' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    reply: { type: String },
    replyAt: { type: Date },
    isHidden: { type: Boolean, default: false }
  },
  { timestamps: true }
);

reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ appointmentId: 1 }, { unique: true });

export const ReviewModel = model<IReviewDocument>('Review', reviewSchema);
