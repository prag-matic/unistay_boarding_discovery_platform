import { z } from 'zod';

export const createVisitRequestSchema = z.object({
  boardingId: z.string().min(1, 'boardingId is required'),
  requestedStartAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  requestedEndAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  message: z.string().max(1000, 'Message max 1000 characters').optional(),
});

export const rejectVisitRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export type CreateVisitRequestInput = z.infer<typeof createVisitRequestSchema>;
export type RejectVisitRequestInput = z.infer<typeof rejectVisitRequestSchema>;
