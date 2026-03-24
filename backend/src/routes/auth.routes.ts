import type { Router } from "express";
import { Router as createRouter } from "express";
import {
	forgotPassword,
	login,
	logout,
	refreshToken,
	register,
	resendVerification,
	resetPassword,
	verifyEmail,
} from "@/controllers/auth.controller.js";
import {
	emailLimiter,
	loginLimiter,
	refreshLimiter,
} from "@/middleware/rateLimit.js";

import { validateBody } from "@/middleware/validate.js";

import {
	forgotPasswordSchema,
	loginSchema,
	logoutSchema,
	refreshTokenSchema,
	registerSchema,
	resendVerificationSchema,
	resetPasswordSchema,
} from "@/schemas/auth.validators.js";

const router: Router = createRouter();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post(
	"/refresh",
	refreshLimiter,
	validateBody(refreshTokenSchema),
	refreshToken,
);
router.post("/logout", validateBody(logoutSchema), logout);
router.get("/verify-email", verifyEmail);
router.post(
	"/resend-verification",
	emailLimiter,
	validateBody(resendVerificationSchema),
	resendVerification,
);
router.post(
	"/forgot-password",
	emailLimiter,
	validateBody(forgotPasswordSchema),
	forgotPassword,
);
router.post(
	"/reset-password",
	validateBody(resetPasswordSchema),
	resetPassword,
);

export default router;
