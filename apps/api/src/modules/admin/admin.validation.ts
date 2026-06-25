import { z } from 'zod';

export const verifyDoctorSchema = z.object({
  params: z.object({ doctorId: z.string().min(24) }),
  body: z.object({ approve: z.boolean(), reason: z.string().optional() })
});
