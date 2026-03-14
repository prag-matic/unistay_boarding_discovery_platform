import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth.js';
import { adminLimiter } from '@/middleware/rateLimit.js'
import { validateQuery, validateParams, validateBody } from '@/middleware/validate.js';
import { adminListUsersQuerySchema } from '@/schemas/user.validators.js'
import { rejectBoardingSchema } from '@/schemas/boarding.validators.js'
import { 
    listUsers, 
    getUserById, 
    activateUser, 
    deactivateUser,
    listPendingBoardings,
    approveBoarding,
    rejectBoarding, 
} from '@/controllers/admin.controller.js';

const router = Router();

router.use(adminLimiter, authenticate, requireRole('ADMIN'));

router.get('/users', validateQuery(adminListUsersQuerySchema), listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/deactivate', deactivateUser);
router.patch('/users/:id/activate', activateUser);

router.get('/boardings/pending', listPendingBoardings);
router.patch('/boardings/:id/approve', approveBoarding);
router.patch('/boardings/:id/reject', validateBody(rejectBoardingSchema), rejectBoarding);

export default router;