import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth.js';
import { savedBoardingLimiter } from '@/middleware/rateLimit.js';
import {
    saveBoarding,
    unsaveBoarding,
    getSavedBoardings,
} from '@/controllers/savedBoarding.controller.js';

const router = Router();

router.use(savedBoardingLimiter, authenticate, requireRole('STUDENT'));

router.get('/', getSavedBoardings);
router.post('/:boardingId', saveBoarding);
router.delete('/:boardingId', unsaveBoarding);

export default router;
