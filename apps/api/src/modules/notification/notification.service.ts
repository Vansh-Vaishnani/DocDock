import { ApiError } from '../../common/errors/ApiError';

import { NotificationRepository } from './notification.repository';
import { IEmailProvider, IPushProvider, ISmsProvider } from './notification.types';

class NoopEmailProvider implements IEmailProvider {
  async sendEmail(): Promise<void> {
    return;
  }
}

class NoopSmsProvider implements ISmsProvider {
  async sendSms(): Promise<void> {
    return;
  }
}

class NoopPushProvider implements IPushProvider {
  async sendPush(): Promise<void> {
    return;
  }
}

export class NotificationService {
  constructor(
    private readonly repository = new NotificationRepository(),
    private readonly emailProvider: IEmailProvider = new NoopEmailProvider(),
    private readonly smsProvider: ISmsProvider = new NoopSmsProvider(),
    private readonly pushProvider: IPushProvider = new NoopPushProvider()
  ) {}

  async createNotification(payload: {
    userId: string;
    type: string;
    title: string;
    message: string;
    channel?: 'in_app' | 'email' | 'sms' | 'push';
    metadata?: Record<string, unknown>;
  }) {
    if (!payload.title.trim() || !payload.message.trim()) {
      throw new ApiError('Notification title and message are required', 400, 'VALIDATION_ERROR');
    }
    const notification = await this.repository.create(payload);
    if (payload.channel === 'email') {
      await this.emailProvider.sendEmail(payload.userId, payload.title, payload.message);
    }
    if (payload.channel === 'sms') {
      await this.smsProvider.sendSms(payload.userId, payload.message);
    }
    if (payload.channel === 'push') {
      await this.pushProvider.sendPush(payload.userId, payload.title, payload.message);
    }
    return notification;
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 20;
    return this.repository.listByUser(userId, safePage, safeLimit);
  }

  async markAsRead(notificationId: string) {
    const notification = await this.repository.markAsRead(notificationId);
    if (!notification) {
      throw new ApiError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }
    return notification;
  }

  async markAllAsRead(userId: string) {
    return this.repository.markAllAsRead(userId);
  }
}
