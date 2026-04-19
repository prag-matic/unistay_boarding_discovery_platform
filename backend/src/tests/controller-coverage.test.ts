import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

const CONTROLLERS = {
	"@/controllers/admin.controller.js": [
		"listUsers",
		"getUserById",
		"activateUser",
		"deactivateUser",
		"listBoardings",
		"setBoardingStatusByAdmin",
		"listPendingBoardings",
		"approveBoarding",
		"rejectBoarding",
		"getAdminDashboardKpis",
		"listReservations",
		"listVisitRequests",
		"listPayments",
		"confirmPaymentByAdmin",
		"rejectPaymentByAdmin",
		"listReviews",
		"deleteReviewByAdmin",
		"listMarketplaceItemsByAdmin",
		"setMarketplaceStatusByAdmin",
		"setUsersStatusBulk",
		"confirmPaymentsBulk",
		"rejectPaymentsBulk",
		"deleteReviewsBulk",
		"listAdminActions",
	],
	"@/controllers/auth.controller.js": [
		"register",
		"login",
		"refreshToken",
		"logout",
		"verifyEmail",
		"resendVerification",
		"forgotPassword",
		"resetPassword",
	],
	"@/controllers/boarding.controller.js": [
		"getBoardingLifecycleSpec",
		"searchBoardings",
		"getBoardingBySlug",
		"getMyListings",
		"createBoarding",
		"updateBoarding",
		"submitBoarding",
		"deactivateBoarding",
		"activateBoarding",
		"archiveBoarding",
		"restoreBoarding",
		"getBoardingStatusHistory",
		"uploadImages",
		"deleteImage",
	],
	"@/controllers/chat.controller.js": [
		"getChatRooms",
		"getChatRoom",
		"createChatRoom",
		"getChatHistory",
		"markMessageAsRead",
		"markAllAsRead",
		"deleteMessage",
		"searchUsers",
	],
	"@/controllers/issue.controller.js": [
		"createIssue",
		"getIssues",
		"getIssue",
		"updateIssue",
		"deleteIssue",
		"analyzeMessage",
	],
	"@/controllers/marketplace.controller.js": [
		"searchMarketplaceItems",
		"getMarketplaceItemById",
		"getMyMarketplaceItems",
		"createMarketplaceItem",
		"updateMarketplaceItem",
		"deleteMarketplaceItem",
		"uploadMarketplaceImages",
		"deleteMarketplaceImage",
		"reportMarketplaceItem",
		"getOpenMarketplaceReports",
		"takedownMarketplaceItem",
		"reinstateMarketplaceItem",
		"resolveMarketplaceReport",
	],
	"@/controllers/payment.controller.js": [
		"logPayment",
		"getMyPayments",
		"getMyBoardingPayments",
		"confirmPayment",
		"uploadProofImage",
		"rejectPayment",
	],
	"@/controllers/rentalPeriod.controller.js": ["getRentalPeriods"],
	"@/controllers/reservation.controller.js": [
		"createReservation",
		"getMyRequests",
		"getMyBoardingRequests",
		"getReservationById",
		"approveReservation",
		"rejectReservation",
		"cancelReservation",
		"completeReservation",
	],
	"@/controllers/review.controller.js": [
		"createReview",
		"getReview",
		"getReviewsByBoarding",
		"getReviewStats",
		"getMyReviews",
		"getMyBoardingReviews",
		"updateReview",
		"deleteReview",
		"addReviewReaction",
		"createReviewComment",
		"updateReviewComment",
		"deleteReviewComment",
		"addReviewCommentReaction",
	],
	"@/controllers/savedBoarding.controller.js": [
		"saveBoarding",
		"unsaveBoarding",
		"getSavedBoardings",
	],
	"@/controllers/user.controller.js": [
		"getMe",
		"updateMe",
		"changePassword",
		"uploadProfileImageHandler",
	],
	"@/controllers/visitRequest.controller.js": [
		"createVisitRequest",
		"getVisitRequestAvailability",
		"getMyVisitRequests",
		"getMyBoardingVisitRequests",
		"getVisitRequestById",
		"approveVisitRequest",
		"rejectVisitRequest",
		"cancelVisitRequest",
	],
} as const;

function buildReq(): Request {
	return {
		body: {
			email: "test@example.com",
			password: "Password@123",
			refreshToken: "rtoken",
			title: "Sample",
			description: "Sample",
			monthlyRent: 1000,
			maxOccupants: 2,
			currentOccupants: 1,
		},
		params: {
			id: "507f1f77bcf86cd799439011",
			slug: "sample-boarding",
			boardingId: "507f1f77bcf86cd799439011",
			imageId: "507f1f77bcf86cd799439011",
			roomId: "507f1f77bcf86cd799439011",
			messageId: "507f1f77bcf86cd799439011",
			reportId: "507f1f77bcf86cd799439011",
			resId: "507f1f77bcf86cd799439011",
		},
		query: {
			page: 1,
			size: 10,
			token: "verify-token",
		},
		headers: {
			authorization: "Bearer token",
			"user-agent": "vitest",
			"x-forwarded-for": "127.0.0.1",
		},
		files: [],
		file: { path: "proof.jpg" },
		ip: "127.0.0.1",
		user: {
			userId: "507f1f77bcf86cd799439011",
			role: "ADMIN",
			email: "test@example.com",
		},
	} as unknown as Request;
}

function buildRes(): Response {
	const json = vi.fn();
	const status = vi.fn(() => ({ json }));
	return {
		status,
		json,
	} as unknown as Response;
}

describe("backend controllers coverage", () => {
	it("exports every expected controller handler", async () => {
		for (const [modulePath, handlerNames] of Object.entries(CONTROLLERS)) {
			const controller = await import(modulePath);

			for (const handlerName of handlerNames) {
				expect(controller[handlerName], `${modulePath}::${handlerName}`).toBeTypeOf(
					"function",
				);
			}
		}
	});

	it("invokes every controller handler with baseline request/response", async () => {
		for (const [modulePath, handlerNames] of Object.entries(CONTROLLERS)) {
			const controller = await import(modulePath);

			for (const handlerName of handlerNames) {
				const req = buildReq();
				const res = buildRes();
				const next = vi.fn();

				await expect(
					(controller[handlerName] as (
						req: Request,
						res: Response,
						next: NextFunction,
					) => Promise<void>)(req, res, next),
				).resolves.toBeUndefined();

				expect(
					(res.status as unknown as ReturnType<typeof vi.fn>).mock.calls.length +
						next.mock.calls.length,
					`${modulePath}::${handlerName} did not respond or forward error`,
				).toBeGreaterThan(0);
			}
		}
	}, 30000);
});
