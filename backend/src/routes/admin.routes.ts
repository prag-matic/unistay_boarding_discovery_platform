import { Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth.js';
import { adminLimiter } from '@/middleware/rateLimit.js'
import { validateQuery } from '@/middleware/validate.js';
import { adminListUsersQuerySchema } from '@/schemas/user.validators.js'
import { listUsers, getUserById, activateUser, deactivateUser } from '@/controllers/admin.controller.js';

const router = Router();

router.use(adminLimiter, authenticate, requireRole('ADMIN'));

router.get('/users', validateQuery(adminListUsersQuerySchema), listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/deactivate', deactivateUser);
router.patch('/users/:id/activate', activateUser);

export default router;