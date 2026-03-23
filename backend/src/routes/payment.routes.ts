import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '@/middleware/validate.js';
import { paymentLimiter } from '@/middleware/rateLimit.js';
import { uploadPaymentProofMiddleware } from '@/middleware/upload.js';

import {
  logPayment,
  getMyPayments,
  getMyBoardingPayments,
  confirmPayment,
  rejectPayment,
  uploadProofImage,
} from '@/controllers/payment.controller.js';

import { 
  logPaymentSchema, 
  rejectPaymentSchema 
} from  '@/schemas/payment.validators.js';

const router = Router();

router.use(paymentLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validate(logPaymentSchema), logPayment);
router.get('/my-payments', authenticate, requireRole('STUDENT'), getMyPayments);
router.get('/my-boardings', authenticate, requireRole('OWNER'), getMyBoardingPayments);
router.put('/proof-image', authenticate, requireRole('STUDENT'), uploadPaymentProofMiddleware, uploadProofImage);
router.patch('/:id/confirm', authenticate, requireRole('OWNER'), confirmPayment);
router.patch('/:id/reject', authenticate, requireRole('OWNER'), validate(rejectPaymentSchema), rejectPayment);

export default router;
