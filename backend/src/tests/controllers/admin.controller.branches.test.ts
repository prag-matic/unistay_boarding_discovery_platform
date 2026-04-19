import type { NextFunction } from "express";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	activateUser,
	getUserById,
	listUsers,
} from "@/controllers/admin.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { User } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("admin.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("listUsers sends paginated users", async () => {
		vi.mocked(User.find).mockReturnValueOnce(
			queryResult([
				{ _id: makeObjectId(), firstName: "A", lastName: "B", email: "a@b.com" },
			]) as never,
		);
		vi.mocked(User.countDocuments).mockResolvedValueOnce(1 as never);

		const req = makeReq({ query: { page: 1, size: 10, search: "A" } as never });
		await listUsers(req, makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				users: expect.any(Array),
				pagination: expect.objectContaining({ total: 1, page: 1, size: 10 }),
			}),
		);
	});

	it("getUserById forwards error for invalid id", async () => {
		const next = vi.fn();
		const isValidSpy = vi
			.spyOn(mongoose.Types.ObjectId, "isValid")
			.mockReturnValueOnce(false);

		await getUserById(makeReq({ params: { id: "invalid-id" } as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
		isValidSpy.mockRestore();
	});

	it("activateUser forwards error when target user missing", async () => {
		vi.mocked(User.findById).mockReturnValueOnce(queryResult(null) as never);
		const next = vi.fn();

		await activateUser(makeReq(), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});
});
