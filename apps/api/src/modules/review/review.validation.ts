import { z } from 'zod';

export const submitReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional().default('')
  }),
  params: z.object({
    appointmentId: z.string().min(1)
  })
});

export const listDoctorReviewsSchema = z.object({
  params: z.object({
    doctorId: z.string().min(1)
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    sort: z.enum(['createdAt', 'rating']).optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc')
  })
});

export const replyReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1)
  }),
  body: z.object({
    reply: z.string().trim().min(1).max(1000)
  })
});

export const moderateReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1)
  }),
  body: z.object({
    isHidden: z.boolean()
  })
});
