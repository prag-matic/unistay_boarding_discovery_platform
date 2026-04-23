import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	serveChangePasswordPage,
	serveForgotPasswordPage,
	serveResetPasswordLandingPage,
	verifyEmail,
} from "@/controllers/auth.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { EmailVerificationToken, PasswordResetToken } from "@/models/index.js";
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

	it("verifyEmail renders HTML success page for browsers", async () => {
		const res = makeRes();
		vi.mocked(EmailVerificationToken.findOne).mockResolvedValueOnce(
			{
				_id: makeObjectId("507f1f77bcf86cd799439202"),
				userId: makeObjectId("507f1f77bcf86cd799439012"),
				expiresAt: new Date(Date.now() + 60_000),
			} as never,
		);

		await verifyEmail(
			makeReq({
				query: { token: "ok-token" } as never,
				headers: { accept: "text/html" },
			}),
			res,
			vi.fn() as NextFunction,
		);

		expect(res.send).toHaveBeenCalledTimes(1);
		expect(String(vi.mocked(res.send).mock.calls[0]?.[0])).toContain("Email Verified Successfully");
		expect(sendSuccess).not.toHaveBeenCalled();
	});

	it("verifyEmail renders HTML failure page for missing token", async () => {
		const res = makeRes();

		await verifyEmail(
			makeReq({
				query: {} as never,
				headers: { accept: "text/html" },
			}),
			res,
			vi.fn() as NextFunction,
		);

		expect(res.send).toHaveBeenCalledTimes(1);
		expect(String(vi.mocked(res.send).mock.calls[0]?.[0])).toContain("Verification Failed");
		expect(sendSuccess).not.toHaveBeenCalled();
	});

	it("serveForgotPasswordPage renders the forgot password ui", async () => {
		const res = makeRes();

		await serveForgotPasswordPage(makeReq(), res, vi.fn() as NextFunction);

		expect(res.send).toHaveBeenCalledTimes(1);
		expect(String(vi.mocked(res.send).mock.calls[0]?.[0])).toContain("Forgot Password?");
	});

	it("serveResetPasswordLandingPage redirects valid tokens to the change password ui", async () => {
		const res = makeRes();
		vi.mocked(PasswordResetToken.findOne).mockResolvedValueOnce(
			{
				_id: makeObjectId("507f1f77bcf86cd799439203"),
				userId: makeObjectId("507f1f77bcf86cd799439013"),
				expiresAt: new Date(Date.now() + 60_000),
				used: false,
			} as never,
		);

		await serveResetPasswordLandingPage(
			makeReq({ query: { token: "ok-reset-token" } as never }),
			res,
			vi.fn() as NextFunction,
		);

		expect(res.redirect).toHaveBeenCalledWith(302, "/change-password?token=ok-reset-token");
		expect(res.send).not.toHaveBeenCalled();
	});

	it("serveChangePasswordPage renders the change password ui for valid tokens", async () => {
		const res = makeRes();
		vi.mocked(PasswordResetToken.findOne).mockResolvedValueOnce(
			{
				_id: makeObjectId("507f1f77bcf86cd799439204"),
				userId: makeObjectId("507f1f77bcf86cd799439014"),
				expiresAt: new Date(Date.now() + 60_000),
				used: false,
			} as never,
		);

		await serveChangePasswordPage(
			makeReq({ query: { token: "ok-change-token" } as never }),
			res,
			vi.fn() as NextFunction,
		);

		expect(res.send).toHaveBeenCalledTimes(1);
		expect(String(vi.mocked(res.send).mock.calls[0]?.[0])).toContain("Set a New Password");
	});
});
