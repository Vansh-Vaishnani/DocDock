import { Response, NextFunction } from 'express';

import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendSuccess } from '../../common/utils/http';

import { TrackingService } from './tracking.service';

const service = new TrackingService();

export class TrackingController {
  async getLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required', error: { code: 'AUTH_REQUIRED', details: [] } });
        return;
      }
      const snapshot = await service.getTrackingSnapshot(req.params.appointmentId, userId);
      sendSuccess(res, snapshot, 'Tracking snapshot retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required', error: { code: 'AUTH_REQUIRED', details: [] } });
        return;
      }
      const coordinates = req.body.coordinates as [number, number];
      const result = await service.updateDoctorLocation(req.params.appointmentId, userId, coordinates);
      sendSuccess(res, result, 'Location updated.');
    } catch (error) {
      next(error);
    }
  }
}
