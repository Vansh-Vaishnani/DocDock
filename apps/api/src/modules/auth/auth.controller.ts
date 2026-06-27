import { Request, Response, NextFunction } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendCreated(res, result, 'Registration successful. Please verify your email.');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login successful.');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refreshToken(req.body.refreshToken);
      sendSuccess(res, tokens, 'Token refreshed successfully.');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.forgotPassword(req.body.email);
      sendSuccess(res, {}, 'Password reset link sent to your email.');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, {}, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      if (!authenticatedReq.user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }
      await authService.changePassword(authenticatedReq.user.sub, req.body.currentPassword, req.body.newPassword);
      sendSuccess(res, {}, 'Password changed successfully.');
    } catch (error) {
      next(error);
    }
  }
}
