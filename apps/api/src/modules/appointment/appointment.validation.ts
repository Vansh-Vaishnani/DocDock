import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().min(24),
    scheduledAt: z.string().datetime(),
    address: z.object({
      label: z.string().min(3),
      location: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()])
      })
    }),
    notes: z.string().optional()
  })
});

export const updateAppointmentStatusSchema = z.object({
  params: z.object({ appointmentId: z.string().min(24) }),
  body: z.object({ status: z.enum(["accepted", "rejected", "doctor_on_way", "in_consultation", "completed", "cancelled_by_patient", "cancelled_by_doctor"]) })
});
