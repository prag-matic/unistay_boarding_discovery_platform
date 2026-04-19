import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMarketplaceItem,
	getMarketplaceItemById,
	updateMarketplaceItem,
} from "@/controllers/marketplace.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { MarketplaceItem } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("marketplace.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getMarketplaceItemById forwards not found when item missing", async () => {
		vi.mocked(MarketplaceItem.findById).mockReturnValueOnce(queryResult(null) as never);
		const next = vi.fn();

		await getMarketplaceItemById(
			makeReq({ params: { id: "507f1f77bcf86cd799439011" } as never }),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("createMarketplaceItem sends created response", async () => {
		vi.mocked(MarketplaceItem.create).mockResolvedValueOnce(
			{ _id: makeObjectId("507f1f77bcf86cd799439050") } as never,
		);
		vi.mocked(MarketplaceItem.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439050"),
				sellerId: makeObjectId("507f1f77bcf86cd799439011"),
				status: "ACTIVE",
				images: [],
			}) as never,
		);

		await createMarketplaceItem(
			makeReq({
				body: {
					title: "Desk",
					description: "Wooden desk",
					adType: "SELL",
					price: 2000,
					category: "FURNITURE",
					city: "Malabe",
					district: "Colombo",
				} as never,
			}),
			makeRes(),
			vi.fn() as NextFunction,
		);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ item: expect.any(Object) }),
			"Marketplace item created successfully",
			201,
		);
	});

	it("updateMarketplaceItem rejects editing another user's listing", async () => {
		vi.mocked(MarketplaceItem.findById).mockResolvedValueOnce(
			{
				_id: makeObjectId("507f1f77bcf86cd799439050"),
				sellerId: makeObjectId("507f1f77bcf86cd799439099"),
				isDeleted: false,
				adType: "SELL",
				price: 2000,
			} as never,
		);
		const next = vi.fn();

		await updateMarketplaceItem(
			makeReq({ params: { id: "507f1f77bcf86cd799439050" } as never, body: { title: "Updated" } as never }),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});
});
