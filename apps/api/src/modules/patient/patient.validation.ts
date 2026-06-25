import { z } from 'zod';

export const addAddressSchema = z.object({
  body: z.object({
    label: z.string().min(3),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()])
    }),
    isDefault: z.boolean().optional().default(false)
  })
});
