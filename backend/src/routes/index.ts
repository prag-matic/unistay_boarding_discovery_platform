import { Router } from "express";
import reviewRoutes from "./review.routes.js";

const router = Router();

/**
 * Routes directory
 *
 * Routes define API endpoints and map them to controllers.
 *
 * Structure:
 * - index.ts (main router - this file)
 * - review.routes.ts
 * - user.routes.ts (future)
 * - auth.routes.ts (future)
 * - boarding.routes.ts (future)
 * - chat.routes.ts (future)
 */

// Review routes
router.use("/reviews", reviewRoutes);

// Boarding routes (review access via boarding)
router.use("/boardings", reviewRoutes);

export default router;
