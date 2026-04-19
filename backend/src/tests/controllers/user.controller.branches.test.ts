import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "@/controllers/user.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { User } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("user.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getMe requires authentication", async () => {
		const next = vi.fn();

		await getMe(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getMe sends sanitized user for authenticated user", async () => {
		vi.mocked(User.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439011"),
				email: "user@example.com",
				firstName: "Test",
				lastName: "User",
				passwordHash: "hash",
			} as Record<string, unknown>) as never,
		);

		await getMe(makeReq(), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ id: expect.any(String) }),
		);
	});
});
