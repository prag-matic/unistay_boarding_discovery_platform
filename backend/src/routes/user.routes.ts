import type { Router } from "express";
import { Router as createRouter } from "express";
import {
	changePassword,
	getMe,
	updateMe,
	uploadProfileImageHandler,
} from "@/controllers/user.controller.js";
import { authenticate } from "@/middleware/auth.js";
import { userLimiter } from "@/middleware/rateLimit.js";
import { uploadProfileImageMiddleware } from "@/middleware/upload.js";
import { validateBody } from "@/middleware/validate.js";
import { updateUserSchema } from "@/schemas/index.js";
import { changePasswordSchema } from "@/schemas/user.validators.js";

const router: Router = createRouter();

router.use(userLimiter, authenticate);

router.get("/me", getMe);
router.put("/me", validateBody(updateUserSchema), updateMe);
router.put("/me/password", validateBody(changePasswordSchema), changePassword);
router.put(
	"/me/profile-image",
	uploadProfileImageMiddleware,
	uploadProfileImageHandler,
);

export default router;
