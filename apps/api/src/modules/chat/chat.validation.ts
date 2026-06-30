import { z } from 'zod';

export const chatRoomSchema = z.object({
  body: z.object({ appointmentId: z.string().min(24) })
});

export const chatHistorySchema = z.object({
  params: z.object({ roomId: z.string().min(1) })
});

export const chatMessageSchema = z.object({
  params: z.object({ roomId: z.string().min(1) }),
  body: z.object({
    appointmentId: z.string().min(24),
    type: z.enum(['text', 'image', 'prescription', 'document']),
    content: z.string().max(2000).optional(),
    mediaUrl: z.string().url().optional()
  }).refine((data) => data.type === 'text' ? !!data.content : !!data.mediaUrl, {
    message: 'Text messages require content and image/attachment messages require mediaUrl',
    path: ['content']
  })
});
