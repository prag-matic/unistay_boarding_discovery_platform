import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyListings } from "@/controllers/boarding.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("boarding.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getMyListings requires authentication", async () => {
		const next = vi.fn();

		await getMyListings(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getMyListings sends listings for authenticated owner", async () => {
		vi.mocked(Boarding.find).mockReturnValueOnce(
			queryResult([
				{
					_id: makeObjectId("507f1f77bcf86cd799439301"),
					slug: "listing-1",
					title: "Listing 1",
					status: "ACTIVE",
					ownerId: makeObjectId("507f1f77bcf86cd799439011"),
					isDeleted: false,
					images: [],
					amenities: [],
					rules: [],
				} as Record<string, unknown>,
			]) as never,
		);

		await getMyListings(makeReq(), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ boardings: expect.any(Array) }),
		);
	});
});
