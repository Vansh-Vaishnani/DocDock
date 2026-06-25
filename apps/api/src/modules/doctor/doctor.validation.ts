import { z } from 'zod';

export const nearbyDoctorsSchema = z.object({
  query: z.object({
    latitude: z.string().transform(Number),
    longitude: z.string().transform(Number),
    radius: z.string().optional().transform((val) => (val ? Number(val) : 10000)),
    specialization: z.string().optional()
  })
});

export const availabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean()
  })
});

export const doctorProfileSchema = z.object({
  body: z.object({
    licenseNumber: z.string().min(3),
    specialization: z.string().min(3),
    qualifications: z.array(z.string().min(2)).min(1),
    experience: z.number().int().min(0),
    bio: z.string().min(10).max(500),
    languages: z.array(z.string().min(2)).min(1),
    consultationFee: z.number().int().min(0),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()])
    })
  })
});
