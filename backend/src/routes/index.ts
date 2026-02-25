import { Router } from 'express';

const router = Router();

/**
 * Routes directory
 *
 * Routes define API endpoints and map them to controllers.
 *
 * Structure:
 * - index.ts (main router - this file)
 * - user.routes.ts
 * - auth.routes.ts
 * - boarding.routes.ts
 * - review.routes.ts
 * - chat.routes.ts (future)
 *
 * Example:
 * ```typescript
 * import userRoutes from './user.routes';
 * router.use('/users', userRoutes);
 * ```
 */

// Import and register routes here as they are created
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/boardings', boardingRoutes);
// router.use('/reviews', reviewRoutes);

export default router;
