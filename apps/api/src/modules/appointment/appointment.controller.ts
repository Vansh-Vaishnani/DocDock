import { Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { AppointmentService } from './appointment.service';

const service = new AppointmentService();

export class AppointmentController {
  async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
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

  async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const filter = (req.query.filter as 'upcoming' | 'completed' | 'cancelled' | 'history' | 'all' | undefined) ?? 'all';
      const appointments = await service.listForPatient(user.sub, filter);
      sendSuccess(res, appointments, 'Appointments retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getById(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const detail = await service.getByIdForUser(req.params.appointmentId, user.sub, user.role);
      sendSuccess(res, detail, 'Appointment details retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const appointment = await service.updateStatus(req.params.appointmentId, req.body.status, user.sub, user.role, {
        reason: req.body.reason
      });
      sendSuccess(res, appointment, 'Appointment status updated.');
    } catch (error) {
      next(error);
    }
  }

  async getAvailableSlots(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const slots = await service.getAvailableSlots(req.params.id, req.query.date as string);
      sendSuccess(res, slots, 'Available slots retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
}
