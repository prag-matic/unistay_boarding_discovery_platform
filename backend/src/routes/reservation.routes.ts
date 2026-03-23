import type { Router } from "express";
import { Router as createRouter } from "express";
import { getRentalPeriods } from "@/controllers/rentalPeriod.controller.js";
import {
  approveReservation,
  cancelReservation,
  completeReservation,
  createReservation,
  getMyBoardingRequests,
  getMyRequests,
  getReservationById,
  rejectReservation,
} from "@/controllers/reservation.controller.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { reservationLimiter } from "@/middleware/rateLimit.js";

import {
  createReservationSchema,
  rejectReservationSchema,
} from "@/schemas/reservation.validators.js";

import { validateBody } from "@/middleware/validate.js";

const router: Router = createRouter();

router.use(reservationLimiter);

router.post(
  "/",
  authenticate,
  requireRole("STUDENT"),
  validateBody(createReservationSchema),
  createReservation,
);
router.get("/my-requests", authenticate, requireRole("STUDENT"), getMyRequests);
router.get(
  "/my-boardings",
  authenticate,
  requireRole("OWNER"),
  getMyBoardingRequests,
);
router.get("/:id", authenticate, getReservationById);
router.patch(
  "/:id/approve",
  authenticate,
  requireRole("OWNER"),
  approveReservation,
);
router.patch(
  "/:id/reject",
  authenticate,
  requireRole("OWNER"),
  validateBody(rejectReservationSchema),
  rejectReservation,
);
router.patch(
  "/:id/cancel",
  authenticate,
  requireRole("STUDENT"),
  cancelReservation,
);
router.patch(
  "/:id/complete",
  authenticate,
  requireRole("OWNER"),
  completeReservation,
);
router.get("/:resId/rental-periods", authenticate, getRentalPeriods);

export default router;
