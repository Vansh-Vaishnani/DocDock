import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

import { errorHandler } from './errorHandler';
import { ApiError } from './ApiError';

describe('Global Error Handler Middleware', () => {
  it('should handle ApiError and return correct status code and structured JSON', () => {
    const apiErr = new ApiError('Resource not found', 404, 'NOT_FOUND', [{ field: 'id', message: 'invalid' }]);
    const req = { method: 'GET', originalUrl: '/api/v1/resource/123' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(apiErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Resource not found',
      error: {
        code: 'NOT_FOUND',
        details: [{ field: 'id', message: 'invalid' }],
      },
    });
  });

  it('should handle unexpected generic Error and return 500 INTERNAL_SERVER_ERROR', () => {
    const genericErr = new Error('Database connection failed');
    const req = { method: 'POST', originalUrl: '/api/v1/auth/login' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(genericErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Database connection failed',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        details: [],
      },
    });
  });

  it('should normalize non-Error string exceptions', () => {
    const stringErr = 'Unexpected network drop';
    const req = { method: 'GET', originalUrl: '/api/v1/health' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(stringErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unexpected network drop',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        details: [],
      },
    });
  });
});
