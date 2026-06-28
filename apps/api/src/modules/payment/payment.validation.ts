import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    amount: z.number().int().positive(),
    doctorId: z.string().min(1),
    appointmentDate: z.string().min(1),
    appointmentTime: z.string().min(1),
    addressId: z.string().min(1),
    notes: z.string().max(500).optional()
  })
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1)
  })
});
