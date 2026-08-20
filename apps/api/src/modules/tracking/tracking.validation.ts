import { z } from 'zod';

export const trackingParamsSchema = z.object({
  params: z.object({ appointmentId: z.string().min(24) })
});

export const updateLocationSchema = z.object({
  params: z.object({ appointmentId: z.string().min(24) }),
  body: z.object({
    // GeoJSON point format [longitude, latitude] or explicit object
    coordinates: z
      .tuple([
        z.number({ required_error: 'Longitude is required' }).min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
        z.number({ required_error: 'Latitude is required' }).min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
      ]),
    timestamp: z.number().optional().refine((val) => {
      if (!val) return true;
      const now = Date.now();
      // Timestamp must not be more than 120 seconds old, nor more than 30 seconds in the future
      return val > now - 120000 && val < now + 30000;
    }, { message: 'Timestamp is stale or invalid' }),
  })
});
