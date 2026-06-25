import { Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { AppointmentService } from './appointment.service';

const service = new AppointmentService();

export class AppointmentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const appointment = await service.createAppointment({
        ...req.body,
        patientId: user.sub
      });
      sendCreated(res, appointment, 'Appointment created successfully.');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const appointment = await service.updateStatus(req.params.appointmentId, req.body.status, user.sub);
      sendSuccess(res, appointment, 'Appointment status updated.');
    } catch (error) {
      next(error);
    }
  }
}
