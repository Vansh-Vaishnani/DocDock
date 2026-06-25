import { z } from 'zod';

const medicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dosage: z.string().trim().min(1),
  frequency: z.string().trim().min(1),
  duration: z.string().trim().min(1),
  instructions: z.string().trim().max(500).optional(),
  quantity: z.number().int().positive().optional()
});

export const createPrescriptionSchema = z.object({
  body: z.object({
    appointmentId: z.string().min(1),
    diagnosis: z.string().trim().min(1).max(500),
    chiefComplaints: z.string().trim().min(1).max(1000),
    medications: z.array(medicationSchema).min(1),
    labTests: z.array(z.string().trim().min(1)).optional(),
    advice: z.string().trim().max(2000).optional(),
    followUpDate: z.string().datetime().optional()
  })
});

export const getPrescriptionSchema = z.object({
  params: z.object({
    prescriptionId: z.string().min(1)
  })
});

export const getPatientPrescriptionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10)
  })
});
