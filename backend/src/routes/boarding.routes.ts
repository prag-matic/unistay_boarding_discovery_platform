import type { Router } from "express";
import { Router as createRouter } from "express";
import {
  activateBoarding,
  archiveBoarding,
  createBoarding,
  deactivateBoarding,
  deleteImage,
  getBoardingStatusHistory,
  getBoardingBySlug,
  getBoardingLifecycleSpec,
  getMyListings,
  restoreBoarding,
  searchBoardings,
  submitBoarding,
  updateBoarding,
  uploadImages,
} from "@/controllers/boarding.controller.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { uploadBoardingImageMiddleware } from "@/middleware/upload.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middleware/validate.js";
import {
  boardingIdParamSchema,
  createBoardingSchema,
  searchBoardingsQuerySchema,
  updateBoardingSchema,
} from "@/schemas/boarding.validators.js";

const router: Router = createRouter();

// Public routes
router.get("/", validateQuery(searchBoardingsQuerySchema), searchBoardings);
router.get("/lifecycle/spec", getBoardingLifecycleSpec);

// Owner-only routes
router.get("/my-listings", authenticate, requireRole("OWNER"), getMyListings);

router.post(
  "/",
  authenticate,
  requireRole("OWNER"),
  validateBody(createBoardingSchema),
  createBoarding,
);

router.put(
  "/:id",
  authenticate,
  requireRole("OWNER"),
  validateParams(boardingIdParamSchema),
  validateBody(updateBoardingSchema),
  updateBoarding,
);

router.patch(
  "/:id/submit",
  authenticate,
  requireRole("OWNER"),
  validateParams(boardingIdParamSchema),
  submitBoarding,
);

router.patch(
  "/:id/deactivate",
  authenticate,
  requireRole("OWNER"),
  validateParams(boardingIdParamSchema),
  deactivateBoarding,
);

router.patch(
  "/:id/activate",
  authenticate,
  requireRole("OWNER"),
  validateParams(boardingIdParamSchema),
  activateBoarding,
);

router.patch(
  "/:id/archive",
  authenticate,
  requireRole("OWNER"),
  validateParams(boardingIdParamSchema),
  archiveBoarding,
);

router.patch(
  "/:id/restore",
  authenticate,
  requireRole("OWNER"),
  validateParams(boardingIdParamSchema),
  restoreBoarding,
);

router.get(
  "/:id/status-history",
  authenticate,
  requireRole("OWNER", "ADMIN"),
  validateParams(boardingIdParamSchema),
  getBoardingStatusHistory,
);

router.post(
  "/:id/images",
  authenticate,
  requireRole("OWNER"),
  uploadBoardingImageMiddleware,
  uploadImages,
);

router.delete(
  "/:id/images/:imageId",
  authenticate,
  requireRole("OWNER"),
  deleteImage,
);

// Public slug route (after all specific paths)
router.get("/:slug", getBoardingBySlug);

export default router;
