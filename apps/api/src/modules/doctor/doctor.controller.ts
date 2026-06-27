import { Request, Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { DoctorService } from './doctor.service';

const service = new DoctorService();

export class DoctorController {
  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    return req.user.sub;
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await service.registerDoctor(req.body);
      sendCreated(res, result, 'Doctor registration submitted. Your account is pending verification.');
    } catch (error) {
      next(error);
    }
  }

  async createProfile(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const doctor = await service.createProfile({ userId: user.sub, ...req.body });
      sendSuccess(res, doctor, 'Doctor profile created successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getProfileMe(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.getProfileMe(this.getUserId(req as AuthenticatedRequest));
      sendSuccess(res, profile, 'Doctor profile retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async updateProfileMe(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.updateProfileMe(this.getUserId(req as AuthenticatedRequest), req.body);
      sendSuccess(res, profile, 'Doctor profile updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await service.getDashboard(this.getUserId(req as AuthenticatedRequest));
      sendSuccess(res, dashboard, 'Doctor dashboard retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getAppointments(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
      const appointments = await service.getAppointments(
        this.getUserId(req as AuthenticatedRequest),
        filter as 'today' | 'upcoming' | 'all'
      );
      sendSuccess(res, appointments, 'Appointments retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getPrescriptions(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const prescriptions = await service.getPrescriptions(this.getUserId(req as AuthenticatedRequest));
      sendSuccess(res, prescriptions, 'Prescriptions retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getEarnings(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const earnings = await service.getEarnings(this.getUserId(req as AuthenticatedRequest));
      sendSuccess(res, earnings, 'Earnings retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async searchNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { latitude, longitude, radius, specialization, minExperience, maxFee, search, sortBy, availableOnly, page, limit } = req.query;
      const doctors = await service.searchNearby(
        typeof latitude === 'string' ? Number(latitude) : 0,
        typeof longitude === 'string' ? Number(longitude) : 0,
        typeof radius === 'string' ? Number(radius) : 10000,
        typeof specialization === 'string' ? specialization : undefined,
        {
          minExperience: typeof minExperience === 'string' ? Number(minExperience) : undefined,
          maxFee: typeof maxFee === 'string' ? Number(maxFee) : undefined,
          search: typeof search === 'string' ? search : undefined,
          sortBy: typeof sortBy === 'string' ? sortBy : 'distance',
          availableOnly: typeof availableOnly === 'string' ? availableOnly === 'true' : false,
          page: typeof page === 'string' ? Number(page) : 1,
          limit: typeof limit === 'string' ? Number(limit) : 9
        }
      );
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

  async updateAvailability(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.updateAvailability(this.getUserId(req as AuthenticatedRequest), req.body);
      sendSuccess(res, profile, 'Availability updated');
    } catch (error) {
      next(error);
    }
  }
}
