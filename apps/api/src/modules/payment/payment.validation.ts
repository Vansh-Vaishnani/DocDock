import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    appointmentId: z.string().min(24),
    amount: z.number().int().positive()
  })
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1)
  })
});
