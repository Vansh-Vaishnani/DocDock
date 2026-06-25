import { Request, Response, NextFunction } from 'express';
import { DoctorService } from './doctor.service';
import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendSuccess } from '../../common/utils/http';

const service = new DoctorService();

export class DoctorController {
  async createProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const doctor = await service.createProfile({
        userId: user.sub,
        ...req.body
      });
      sendSuccess(res, doctor, 'Doctor profile created successfully.');
    } catch (error) {
      next(error);
    }
  }

  async searchNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { latitude, longitude, radius, specialization } = req.query;
      const lat = typeof latitude === 'string' ? Number(latitude) : undefined;
      const lng = typeof longitude === 'string' ? Number(longitude) : undefined;
      const radiusMeters = typeof radius === 'string' ? Number(radius) : undefined;
      const specializationValue = typeof specialization === 'string' ? specialization : undefined;
      const doctors = await service.searchNearby(lat ?? 0, lng ?? 0, radiusMeters ?? 10000, specializationValue);
      sendSuccess(res, { doctors }, 'Nearby doctors fetched');
    } catch (error) {
      next(error);
    }
  }

  async updateAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const doctor = await service.updateAvailability(user.sub, req.body.isAvailable);
      sendSuccess(res, doctor, 'Availability updated');
    } catch (error) {
      next(error);
    }
  }
}
