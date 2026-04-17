import type { Router } from "express";
import { Router as createRouter } from "express";
import {
	activateUser,
	approveBoarding,
	confirmPaymentsBulk,
	confirmPaymentByAdmin,
	deactivateUser,
	deleteReviewsBulk,
	deleteReviewByAdmin,
	getAdminDashboardKpis,
	getUserById,
	listAdminActions,
	listBoardings,
	listMarketplaceItemsByAdmin,
	listPayments,
	listPendingBoardings,
	listReservations,
	listVisitRequests,
	listReviews,
	listUsers,
	rejectBoarding,
	rejectPaymentsBulk,
	rejectPaymentByAdmin,
	setBoardingStatusByAdmin,
	setMarketplaceStatusByAdmin,
	setUsersStatusBulk,
} from "@/controllers/admin.controller.js";
import { authenticate, requireRole } from "@/middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "@/middleware/validate.js";
import {
	adminIdParamSchema,
	adminBulkConfirmPaymentsSchema,
	adminBulkDeleteReviewsSchema,
	adminBulkRejectPaymentsSchema,
	adminBulkUserStatusSchema,
	adminListActionsQuerySchema,
	adminListBoardingsQuerySchema,
	adminListMarketplaceQuerySchema,
	adminListPaymentsQuerySchema,
	adminListReservationsQuerySchema,
	adminListVisitRequestsQuerySchema,
	adminListReviewsQuerySchema,
	adminRejectPaymentSchema,
	adminSetBoardingStatusSchema,
	adminSetMarketplaceStatusSchema,
} from "@/schemas/admin.validators.js";
import { rejectBoardingSchema } from "@/schemas/boarding.validators.js";
import { adminListUsersQuerySchema } from "@/schemas/user.validators.js";

const router: Router = createRouter();

router.use(authenticate, requireRole("ADMIN"));

router.get("/users", validateQuery(adminListUsersQuerySchema), listUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id/deactivate", deactivateUser);
router.patch("/users/:id/activate", activateUser);
router.patch("/users/bulk-status", validateBody(adminBulkUserStatusSchema), setUsersStatusBulk);

router.get("/dashboard/kpis", getAdminDashboardKpis);
router.get("/actions", validateQuery(adminListActionsQuerySchema), listAdminActions);

router.get("/boardings/pending", listPendingBoardings);
router.get("/boardings", validateQuery(adminListBoardingsQuerySchema), listBoardings);
router.patch("/boardings/:id/approve", approveBoarding);
router.patch(
	"/boardings/:id/reject",
	validateBody(rejectBoardingSchema),
	rejectBoarding,
);
router.patch(
	"/boardings/:id/status",
	validateParams(adminIdParamSchema),
	validateBody(adminSetBoardingStatusSchema),
	setBoardingStatusByAdmin,
);

router.get(
	"/marketplace",
	validateQuery(adminListMarketplaceQuerySchema),
	listMarketplaceItemsByAdmin,
);
router.patch(
	"/marketplace/:id/status",
	validateParams(adminIdParamSchema),
	validateBody(adminSetMarketplaceStatusSchema),
	setMarketplaceStatusByAdmin,
);

router.get(
	"/reservations",
	validateQuery(adminListReservationsQuerySchema),
	listReservations,
);

router.get(
	"/visit-requests",
	validateQuery(adminListVisitRequestsQuerySchema),
	listVisitRequests,
);

router.get("/payments", validateQuery(adminListPaymentsQuerySchema), listPayments);
router.patch(
	"/payments/bulk/confirm",
	validateBody(adminBulkConfirmPaymentsSchema),
	confirmPaymentsBulk,
);
router.patch(
	"/payments/bulk/reject",
	validateBody(adminBulkRejectPaymentsSchema),
	rejectPaymentsBulk,
);
router.patch(
	"/payments/:id/confirm",
	validateParams(adminIdParamSchema),
	confirmPaymentByAdmin,
);
router.patch(
	"/payments/:id/reject",
	validateParams(adminIdParamSchema),
	validateBody(adminRejectPaymentSchema),
	rejectPaymentByAdmin,
);

router.get("/reviews", validateQuery(adminListReviewsQuerySchema), listReviews);
router.delete("/reviews/bulk", validateBody(adminBulkDeleteReviewsSchema), deleteReviewsBulk);
router.delete(
	"/reviews/:id",
	validateParams(adminIdParamSchema),
	deleteReviewByAdmin,
);

export default router;
