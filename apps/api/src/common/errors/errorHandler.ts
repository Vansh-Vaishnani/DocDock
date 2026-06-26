

import { ApiError } from './ApiError';

import { Request, Response, NextFunction } from 'express';

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return new Error((error as any).message);
  }

  return new Error('An unexpected error occurred.');
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = normalizeError(err);
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const code = err instanceof ApiError ? err.code : 'INTERNAL_SERVER_ERROR';
  const details = err instanceof ApiError ? err.details : undefined;

  console.error(`[${req.method}] ${req.originalUrl}`, err);

  if (!res || typeof res.status !== 'function') {
    console.error('Error handler received an invalid response object:', res);
    return;
  }

  res.status(statusCode).json({
    success: false,
    message: error.message,
    error: {
      code,
      details: details || [],
    },
  });
};
