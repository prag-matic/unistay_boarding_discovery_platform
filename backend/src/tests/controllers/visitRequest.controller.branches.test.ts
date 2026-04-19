import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	approveVisitRequest,
	cancelVisitRequest,
	createVisitRequest,
	getMyBoardingVisitRequests,
	getMyVisitRequests,
} from "@/controllers/visitRequest.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding, VisitRequest } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("visitRequest.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createVisitRequest requires authentication", async () => {
		const next = vi.fn();

		await createVisitRequest(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("createVisitRequest rejects end before start", async () => {
		const next = vi.fn();

		await createVisitRequest(
			makeReq({
				body: {
					boardingId: "507f1f77bcf86cd799439090",
					requestedStartAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
					requestedEndAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				} as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("createVisitRequest rejects when pending request exists", async () => {
		vi.mocked(Boarding.findById).mockResolvedValueOnce(
			{
				_id: makeObjectId("507f1f77bcf86cd799439090"),
				isDeleted: false,
				status: "ACTIVE",
			} as never,
		);
		vi.mocked(VisitRequest.findOne).mockResolvedValueOnce(
			{ _id: makeObjectId("507f1f77bcf86cd799439971") } as never,
		);
		const next = vi.fn();

		await createVisitRequest(
			makeReq({
				body: {
					boardingId: "507f1f77bcf86cd799439090",
					requestedStartAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
					requestedEndAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
				} as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getMyBoardingVisitRequests returns empty for owner with no boardings", async () => {
		vi.mocked(Boarding.find).mockReturnValueOnce(queryResult([]) as never);
		await getMyBoardingVisitRequests(makeReq(), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ visitRequests: [] }),
		);
	});

	it("approveVisitRequest rejects non-pending status", async () => {
		vi.mocked(VisitRequest.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439972"),
				status: "APPROVED",
				expiresAt: new Date(Date.now() + 60_000),
				boardingId: { ownerId: makeObjectId("507f1f77bcf86cd799439011") },
			} as Record<string, unknown>) as never,
		);
		const next = vi.fn();

		await approveVisitRequest(
			makeReq({ params: { id: "507f1f77bcf86cd799439972" } as never }),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("cancelVisitRequest rejects when request belongs to another student", async () => {
		vi.mocked(VisitRequest.findById).mockResolvedValueOnce(
			{
				_id: makeObjectId("507f1f77bcf86cd799439973"),
				studentId: makeObjectId("507f1f77bcf86cd799439099"),
				status: "PENDING",
			} as never,
		);
		const next = vi.fn();

		await cancelVisitRequest(
			makeReq({ params: { id: "507f1f77bcf86cd799439973" } as never }),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getMyVisitRequests sends visit requests", async () => {
		vi.mocked(VisitRequest.find).mockReturnValueOnce(
			queryResult([
				{
					_id: makeObjectId("507f1f77bcf86cd799439801"),
					studentId: makeObjectId("507f1f77bcf86cd799439011"),
					boardingId: makeObjectId("507f1f77bcf86cd799439090"),
				} as Record<string, unknown>,
			]) as never,
		);

		await getMyVisitRequests(makeReq(), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ visitRequests: expect.any(Array) }),
		);
	});
});
