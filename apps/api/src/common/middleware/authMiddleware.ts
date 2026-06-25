import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../errors/ApiError';
import { config } from '../config';

export interface AuthPayload {
  sub: string;
  role: 'patient' | 'doctor' | 'admin';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    next(new ApiError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};

export const requireRole = (roles: Array<'patient' | 'doctor' | 'admin'>) => (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user || !roles.includes(user.role)) {
    next(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    return;
  }
  next();
};
