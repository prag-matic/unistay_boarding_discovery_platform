import type { Router } from "express";
import { Router as createRouter } from "express";
import {
	createMarketplaceItem,
	deleteMarketplaceImage,
	deleteMarketplaceItem,
	getMarketplaceItemById,
	getMyMarketplaceItems,
	getOpenMarketplaceReports,
	reinstateMarketplaceItem,
	reportMarketplaceItem,
	resolveMarketplaceReport,
	searchMarketplaceItems,
	takedownMarketplaceItem,
	updateMarketplaceItem,
	uploadMarketplaceImages,
} from "@/controllers/marketplace.controller.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { boardingLimiter } from "@/middleware/rateLimit.js";
import { uploadMarketplaceImageMiddleware } from "@/middleware/upload.js";
import {
	validateBody,
	validateParams,
	validateQuery,
} from "@/middleware/validate.js";
import {
	adminTakedownSchema,
	createMarketplaceItemSchema,
	marketplaceImageParamSchema,
	marketplaceItemIdParamSchema,
	marketplaceReportIdParamSchema,
	reportMarketplaceItemSchema,
	resolveMarketplaceReportSchema,
	searchMarketplaceQuerySchema,
	updateMarketplaceItemSchema,
} from "@/schemas/marketplace.validators.js";

const router: Router = createRouter();

router.use(boardingLimiter);

// Public
router.get("/", validateQuery(searchMarketplaceQuerySchema), searchMarketplaceItems);

// Student listing management
router.get("/my-ads", authenticate, requireRole("STUDENT"), getMyMarketplaceItems);
router.post(
	"/",
	authenticate,
	requireRole("STUDENT"),
	validateBody(createMarketplaceItemSchema),
	createMarketplaceItem,
);
router.put(
	"/:id",
	authenticate,
	requireRole("STUDENT"),
	validateParams(marketplaceItemIdParamSchema),
	validateBody(updateMarketplaceItemSchema),
	updateMarketplaceItem,
);
router.delete(
	"/:id",
	authenticate,
	requireRole("STUDENT"),
	validateParams(marketplaceItemIdParamSchema),
	deleteMarketplaceItem,
);
router.post(
	"/:id/images",
	authenticate,
	requireRole("STUDENT"),
	validateParams(marketplaceItemIdParamSchema),
	uploadMarketplaceImageMiddleware,
	uploadMarketplaceImages,
);
router.delete(
	"/:id/images/:imageId",
	authenticate,
	requireRole("STUDENT"),
	validateParams(marketplaceImageParamSchema),
	deleteMarketplaceImage,
);

// Reporting (authenticated users)
router.post(
	"/:id/report",
	authenticate,
	validateParams(marketplaceItemIdParamSchema),
	validateBody(reportMarketplaceItemSchema),
	reportMarketplaceItem,
);

// Admin moderation
router.get(
	"/reports/open",
	authenticate,
	requireRole("ADMIN"),
	getOpenMarketplaceReports,
);
router.patch(
	"/:id/takedown",
	authenticate,
	requireRole("ADMIN"),
	validateParams(marketplaceItemIdParamSchema),
	validateBody(adminTakedownSchema),
	takedownMarketplaceItem,
);
router.patch(
	"/:id/reinstate",
	authenticate,
	requireRole("ADMIN"),
	validateParams(marketplaceItemIdParamSchema),
	reinstateMarketplaceItem,
);
router.patch(
	"/reports/:reportId/resolve",
	authenticate,
	requireRole("ADMIN"),
	validateParams(marketplaceReportIdParamSchema),
	validateBody(resolveMarketplaceReportSchema),
	resolveMarketplaceReport,
);

router.get("/:id", validateParams(marketplaceItemIdParamSchema), getMarketplaceItemById);

export default router;
