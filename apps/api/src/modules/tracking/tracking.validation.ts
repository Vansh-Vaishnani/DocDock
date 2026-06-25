import { z } from 'zod';

export const trackingParamsSchema = z.object({
  params: z.object({ appointmentId: z.string().min(24) })
});

export const updateLocationSchema = z.object({
  params: z.object({ appointmentId: z.string().min(24) }),
  body: z.object({
    coordinates: z.tuple([z.number(), z.number()])
  })
});
