import { Router } from "express";
import { boardingLimiter } from "@/middleware/rateLimit.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { uploadBoardingImageMiddleware } from "@/middleware/upload.js"
import { validateBody, validateParams, validateQuery } from "@/middleware/validate.js";
import { 
    searchBoardingsQuerySchema,
    createBoardingSchema,
    updateBoardingSchema, 
} from "@/schemas/boarding.validators.js";

import { 
    searchBoardings, 
    getMyListings,
    createBoarding,
    updateBoarding,
    submitBoarding,
    deactivateBoarding,
    activateBoarding,
    uploadImages,
    deleteImage, 
    getBoardingBySlug,
} from '@/controllers/boarding.controller.js';

const router = Router();

router.use(boardingLimiter);

// Public routes
router.get('/', validateQuery(searchBoardingsQuerySchema), searchBoardings);

// Owner-only routes
router.get('/my-listings', authenticate, requireRole('OWNER'), getMyListings);
router.post('/', authenticate, requireRole('OWNER'), validateBody(createBoardingSchema), createBoarding);
router.put('/:id', authenticate, requireRole('OWNER'), validateParams(updateBoardingSchema), updateBoarding);
router.patch('/:id/submit', authenticate, requireRole('OWNER'), submitBoarding);
router.patch('/:id/deactivate', authenticate, requireRole('OWNER'), deactivateBoarding);
router.patch('/:id/activate', authenticate, requireRole('OWNER'), activateBoarding);
router.post('/:id/images', authenticate, requireRole('OWNER'), uploadBoardingImageMiddleware, uploadImages);
router.delete('/:id/images/:imageId', authenticate, requireRole('OWNER'), deleteImage);


// Public slug route (after all specific paths)
router.get('/:slug', getBoardingBySlug);

export default router;