import type { Router } from "express";
import { Router as createRouter } from "express";
import {
  approveVisitRequest,
  cancelVisitRequest,
  createVisitRequest,
  getMyBoardingVisitRequests,
  getMyVisitRequests,
  getVisitRequestById,
  rejectVisitRequest,
} from "@/controllers/visitRequest.controller.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { visitRequestLimiter } from "@/middleware/rateLimit.js";
import { validateBody } from "@/middleware/validate.js";

import {
  createVisitRequestSchema,
  rejectVisitRequestSchema,
} from "@/schemas/visitRequest.validators.js";

const router: Router = createRouter();

router.use(visitRequestLimiter);

router.post(
  "/",
  authenticate,
  requireRole("STUDENT"),
  validateBody(createVisitRequestSchema),
  createVisitRequest,
);
router.get(
  "/my-requests",
  authenticate,
  requireRole("STUDENT"),
  getMyVisitRequests,
);
router.get(
  "/my-boardings",
  authenticate,
  requireRole("OWNER"),
  getMyBoardingVisitRequests,
);
router.get("/:id", authenticate, getVisitRequestById);
router.patch(
  "/:id/approve",
  authenticate,
  requireRole("OWNER"),
  approveVisitRequest,
);
router.patch(
  "/:id/reject",
  authenticate,
  requireRole("OWNER"),
  validateBody(rejectVisitRequestSchema),
  rejectVisitRequest,
);
router.patch(
  "/:id/cancel",
  authenticate,
  requireRole("STUDENT"),
  cancelVisitRequest,
);

export default router;
