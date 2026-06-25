import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { sendSuccess } from '../../common/utils/http';

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
}
