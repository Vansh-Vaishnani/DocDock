import { z } from 'zod';

const appointmentStatusEnum = z.enum([
  'accepted',
  'rejected',
  'doctor_on_way',
  'arrived',
  'in_consultation',
  'completed',
  'cancelled_by_patient',
  'cancelled_by_doctor'
]);

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
  body: z.object({ status: appointmentStatusEnum })
});

export const listAppointmentsSchema = z.object({
  query: z.object({
    filter: z.enum(['upcoming', 'history', 'all']).optional()
  })
});

export const availableSlotsSchema = z.object({
  params: z.object({ id: z.string().min(24) }),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
});
