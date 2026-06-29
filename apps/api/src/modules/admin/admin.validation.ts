import { z } from 'zod';

export const verifyDoctorSchema = z.object({
  params: z.object({ doctorId: z.string().min(24) }),
  body: z
    .object({
      action: z.enum(['approve', 'reject', 'suspend']),
      reason: z.string().optional(),
      approve: z.boolean().optional()
    })
    .refine((data) => data.action !== 'reject' || Boolean(data.reason?.trim()), {
      message: 'Rejection reason is required'
    })
});

export const listDoctorsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const listUsersSchema = z.object({
  query: z.object({
    role: z.enum(['patient', 'doctor', 'admin']).optional(),
    search: z.string().optional(),
    status: z.enum(['active', 'inactive', 'all']).optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const updateUserSchema = z.object({
  params: z.object({ userId: z.string().min(24) }),
  body: z.object({
    fullName: z.string().min(1).optional(),
    phone: z.string().min(5).optional(),
    email: z.string().email().optional()
  })
});

export const userIdParamSchema = z.object({
  params: z.object({ userId: z.string().min(24) })
});

export const listAppointmentsSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    search: z.string().optional(),
    date: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const appointmentIdParamSchema = z.object({
  params: z.object({ appointmentId: z.string().min(24) })
});

export const paymentDashboardSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly']).optional()
  })
});

export const listReviewsSchema = z.object({
  query: z.object({
    rating: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const reviewIdParamSchema = z.object({
  params: z.object({ reviewId: z.string().min(24) })
});

export const updateSettingsSchema = z.object({
  body: z.object({
    platformCommission: z.number().min(0).max(100).optional(),
    maxServiceRadius: z.number().min(1).optional(),
    defaultConsultationFee: z.number().min(0).optional(),
    maintenanceMode: z.boolean().optional()
  })
});

export const listAuditLogsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const doctorIdParamSchema = z.object({
  params: z.object({ doctorId: z.string().min(24) })
});
