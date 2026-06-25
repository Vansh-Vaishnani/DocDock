import { NotificationModel, INotificationDocument } from './notification.model';

export class NotificationRepository {
  async create(payload: {
    userId: string;
    type: string;
    title: string;
    message: string;
    channel?: 'in_app' | 'email' | 'sms' | 'push';
    metadata?: Record<string, unknown>;
  }): Promise<INotificationDocument> {
    return NotificationModel.create(payload);
  }

  async listByUser(userId: string, page = 1, limit = 20): Promise<INotificationDocument[]> {
    return NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async markAsRead(notificationId: string): Promise<INotificationDocument | null> {
    return NotificationModel.findByIdAndUpdate(notificationId, { $set: { isRead: true } }, { new: true });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await NotificationModel.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return result.modifiedCount;
  }
}
