import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveBoarding } from "@/controllers/savedBoarding.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { SavedBoarding } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("savedBoarding.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("saveBoarding requires authentication", async () => {
		const next = vi.fn();

		await saveBoarding(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getSavedBoardings sends saved list", async () => {
		vi.mocked(SavedBoarding.find).mockReturnValueOnce(
			queryResult([
				{
					_id: makeObjectId("507f1f77bcf86cd799439701"),
					boardingId: {
						_id: makeObjectId("507f1f77bcf86cd799439090"),
						title: "Saved boarding",
						ownerId: makeObjectId("507f1f77bcf86cd799439011"),
						images: [],
						amenities: [],
						rules: [],
					},
				} as Record<string, unknown>,
			]) as never,
		);

		const { getSavedBoardings } = await import("@/controllers/savedBoarding.controller.js");
		await getSavedBoardings(makeReq(), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ saved: expect.any(Array) }),
		);
	});
});
