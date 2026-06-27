import { Request, Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendSuccess } from '../../common/utils/http';

import { DoctorService } from './doctor.service';

const service = new DoctorService();

export class DoctorController {
  async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
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
      const { latitude, longitude, radius, specialization, minExperience, maxFee, search, sortBy, availableOnly, page, limit } = req.query;
      const lat = typeof latitude === 'string' ? Number(latitude) : undefined;
      const lng = typeof longitude === 'string' ? Number(longitude) : undefined;
      const radiusMeters = typeof radius === 'string' ? Number(radius) : undefined;
      const specializationValue = typeof specialization === 'string' ? specialization : undefined;
      const minimumExperience = typeof minExperience === 'string' ? Number(minExperience) : undefined;
      const maximumFee = typeof maxFee === 'string' ? Number(maxFee) : undefined;
      const searchValue = typeof search === 'string' ? search : undefined;
      const sortByValue = typeof sortBy === 'string' ? sortBy : 'distance';
      const availableOnlyValue = typeof availableOnly === 'string' ? availableOnly === 'true' : false;
      const pageValue = typeof page === 'string' ? Number(page) : 1;
      const limitValue = typeof limit === 'string' ? Number(limit) : 9;
      const doctors = await service.searchNearby(lat ?? 0, lng ?? 0, radiusMeters ?? 10000, specializationValue, {
        minExperience: minimumExperience,
        maxFee: maximumFee,
        search: searchValue,
        availableOnly: availableOnlyValue,
        sortBy: sortByValue,
        page: pageValue,
        limit: limitValue
      });
      sendSuccess(res, { doctors }, 'Nearby doctors fetched');
    } catch (error) {
      next(error);
    }
  }

  async getDoctorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await service.getDoctorById(req.params.id);
      sendSuccess(res, doctor, 'Doctor profile fetched');
    } catch (error) {
      next(error);
    }
  }

  async updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
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
