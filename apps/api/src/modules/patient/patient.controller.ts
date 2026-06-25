import { Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendSuccess } from '../../common/utils/http';

import { PatientService } from './patient.service';

const service = new PatientService();

export class PatientController {
  async addAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const patient = await service.addAddress(user.sub, req.body);
      sendSuccess(res, patient, 'Address added successfully.');
    } catch (error) {
      next(error);
    }
  }
}
