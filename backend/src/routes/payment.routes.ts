import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  logPayment,
  getMyPayments,
  getMyBoardingPayments,
  confirmPayment,
  rejectPayment,
} from '../controllers/payment.controller.js';
import { logPaymentSchema, rejectPaymentSchema } from '../validators/payment.validators';

const router = Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
});

router.use(paymentLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validate(logPaymentSchema), logPayment);
router.get('/my-payments', authenticate, requireRole('STUDENT'), getMyPayments);
router.get('/my-boardings', authenticate, requireRole('OWNER'), getMyBoardingPayments);
router.patch('/:id/confirm', authenticate, requireRole('OWNER'), confirmPayment);
router.patch('/:id/reject', authenticate, requireRole('OWNER'), validate(rejectPaymentSchema), rejectPayment);

export default router;
