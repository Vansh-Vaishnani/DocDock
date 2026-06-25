import { Request, Response, NextFunction } from 'express';

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
}
