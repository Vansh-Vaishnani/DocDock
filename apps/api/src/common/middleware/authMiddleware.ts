import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { ApiError } from '../errors/ApiError';
import { config } from '../config';

const getBearerToken = (headerValue?: string): string | null => {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }
  return headerValue.replace('Bearer ', '').trim();
};

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
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
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
