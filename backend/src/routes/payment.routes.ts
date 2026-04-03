import type { Router } from "express";
import { Router as createRouter } from "express";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { paymentLimiter } from "@/middleware/rateLimit.js";
import { validate } from "@/middleware/validate.js";
import {
	logPaymentSchema,
	rejectPaymentSchema,
} from "@/schemas/payment.validators.js";
import {
	confirmPayment,
	getMyBoardingPayments,
	getMyPayments,
	logPayment,
	rejectPayment,
} from "../controllers/payment.controller.js";

const router: Router = createRouter();

router.use(paymentLimiter);

router.post(
	"/",
	authenticate,
	requireRole("STUDENT"),
	validate(logPaymentSchema),
	logPayment,
);

router.get("/my-payments", authenticate, requireRole("STUDENT"), getMyPayments);

router.get(
	"/my-boardings",
	authenticate,
	requireRole("OWNER"),
	getMyBoardingPayments,
);

router.patch(
	"/:id/confirm",
	authenticate,
	requireRole("OWNER"),
	confirmPayment,
);

router.patch(
	"/:id/reject",
	authenticate,
	requireRole("OWNER"),
	validate(rejectPaymentSchema),
	rejectPayment,
);

export default router;
