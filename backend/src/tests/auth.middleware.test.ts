import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/errors/AppError.js";
import { signAccessToken } from "@/lib/jwt.js";
import { authenticate, requireRole } from "@/middleware/auth.js";

function req(overrides: Partial<Request> = {}): Request {
	return { headers: {}, ...overrides } as unknown as Request;
}
const res = {} as Response;

describe("authenticate", () => {
	it("passes UnauthorizedError when no auth header", () => {
		const next = vi.fn();
		authenticate(req(), res, next);
		expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
	});

	it("passes UnauthorizedError for non-Bearer scheme", () => {
		const next = vi.fn();
		authenticate(req({ headers: { authorization: "Basic abc" } }), res, next);
		expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
	});

	it("attaches user and calls next() for a valid token", () => {
		const token = signAccessToken({
			userId: "u1",
			role: "STUDENT",
			email: "a@b.com",
		});
		const r = req({ headers: { authorization: `Bearer ${token}` } });
		const next = vi.fn();
		authenticate(r, res, next);
		expect(next).toHaveBeenCalledWith();
		expect((r as any).user.userId).toBe("u1");
	});

	it("passes UnauthorizedError for a tampered token", () => {
		const token = signAccessToken({
			userId: "u1",
			role: "OWNER",
			email: "x@y.com",
		});
		const next = vi.fn();
		authenticate(
			req({ headers: { authorization: `Bearer ${token}tampered` } }),
			res,
			next,
		);
		expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
	});
});

describe("requireRole", () => {
	it("passes UnauthorizedError when req.user is missing", () => {
		const next = vi.fn();
		requireRole("ADMIN")(req(), res, next);
		expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
	});

	it("passes ForbiddenError when role is not allowed", () => {
		const r = req();
		(r as any).user = { userId: "u1", role: "STUDENT", email: "a@b.com" };
		const next = vi.fn();
		requireRole("ADMIN", "OWNER")(r, res, next);
		expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
	});

	it("calls next() when role is allowed", () => {
		const r = req();
		(r as any).user = { userId: "u1", role: "OWNER", email: "o@b.com" };
		const next = vi.fn();
		requireRole("ADMIN", "OWNER")(r, res, next);
		expect(next).toHaveBeenCalledWith();
	});
});
