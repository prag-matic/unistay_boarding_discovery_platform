import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logPayment } from "@/controllers/payment.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { Payment } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("payment.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("logPayment requires authentication", async () => {
		const next = vi.fn();

		await logPayment(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getMyPayments sends payments for authenticated student", async () => {
		vi.mocked(Payment.find).mockReturnValueOnce(
			queryResult([
				{
					_id: makeObjectId("507f1f77bcf86cd799439401"),
					reservationId: {
						boardingId: { title: "Boarding A" },
					},
					studentId: makeObjectId("507f1f77bcf86cd799439011"),
					rentalPeriodId: makeObjectId("507f1f77bcf86cd799439402"),
				} as Record<string, unknown>,
			]) as never,
		);

		const { getMyPayments } = await import("@/controllers/payment.controller.js");
		await getMyPayments(makeReq(), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ payments: expect.any(Array) }),
		);
	});
});
