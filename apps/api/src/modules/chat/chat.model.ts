import mongoose, { Schema, model } from 'mongoose';

export interface IChatMessageDocument extends mongoose.Document {
  roomId: string;
  appointmentId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: 'patient' | 'doctor';
  type: 'text' | 'image';
  content?: string;
  mediaUrl?: string;
  isRead: boolean;
  deliveryStatus: 'sent' | 'delivered' | 'read';
}

const chatMessageSchema = new Schema<IChatMessageDocument>(
  {
    roomId: { type: String, required: true },
    appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment' },
    senderId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    senderRole: { type: String, enum: ['patient', 'doctor'], required: true },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    content: { type: String },
    mediaUrl: { type: String },
    isRead: { type: Boolean, default: false },
    deliveryStatus: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
  },
  { timestamps: true }
);

chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ appointmentId: 1 });

export const ChatMessageModel = model<IChatMessageDocument>('ChatMessage', chatMessageSchema);
