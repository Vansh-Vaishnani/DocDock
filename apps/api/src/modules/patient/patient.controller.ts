import { Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendSuccess } from '../../common/utils/http';

import { PatientService } from './patient.service';

const service = new PatientService();

export class PatientController {
  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    return req.user.sub;
  }

  async getProfile(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.getProfile(this.getUserId(req as AuthenticatedRequest));
      sendSuccess(res, profile, 'Patient profile retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.updateProfile(this.getUserId(req as AuthenticatedRequest), req.body);
      sendSuccess(res, profile, 'Profile updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  async listAddresses(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const addresses = await service.listAddresses(this.getUserId(req as AuthenticatedRequest));
      sendSuccess(res, addresses, 'Addresses retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.addAddress(this.getUserId(req as AuthenticatedRequest), req.body);
      sendSuccess(res, profile, 'Address added successfully.');
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.updateAddress(this.getUserId(req as AuthenticatedRequest), req.params.addressId, req.body);
      sendSuccess(res, profile, 'Address updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.deleteAddress(this.getUserId(req as AuthenticatedRequest), req.params.addressId);
      sendSuccess(res, profile, 'Address deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  async setDefaultAddress(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await service.setDefaultAddress(this.getUserId(req as AuthenticatedRequest), req.params.addressId);
      sendSuccess(res, profile, 'Default address updated successfully.');
    } catch (error) {
      next(error);
    }
  }
}
