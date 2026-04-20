import type { Router } from "express";
import { describe, expect, it } from "vitest";

type RouteSignature = `${Uppercase<string>} ${string}`;

function collectRoutes(router: Router): RouteSignature[] {
	const signatures: RouteSignature[] = [];
	const stack = (router as unknown as { stack?: Array<Record<string, unknown>> }).stack ?? [];

	for (const layer of stack) {
		const route = layer.route as
			| {
				path?: string;
				methods?: Record<string, boolean>;
			}
			| undefined;

		if (!route?.path || !route.methods) continue;

		for (const method of Object.keys(route.methods)) {
			signatures.push(`${method.toUpperCase()} ${route.path}` as RouteSignature);
		}
	}

	return signatures;
}

const ROUTE_EXPECTATIONS: Array<{ modulePath: string; expected: RouteSignature[] }> = [
	{
		modulePath: "@/routes/auth.routes.js",
		expected: [
			"POST /register",
			"POST /login",
			"POST /refresh",
			"POST /logout",
			"GET /verify-email",
			"POST /resend-verification",
			"POST /forgot-password",
			"POST /reset-password",
		],
	},
	{
		modulePath: "@/routes/user.routes.js",
		expected: ["GET /me", "PUT /me", "PUT /me/password", "PUT /me/profile-image"],
	},
	{
		modulePath: "@/routes/admin.routes.js",
		expected: [
			"GET /users",
			"GET /users/:id",
			"PATCH /users/:id/deactivate",
			"PATCH /users/:id/activate",
			"PATCH /users/bulk-status",
			"GET /dashboard/kpis",
			"GET /actions",
			"GET /boardings/pending",
			"GET /boardings",
			"PATCH /boardings/:id/approve",
			"PATCH /boardings/:id/reject",
			"PATCH /boardings/:id/status",
			"GET /marketplace",
			"PATCH /marketplace/:id/status",
			"GET /reservations",
			"GET /visit-requests",
			"GET /payments",
			"PATCH /payments/bulk/confirm",
			"PATCH /payments/bulk/reject",
			"PATCH /payments/:id/confirm",
			"PATCH /payments/:id/reject",
			"GET /reviews",
			"DELETE /reviews/bulk",
			"DELETE /reviews/:id",
		],
	},
	{
		modulePath: "@/routes/boarding.routes.js",
		expected: [
			"GET /",
			"GET /lifecycle/spec",
			"GET /my-listings",
			"POST /",
			"PUT /:id",
			"DELETE /:id",
			"PATCH /:id/submit",
			"PATCH /:id/deactivate",
			"PATCH /:id/activate",
			"PATCH /:id/archive",
			"PATCH /:id/restore",
			"GET /:id/status-history",
			"POST /:id/images",
			"DELETE /:id/images/:imageId",
			"GET /:slug",
		],
	},
	{
		modulePath: "@/routes/reservation.routes.js",
		expected: [
			"POST /",
			"GET /my-requests",
			"GET /my-boardings",
			"GET /:id",
			"PATCH /:id/approve",
			"PATCH /:id/reject",
			"PATCH /:id/cancel",
			"PATCH /:id/complete",
			"GET /:resId/rental-periods",
		],
	},
	{
		modulePath: "@/routes/savedBoarding.routes.js",
		expected: ["GET /", "POST /:boardingId", "DELETE /:boardingId"],
	},
	{
		modulePath: "@/routes/visitRequest.routes.js",
		expected: [
			"POST /",
			"GET /my-requests",
			"GET /my-boardings",
			"GET /availability",
			"GET /:id",
			"PATCH /:id/approve",
			"PATCH /:id/reject",
			"PATCH /:id/cancel",
		],
	},
	{
		modulePath: "@/routes/payment.routes.js",
		expected: [
			"POST /",
			"PUT /proof-image",
			"GET /my-payments",
			"GET /my-boardings",
			"PATCH /:id/confirm",
			"PATCH /:id/reject",
		],
	},
	{
		modulePath: "@/routes/review.routes.js",
		expected: [
			"POST /",
			"GET /my",
			"GET /my-boardings",
			"GET /boarding/:boardingId",
			"GET /boarding/:boardingId/stats",
			"GET /:id",
			"PUT /:id",
			"DELETE /:id",
			"POST /:id/reactions",
			"POST /:id/comments",
			"PUT /comments/:id",
			"DELETE /comments/:id",
			"POST /comments/:id/reactions",
		],
	},
	{
		modulePath: "@/routes/chat.routes.js",
		expected: [
			"GET /rooms",
			"POST /rooms",
			"GET /rooms/:roomId",
			"GET /rooms/:roomId/messages",
			"PUT /rooms/:roomId/messages/:messageId/read",
			"PUT /rooms/:roomId/read-all",
			"DELETE /rooms/:roomId/messages/:messageId",
			"GET /users",
		],
	},
	{
		modulePath: "@/routes/issue.routes.js",
		expected: [
			"POST /",
			"GET /",
			"GET /:id",
			"PUT /:id",
			"DELETE /:id",
			"POST /analyze",
		],
	},
	{
		modulePath: "@/routes/marketplace.routes.js",
		expected: [
			"GET /",
			"GET /my-ads",
			"POST /",
			"PUT /:id",
			"DELETE /:id",
			"POST /:id/images",
			"DELETE /:id/images/:imageId",
			"POST /:id/report",
			"GET /reports/open",
			"PATCH /:id/takedown",
			"PATCH /:id/reinstate",
			"PATCH /reports/:reportId/resolve",
			"GET /:id",
		],
	},
];

describe("route contracts", () => {
	it("registers expected routes for each module", async () => {
		for (const routeConfig of ROUTE_EXPECTATIONS) {
			const routerModule = await import(routeConfig.modulePath);
			const router = routerModule.default as Router;
			const actual = collectRoutes(router);

			for (const signature of routeConfig.expected) {
				expect(actual, `${routeConfig.modulePath} missing ${signature}`).toContain(signature);
			}
		}
	});

	it("mount router includes all top-level api route prefixes", async () => {
		const rootModule = await import("@/routes/index.js");
		const root = rootModule.default as Router;
		const stack = (root as unknown as { stack?: Array<Record<string, unknown>> }).stack ?? [];

		const routeLayers = stack.filter((layer) => "route" in layer && layer.route);
		const mountedRouters = stack.filter(
			(layer) => !("route" in layer && layer.route),
		);

		expect(routeLayers.length).toBe(1);
		expect((routeLayers[0].route as { path?: string }).path).toBe("/health");
		expect(mountedRouters.length).toBe(13);
	});
});
