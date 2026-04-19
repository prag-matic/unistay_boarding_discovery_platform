import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyEmail } from "@/controllers/auth.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { EmailVerificationToken } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes } from "@/tests/helpers/controller-test-utils.js";

describe("auth.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("verifyEmail forwards when token is missing", async () => {
		const next = vi.fn();

		await verifyEmail(makeReq({ query: {} as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("verifyEmail sends success for valid token", async () => {
		vi.mocked(EmailVerificationToken.findOne).mockResolvedValueOnce(
			{
				_id: makeObjectId("507f1f77bcf86cd799439201"),
				userId: makeObjectId("507f1f77bcf86cd799439011"),
				expiresAt: new Date(Date.now() + 60_000),
			} as never,
		);

		await verifyEmail(makeReq({ query: { token: "ok-token" } as never }), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			null,
			"Email Verified Successfully",
		);
	});
});
