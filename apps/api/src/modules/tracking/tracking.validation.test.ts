import { describe, it, expect } from 'vitest';
import { trackingParamsSchema, updateLocationSchema } from './tracking.validation';

describe('Tracking Validation Schema (updateLocationSchema & trackingParamsSchema)', () => {
  describe('trackingParamsSchema', () => {
    it('should accept valid 24-character hex appointmentId', () => {
      const valid = { params: { appointmentId: '507f191e810c19729de86005' } };
      const result = trackingParamsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject appointmentId shorter than 24 characters', () => {
      const invalid = { params: { appointmentId: 'short_id' } };
      const result = trackingParamsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updateLocationSchema — Latitude & Longitude Bounds', () => {
    const validParams = { appointmentId: '507f191e810c19729de86005' };

    it('should accept exact boundary coordinates [-180, -90] and [180, 90]', () => {
      const minBounds = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [-180, -90] },
      });
      expect(minBounds.success).toBe(true);

      const maxBounds = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [180, 90] },
      });
      expect(maxBounds.success).toBe(true);
    });

    it('should accept standard decimal coordinates [72.5714, 23.0225]', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 23.0225] },
      });
      expect(result.success).toBe(true);
    });

    it('should reject longitude less than -180', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [-180.0001, 23.0225] },
      });
      expect(result.success).toBe(false);
    });

    it('should reject longitude greater than 180', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [180.0001, 23.0225] },
      });
      expect(result.success).toBe(false);
    });

    it('should reject latitude less than -90', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, -90.0001] },
      });
      expect(result.success).toBe(false);
    });

    it('should reject latitude greater than 90', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 90.0001] },
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric coordinates', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: ['72.5714' as any, 23.0225] },
      });
      expect(result.success).toBe(false);
    });

    it('should reject tuple with missing latitude or extra items', () => {
      const single = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714] as any },
      });
      expect(single.success).toBe(false);

      const triple = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 23.0225, 100] as any },
      });
      expect(triple.success).toBe(false);
    });
  });

  describe('updateLocationSchema — Timestamp Freshness', () => {
    const validParams = { appointmentId: '507f191e810c19729de86005' };

    it('should accept omitted optional timestamp', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 23.0225] },
      });
      expect(result.success).toBe(true);
    });

    it('should accept current timestamp', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 23.0225], timestamp: Date.now() },
      });
      expect(result.success).toBe(true);
    });

    it('should accept timestamp within 60 seconds in past', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 23.0225], timestamp: Date.now() - 60000 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject stale timestamp (> 120 seconds old)', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 23.0225], timestamp: Date.now() - 130000 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject future timestamp (> 30 seconds in future)', () => {
      const result = updateLocationSchema.safeParse({
        params: validParams,
        body: { coordinates: [72.5714, 23.0225], timestamp: Date.now() + 40000 },
      });
      expect(result.success).toBe(false);
    });
  });
});
