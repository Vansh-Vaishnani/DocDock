import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AIController } from './ai.controller';
import { ApiError } from '../../common/errors/ApiError';

describe('AIController Unit Tests', () => {
  let aiController: AIController;

  beforeEach(() => {
    aiController = new AIController();
    vi.restoreAllMocks();
  });

  describe('symptomCheck', () => {
    it('should throw validation ApiError if symptoms, duration, or severity are missing', async () => {
      const req = { body: { symptoms: 'fever' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      await aiController.symptomCheck(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('should return clinical rule-based triage response when Gemini key is missing or fails', async () => {
      const req = {
        body: {
          symptoms: 'severe chest pain and shortness of breath',
          duration: '2 hours',
          severity: 'high',
        },
      } as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await aiController.symptomCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            urgencyLevel: 'high',
            emergencyCareAdvised: true,
            recommendedSpecialist: 'Cardiologist',
          }),
        })
      );
    });
  });
});
