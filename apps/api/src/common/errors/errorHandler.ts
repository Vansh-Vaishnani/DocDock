import { Request, Response } from 'express';

import { ApiError } from './ApiError';

export const errorHandler = (err: Error | ApiError, req: Request, res: Response): void => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const code = err instanceof ApiError ? err.code : 'INTERNAL_SERVER_ERROR';
  const details = err instanceof ApiError ? err.details : undefined;

  console.error(`[${req.method}] ${req.originalUrl}`, err);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
    error: {
      code,
      details: details || []
    }
  });
};
