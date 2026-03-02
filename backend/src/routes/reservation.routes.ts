import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '@/middleware/validate.js';
import { reservationLimiter } from "@/middleware/rateLimit.js";

import {
    createReservation,
    getMyRequests,
    getMyBoardingRequests,
    getReservationById,
    approveReservation,
    rejectReservation,
    cancelReservation,
    completeReservation,
} from '@/controllers/reservation.controller.js';

import { getRentalPeriods } from '@/controllers/rentalPeriod.controller.js';

import {
    createReservationSchema,
    rejectReservationSchema,
} from '@/schemas/reservation.validators.js';

const router = Router();

router.use(reservationLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validateBody(createReservationSchema), createReservation);
router.get('/my-requests', authenticate, requireRole('STUDENT'), getMyRequests);
router.get('/my-boardings', authenticate, requireRole('OWNER'), getMyBoardingRequests);
router.get('/:id', authenticate, getReservationById);
router.patch('/:id/approve', authenticate, requireRole('OWNER'), approveReservation);
router.patch('/:id/reject', authenticate, requireRole('OWNER'), validateBody(rejectReservationSchema), rejectReservation);
router.patch('/:id/cancel', authenticate, requireRole('STUDENT'), cancelReservation);
router.patch('/:id/complete', authenticate, requireRole('OWNER'), completeReservation);
router.get('/:resId/rental-periods', authenticate, getRentalPeriods);

export default router;
