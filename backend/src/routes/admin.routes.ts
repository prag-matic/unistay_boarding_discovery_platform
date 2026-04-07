import type { Router } from "express";
import { Router as createRouter } from "express";
import {
	activateUser,
	approveBoarding,
	deactivateUser,
	getUserById,
	listPendingBoardings,
	listUsers,
	rejectBoarding,
	reopenBoarding,
} from "@/controllers/admin.controller.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { adminLimiter } from "@/middleware/rateLimit.js";
import { validateBody, validateQuery } from "@/middleware/validate.js";
import {
	moderationNoteSchema,
	rejectBoardingSchema,
} from "@/schemas/boarding.validators.js";
import { adminListUsersQuerySchema } from "@/schemas/user.validators.js";

const router: Router = createRouter();

router.use(adminLimiter, authenticate, requireRole("ADMIN"));

router.get("/users", validateQuery(adminListUsersQuerySchema), listUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id/deactivate", deactivateUser);
router.patch("/users/:id/activate", activateUser);

router.get("/boardings/pending", listPendingBoardings);
router.patch(
	"/boardings/:id/approve",
	validateBody(moderationNoteSchema),
	approveBoarding,
);
router.patch(
	"/boardings/:id/reject",
	validateBody(rejectBoardingSchema),
	rejectBoarding,
);
router.patch(
	"/boardings/:id/reopen",
	validateBody(moderationNoteSchema),
	reopenBoarding,
);

export default router;
