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
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", validateBody(refreshTokenSchema), refreshToken);
router.post("/logout", validateBody(logoutSchema), logout);
router.get("/verify-email", verifyEmail);
router.post(
  "/resend-verification",
  validateBody(resendVerificationSchema),
  resendVerification,
);
router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

export default router;
