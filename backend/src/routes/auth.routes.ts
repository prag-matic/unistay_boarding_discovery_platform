import { Router } from "express";
import rateLimit from "express-rate-limit";

import { 
    login, 
    logout, 
    refreshToken, 
    register, 
    verifyEmail, 
    resendVerification, 
    forgotPassword, 
    resetPassword
} from "@/controllers/auth.controller.js";

import { validate } from "@/middleware/validate.js";

import { 
    loginSchema, 
    logoutSchema, 
    refreshTokenSchema, 
    registerSchema, 
    resendVerificationSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema 
} from "@/schemas/auth.validators.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many login attempts. Please try again after 1 minute.',
    timestamp: new Date().toISOString(),
  },
});

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many token refresh attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
});

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, validate(refreshTokenSchema), refreshToken);
router.post('/logout', validate(logoutSchema), logout);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', emailLimiter, validate(resendVerificationSchema), resendVerification);
router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;