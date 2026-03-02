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
} from '@/controllers/reservation.controller.js';


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


export default router;
