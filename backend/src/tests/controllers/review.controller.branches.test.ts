import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyReviews, getReview } from "@/controllers/review.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { reviewService } from "@/services/review.service.js";
import { makeReq, makeRes } from "@/tests/helpers/controller-test-utils.js";

describe("review.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getMyReviews requires user id", async () => {
		const next = vi.fn();

		await getMyReviews(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getReview sends review for valid id", async () => {
		vi.mocked(reviewService.getReviewById).mockResolvedValueOnce(
			{ id: "507f1f77bcf86cd799439601", rating: 5 } as never,
		);

		await getReview(
			makeReq({ params: { id: "507f1f77bcf86cd799439601" } as never }),
			makeRes(),
			vi.fn() as NextFunction,
		);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ id: "507f1f77bcf86cd799439601" }),
		);
	});
});
