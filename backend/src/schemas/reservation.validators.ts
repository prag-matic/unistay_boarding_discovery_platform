import { z } from 'zod';

export const createReservationSchema = z.object({
  boardingId: z.string().min(1, 'boardingId is required'),
  moveInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'moveInDate must be in YYYY-MM-DD format'),
  specialRequests: z.string().max(1000, 'specialRequests max 1000 characters').optional(),
});

export const rejectReservationSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type RejectReservationInput = z.infer<typeof rejectReservationSchema>;
