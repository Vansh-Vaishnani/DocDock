import { z } from 'zod';

const pointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()])
});

const temporaryLocationSchema = z.object({
  label: z.string().min(1),
  location: pointSchema
});

export const createPaymentSchema = z.object({
  body: z.object({
    amount: z.number().int().positive(),
    doctorId: z.string().min(1),
    appointmentDate: z.string().min(1),
    appointmentTime: z.string().min(1),
    addressId: z.string().min(1).optional(),
    location: temporaryLocationSchema.optional(),
    notes: z.string().max(500).optional(),
    consultationMode: z.enum(['clinic', 'home', 'online']).optional()
  }).refine((value) => {
    const mode = value.consultationMode || 'clinic';
    if (mode === 'home') {
      return Boolean(value.addressId || value.location);
    }
    return true;
  }, {
    message: 'Either addressId or location is required for home consultations',
    path: ['addressId']
  })
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1)
  })
});
