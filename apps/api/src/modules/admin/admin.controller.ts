import { Request, Response, NextFunction } from 'express';

import { sendSuccess } from '../../common/utils/http';

import { AdminService } from './admin.service';

const service = new AdminService();

export class AdminController {
  async listPendingDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctors = await service.listPendingDoctors();
      sendSuccess(res, { doctors }, 'Pending doctor profiles retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async verifyDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await service.verifyDoctor(req.params.doctorId, req.body.approve, req.body.reason);
      sendSuccess(res, doctor, 'Doctor verification updated.');
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await service.getDashboardOverview();
      sendSuccess(res, overview, 'Admin dashboard overview retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await service.getAnalytics();
      sendSuccess(res, analytics, 'Admin analytics retrieved.');
    } catch (error) {
      next(error);
    }
  }
}
