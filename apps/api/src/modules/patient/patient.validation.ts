import { z } from 'zod';

const locationSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()])
});

export const addAddressSchema = z.object({
  body: z.object({
    label: z.string().min(3),
    addressLine: z.string().optional(),
    location: locationSchema,
    isDefault: z.boolean().optional().default(false)
  })
});

export const updateAddressSchema = z.object({
  params: z.object({
    addressId: z.string().min(1)
  }),
  body: z.object({
    label: z.string().min(3).optional(),
    addressLine: z.string().optional(),
    location: locationSchema.optional(),
    isDefault: z.boolean().optional()
  })
});

export const addressIdSchema = z.object({
  params: z.object({
    addressId: z.string().min(1)
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    bloodGroup: z.string().max(10).optional(),
    allergies: z.array(z.string().min(1)).optional(),
    medicalHistory: z
      .array(
        z.object({
          note: z.string().min(1),
          createdAt: z.string().datetime().optional()
        })
      )
      .optional()
  })
});
