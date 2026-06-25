import { NextFunction, Response } from 'express';

import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendSuccess } from '../../common/utils/http';

import { NotificationService } from './notification.service';

const service = new NotificationService();

export class NotificationController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required', error: { code: 'AUTH_REQUIRED', details: [] } });
        return;
      }
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const notifications = await service.listForUser(userId, page, limit);
      sendSuccess(res, { notifications }, 'Notifications retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await service.markAsRead(req.params.notificationId);
      sendSuccess(res, notification, 'Notification marked as read.');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required', error: { code: 'AUTH_REQUIRED', details: [] } });
        return;
      }
      const updatedCount = await service.markAllAsRead(userId);
      sendSuccess(res, { updatedCount }, 'Notifications updated.');
    } catch (error) {
      next(error);
    }
  }
}
