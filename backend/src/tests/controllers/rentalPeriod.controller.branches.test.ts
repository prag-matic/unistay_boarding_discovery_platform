import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRentalPeriods } from "@/controllers/rentalPeriod.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { RentalPeriod, Reservation } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("rentalPeriod.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getRentalPeriods requires authentication", async () => {
		const next = vi.fn();

		await getRentalPeriods(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getRentalPeriods sends periods for authorized student", async () => {
		vi.mocked(Reservation.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439901"),
				studentId: makeObjectId("507f1f77bcf86cd799439011"),
				boardingId: { ownerId: makeObjectId("507f1f77bcf86cd799439099") },
			} as Record<string, unknown>) as never,
		);
		vi.mocked(RentalPeriod.find).mockReturnValueOnce(
			queryResult([
				{
					_id: makeObjectId("507f1f77bcf86cd799439902"),
					reservationId: makeObjectId("507f1f77bcf86cd799439901"),
					payments: [],
				} as Record<string, unknown>,
			]) as never,
		);

		await getRentalPeriods(
			makeReq({ params: { resId: "507f1f77bcf86cd799439901" } as never }),
			makeRes(),
			vi.fn() as NextFunction,
		);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ rentalPeriods: expect.any(Array) }),
		);
	});
});
