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

export type AuthenticatedRequest = Request & { user?: AuthPayload };

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authenticatedReq = req as AuthenticatedRequest;
  const token = getBearerToken(authenticatedReq.headers.authorization);
  if (!token) {
    next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as AuthPayload;
    authenticatedReq.user = payload;
    next();
  } catch {
    next(new ApiError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};

export const requireRole = (roles: Array<'patient' | 'doctor' | 'admin'>) => (req: Request, _res: Response, next: NextFunction): void => {
  const authenticatedReq = req as AuthenticatedRequest;
  const user = authenticatedReq.user as AuthPayload | undefined;
  if (!user || !roles.includes(user.role)) {
    next(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    return;
  }
  next();
};
