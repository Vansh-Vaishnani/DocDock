import { NextFunction, Response } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { PrescriptionService } from './prescription.service';

const prescriptionService = new PrescriptionService();

export class PrescriptionController {
  async createPrescription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }

      const result = await prescriptionService.createPrescription(user.sub, req.body);
      sendCreated(res, result, 'Prescription created and sent to patient.');
    } catch (error) {
      next(error);
    }
  }

  async getPrescription(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }

      const prescription = await prescriptionService.getPrescription(req.params.prescriptionId, user.sub, user.role);
      sendSuccess(res, prescription, 'Prescription fetched successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getPatientPrescriptions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }

      const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
      const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 10;
      const result = await prescriptionService.getPatientPrescriptions(user.sub, page, limit);
      sendSuccess(res, result, 'Patient prescriptions fetched successfully.');
    } catch (error) {
      next(error);
    }
  }
}
