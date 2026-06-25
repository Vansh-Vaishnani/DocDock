import { NextFunction, Response } from 'express';

import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { ChatService } from './chat.service';

const service = new ChatService();

export class ChatController {
  async getOrCreateRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required', error: { code: 'AUTH_REQUIRED', details: [] } });
        return;
      }
      const room = await service.getOrCreateRoom(req.body.appointmentId, userId);
      sendSuccess(res, room, 'Chat room ready.');
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const messages = await service.getMessages(req.params.roomId, page, limit);
      sendSuccess(res, messages, 'Chat history retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required', error: { code: 'AUTH_REQUIRED', details: [] } });
        return;
      }
      const message = await service.sendMessage({
        roomId: req.params.roomId,
        appointmentId: req.body.appointmentId,
        senderId: userId,
        senderRole: req.user?.role === 'doctor' ? 'doctor' : 'patient',
        ...req.body
      });
      sendCreated(res, message, 'Message sent.');
    } catch (error) {
      next(error);
    }
  }
}
