import { 
    getMe, 
    updateMe, 
    changePassword,
    uploadProfileImageHandler,
} from "@/controllers/user.controller.js";

import { uploadProfileImageMiddleware } from "@/middleware/upload.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { userLimiter } from "@/middleware/rateLimit.js";
import { validateBody } from "@/middleware/validate.js";
import { updateUserSchema } from "@/schemas/index.js";
import { changePasswordSchema } from "@/schemas/user.validators.js";
import { Router } from "express";

const router = Router();

router.use(userLimiter, authenticate);

router.get('/me', getMe);
router.put('/me', validateBody(updateUserSchema), updateMe);
router.put('/me/password', validateBody(changePasswordSchema), changePassword);
router.put('/me/profile-image', uploadProfileImageMiddleware, uploadProfileImageHandler);

export default router;
