import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '@/middleware/validate.js';
import { reservationLimiter } from "@/middleware/rateLimit.js";

import {
    createReservation,
    getMyRequests,
} from '@/controllers/reservation.controller.js';


import {
    createReservationSchema,
    rejectReservationSchema,
} from '@/schemas/reservation.validators.js';

const router = Router();

router.use(reservationLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validateBody(createReservationSchema), createReservation);
router.get('/my-requests', authenticate, requireRole('STUDENT'), getMyRequests);

export default router;
