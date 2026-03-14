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

import { validateBody } from "@/middleware/validate.js";

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

router.post('/register', validateBody(registerSchema), register);
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/refresh', refreshLimiter, validateBody(refreshTokenSchema), refreshToken);
router.post('/logout', validateBody(logoutSchema), logout);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', emailLimiter, validateBody(resendVerificationSchema), resendVerification);
router.post('/forgot-password', emailLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

export default router;