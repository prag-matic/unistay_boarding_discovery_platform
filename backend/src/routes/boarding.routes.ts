import { Router } from "express";
import { boardingLimiter } from "@/middleware/rateLimit.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { validateQuery } from "@/middleware/validate.js";
import { searchBoardingsQuerySchema } from "@/schemas/boarding.validators.js";

import { searchBoardings, getMyListings } from '@/controllers/boarding.controller.js';

const router = Router();

router.use(boardingLimiter);

// Public routes
router.get('/', validateQuery(searchBoardingsQuerySchema), searchBoardings);

// Owner-only routes (must come before /:slug to avoid conflict)
router.get('/my-listings', authenticate, requireRole('OWNER'), getMyListings);



// Public slug route (after all specific paths)
// router.get('/:slug', getBoardingBySlug);

export default router;