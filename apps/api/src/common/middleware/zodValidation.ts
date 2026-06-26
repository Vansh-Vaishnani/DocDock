import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../errors/ApiError';

export interface ValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware factory for request validation using Zod
 */
export const validateRequestWithZod = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate body
      if (schema.body) {
        const bodyResult = schema.body.safeParse(req.body);
        if (!bodyResult.success) {
          const details = bodyResult.error.errors.map((error) => ({
            field: error.path.join('.'),
            message: error.message
          }));
          throw new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details);
        }
        req.body = bodyResult.data;
      }

      // Validate query
      if (schema.query) {
        const queryResult = schema.query.safeParse(req.query);
        if (!queryResult.success) {
          const details = queryResult.error.errors.map((error) => ({
            field: error.path.join('.'),
            message: error.message
          }));
          throw new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details);
        }
        // Cast to any to avoid Express type mismatch
        (req.query as any) = queryResult.data;
      }

      // Validate params
      if (schema.params) {
        const paramsResult = schema.params.safeParse(req.params);
        if (!paramsResult.success) {
          const details = paramsResult.error.errors.map((error) => ({
            field: error.path.join('.'),
            message: error.message
          }));
          throw new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details);
        }
        req.params = paramsResult.data as Record<string, string>;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Standalone validation function
 */
export const validateData = async <T>(data: unknown, schema: ZodSchema): Promise<T> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map((error) => ({
      field: error.path.join('.'),
      message: error.message
    }));
    throw new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details);
  }
  return result.data as T;
};
