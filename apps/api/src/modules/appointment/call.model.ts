import mongoose, { Schema, model } from 'mongoose';

export interface ICallLogDocument extends mongoose.Document {
  appointmentId: mongoose.Types.ObjectId;
  callerId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: 'calling' | 'connected' | 'ended' | 'missed';
  twilioCallSid?: string;
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const callLogSchema = new Schema<ICallLogDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment' },
    callerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    receiverId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    status: { type: String, enum: ['calling', 'connected', 'ended', 'missed'], default: 'calling' },
    twilioCallSid: { type: String },
    duration: { type: Number, default: 0 }
  },
  { timestamps: true }
);

callLogSchema.index({ appointmentId: 1 });

export const CallLogModel = model<ICallLogDocument>('CallLog', callLogSchema);
