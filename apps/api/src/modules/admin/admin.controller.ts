import { Request, Response, NextFunction } from 'express';

import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendSuccess } from '../../common/utils/http';

import { logAdminAction } from './admin.audit';
import { AdminService } from './admin.service';

const service = new AdminService();

const parsePage = (value: unknown, fallback = 1): number => {
  const parsed = typeof value === 'string' ? Number(value) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseLimit = (value: unknown, fallback = 20): number => {
  const parsed = typeof value === 'string' ? Number(value) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : fallback;
};

export class AdminController {
  async listPendingDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
      const page = parsePage(req.query.page);
      const limit = parseLimit(req.query.limit);
      const result = await service.listDoctorsForVerification(status, page, limit);
      sendSuccess(res, result, 'Doctor profiles retrieved.', { page: result.page, total: result.total, totalPages: result.totalPages });
    } catch (error) {
      next(error);
    }
  }

  async getDoctorDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await service.getDoctorDetail(req.params.doctorId);
      sendSuccess(res, detail, 'Doctor detail retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async verifyDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const action = req.body.action ?? (req.body.approve ? 'approve' : 'reject');
      const result = await service.verifyDoctor(req.params.doctorId, action, user.sub, req.body.reason);
      await logAdminAction(req, `doctor_${action}`, 'Doctor', req.params.doctorId, { reason: req.body.reason });
      sendSuccess(res, result, 'Doctor verification updated.');
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

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await service.listUsers({
        role: req.query.role as 'patient' | 'doctor' | 'admin' | undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: req.query.status as 'active' | 'inactive' | 'all' | undefined,
        page: parsePage(req.query.page),
        limit: parseLimit(req.query.limit)
      });
      sendSuccess(res, result, 'Users retrieved.', { page: result.page, total: result.total, totalPages: result.totalPages });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await service.getUser(req.params.userId);
      sendSuccess(res, user, 'User retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await service.updateUser(req.params.userId, req.body);
      await logAdminAction(req, 'user_update', 'User', req.params.userId, req.body);
      sendSuccess(res, user, 'User updated.');
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await service.setUserActive(req.params.userId, false);
      await logAdminAction(req, 'user_suspend', 'User', req.params.userId);
      sendSuccess(res, user, 'User suspended.');
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await service.setUserActive(req.params.userId, true);
      await logAdminAction(req, 'user_activate', 'User', req.params.userId);
      sendSuccess(res, user, 'User activated.');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await service.softDeleteUser(req.params.userId);
      await logAdminAction(req, 'user_delete', 'User', req.params.userId);
      sendSuccess(res, result, 'User deleted.');
    } catch (error) {
      next(error);
    }
  }

  async listAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await service.listAppointments({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        page: parsePage(req.query.page),
        limit: parseLimit(req.query.limit)
      });
      sendSuccess(res, result, 'Appointments retrieved.', { page: result.page, total: result.total, totalPages: result.totalPages });
    } catch (error) {
      next(error);
    }
  }

  async getAppointmentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await service.getAppointmentDetail(req.params.appointmentId);
      sendSuccess(res, detail, 'Appointment detail retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getPaymentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') ?? 'daily';
      const dashboard = await service.getPaymentDashboard(period);
      sendSuccess(res, dashboard, 'Payment dashboard retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async listReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rating = typeof req.query.rating === 'string' ? Number(req.query.rating) : undefined;
      const result = await service.listReviews({
        rating: Number.isFinite(rating) ? rating : undefined,
        page: parsePage(req.query.page),
        limit: parseLimit(req.query.limit)
      });
      sendSuccess(res, result, 'Reviews retrieved.', { page: result.page, total: result.total, totalPages: result.totalPages });
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await service.deleteReview(req.params.reviewId);
      await logAdminAction(req, 'review_delete', 'Review', req.params.reviewId);
      sendSuccess(res, review, 'Review removed.');
    } catch (error) {
      next(error);
    }
  }

  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await service.getSettings();
      sendSuccess(res, settings, 'Platform settings retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await service.updateSettings(req.body);
      await logAdminAction(req, 'settings_update', 'PlatformSettings', settings._id?.toString(), req.body);
      sendSuccess(res, settings, 'Platform settings updated.');
    } catch (error) {
      next(error);
    }
  }

  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await service.listAuditLogs(parsePage(req.query.page), parseLimit(req.query.limit, 30));
      sendSuccess(res, result, 'Audit logs retrieved.', { page: result.page, total: result.total, totalPages: result.totalPages });
    } catch (error) {
      next(error);
    }
  }
}
