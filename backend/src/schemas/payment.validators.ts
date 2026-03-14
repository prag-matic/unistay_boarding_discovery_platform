import { z } from 'zod';

export const logPaymentSchema = z.object({
  rentalPeriodId: z.string().min(1, 'rentalPeriodId is required'),
  reservationId: z.string().min(1, 'reservationId is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'ONLINE']),
  referenceNumber: z.string().max(100, 'Reference number max 100 characters').optional(),
  proofImageUrl: z.string().url('proofImageUrl must be a valid URL').optional(),
  paidAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
});

export const rejectPaymentSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export type LogPaymentInput = z.infer<typeof logPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
