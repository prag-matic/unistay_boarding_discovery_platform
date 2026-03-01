import { Router } from "express";
import { 
    loginLimiter, 
    refreshLimiter, 
    emailLimiter 
} from "@/middleware/rateLimit.js";

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

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, validate(refreshTokenSchema), refreshToken);
router.post('/logout', validate(logoutSchema), logout);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', emailLimiter, validate(resendVerificationSchema), resendVerification);
router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;