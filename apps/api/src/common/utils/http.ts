import { Response } from 'express';

export const sendSuccess = (res: Response, data: unknown = {}, message = 'Success', meta?: unknown): Response => {
  const payload: Record<string, unknown> = {
    success: true,
    message,
    data
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(200).json(payload);
};

export const sendCreated = (res: Response, data: unknown = {}, message = 'Created'): Response => {
  return res.status(201).json({ success: true, message, data });
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).json({ success: true, message: 'No content', data: {} });
};
