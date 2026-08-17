import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, AuthenticatedRequest } from './authMiddleware';
import { ApiError } from '../errors/ApiError';
import { config } from '../config';

describe('Auth Middleware Unit Tests', () => {
  describe('authenticate', () => {
    it('should throw 401 ApiError if Authorization header is missing', () => {
      const req = { headers: {} } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTH_REQUIRED');
    });

    it('should throw 401 ApiError if Authorization header is not Bearer format', () => {
      const req = { headers: { authorization: 'Basic token123' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTH_REQUIRED');
    });

    it('should throw 401 ApiError if token signature is invalid', () => {
      const req = { headers: { authorization: 'Bearer invalid.jwt.token' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('INVALID_TOKEN');
    });

    it('should attach user payload and call next() on valid token', () => {
      const payload = { sub: 'user_123', role: 'patient', iat: 12345, exp: 9999999999 };
      const token = jwt.sign(payload, config.jwtAccessSecret);

      const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.sub).toBe('user_123');
      expect(req.user?.role).toBe('patient');
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireRole', () => {
    it('should return 403 ApiError if user is not attached to req', () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole(['doctor', 'admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('should return 403 ApiError if user role is not authorized', () => {
      const req = { user: { sub: 'user_1', role: 'patient' } } as AuthenticatedRequest;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole(['doctor', 'admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('should call next() if user role is authorized', () => {
      const req = { user: { sub: 'user_1', role: 'doctor' } } as AuthenticatedRequest;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole(['doctor', 'admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
