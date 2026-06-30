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
        reason: req.body.reason,
        otp: req.body.otp
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

  async resendOtp(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const result = await service.resendOtp(req.params.appointmentId, user.sub, user.role);
      sendSuccess(res, result, 'OTP resent.');
    } catch (error) {
      next(error);
    }
  }

  async initiateCall(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      if (user.role === 'admin') {
        next(new ApiError('Admin cannot initiate calls', 403, 'FORBIDDEN'));
        return;
      }
      const log = await service.initiateAnonymousCall(req.params.appointmentId, user.sub, user.role as 'patient' | 'doctor');
      sendSuccess(res, log, 'Call initiated successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getCallHistory(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      const history = await service.getCallHistory(req.params.appointmentId, user.sub);
      sendSuccess(res, history, 'Call history retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async updateCallStatus(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const log = await service.updateCallStatus(req.params.appointmentId, req.params.callLogId, req.body.status, req.body.duration);
      sendSuccess(res, log, 'Call status updated.');
    } catch (error) {
      next(error);
    }
  }

  async twimlCallback(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const to = req.query.to as string;
      res.type('text/xml');
      res.send(`
        <Response>
          <Dial>${to}</Dial>
        </Response>
      `);
    } catch (error) {
      next(error);
    }
  }
}
