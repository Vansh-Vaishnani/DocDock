import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ApiError } from '../errors/ApiError';

export const validateRequest = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    schema.parse({ body: req.body, params: req.params, query: req.query });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
      next(new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details));
      return;
    }
    next(error);
  }
};
