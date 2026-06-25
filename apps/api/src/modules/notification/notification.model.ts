import mongoose, { Schema, model } from 'mongoose';

import { NotificationChannel } from './notification.types';

export interface INotificationDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  metadata?: Record<string, unknown>;
  isRead: boolean;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channel: { type: String, enum: ['in_app', 'email', 'sms', 'push'], default: 'in_app' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = model<INotificationDocument>('Notification', notificationSchema);
