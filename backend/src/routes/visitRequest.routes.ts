import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth.js';
import { validateBody } from '@/middleware/validate.js';
import { visitRequestLimiter } from '@/middleware/rateLimit.js';

import {
    createVisitRequest,
} from '@/controllers/visitRequest.controller.js';

import {
 	createVisitRequestSchema,
} from '@/schemas/visitRequest.validators.js';

const router = Router();

router.use(visitRequestLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validateBody(createVisitRequestSchema), createVisitRequest);

export default router;
