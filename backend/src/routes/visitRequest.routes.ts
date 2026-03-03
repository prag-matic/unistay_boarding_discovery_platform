import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth.js';
import { validateBody } from '@/middleware/validate.js';
import { visitRequestLimiter } from '@/middleware/rateLimit.js';

import {
    createVisitRequest,
    getMyVisitRequests,
  	getMyBoardingVisitRequests,
  	getVisitRequestById,
  	approveVisitRequest,
  	rejectVisitRequest,
  	cancelVisitRequest,
} from '@/controllers/visitRequest.controller.js';

import {
 	createVisitRequestSchema,
  	rejectVisitRequestSchema,
} from '@/schemas/visitRequest.validators.js';

const router = Router();

router.use(visitRequestLimiter);

router.post('/', authenticate, requireRole('STUDENT'), validateBody(createVisitRequestSchema), createVisitRequest);
router.get('/my-requests', authenticate, requireRole('STUDENT'), getMyVisitRequests);
router.get('/my-boardings', authenticate, requireRole('OWNER'), getMyBoardingVisitRequests);
router.get('/:id', authenticate, getVisitRequestById);
router.patch('/:id/approve', authenticate, requireRole('OWNER'), approveVisitRequest);
router.patch('/:id/reject', authenticate, requireRole('OWNER'), validateBody(rejectVisitRequestSchema), rejectVisitRequest);
router.patch('/:id/cancel', authenticate, requireRole('STUDENT'), cancelVisitRequest);

export default router;
