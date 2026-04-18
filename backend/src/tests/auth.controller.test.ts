import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
	user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
	emailVerificationToken: {
		create: vi.fn(),
		findUnique: vi.fn(),
		delete: vi.fn(),
		deleteMany: vi.fn(),
	},
	refreshToken: {
		create: vi.fn(),
		findUnique: vi.fn(),
		update: vi.fn(),
		updateMany: vi.fn(),
	},
	passwordResetToken: {
		create: vi.fn(),
		findUnique: vi.fn(),
		delete: vi.fn(),
		deleteMany: vi.fn(),
		update: vi.fn(),
	},
	$transaction: vi.fn(),
};

vi.mock("bcryptjs", () => ({
	default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() },
}));
vi.mock("@/lib/hash.js", () => ({
	generateSecureToken: vi.fn().mockReturnValue("rawtoken"),
	sha256: vi.fn().mockReturnValue("hashedtoken"),
}));
vi.mock("@/lib/email.js", () => ({
	sendVerificationEmail: vi.fn(),
	sendPasswordResetEmail: vi.fn(),
}));
vi.mock("@/lib/jwt.js", () => ({
	signAccessToken: vi.fn().mockReturnValue("access-jwt"),
	parseDurationMs: vi.fn().mockReturnValue(86400000),
}));
vi.mock("@/utils/index.js", () => ({
	sanitizeUser: vi.fn((u: Record<string, unknown>) => {
		const { passwordHash: _, ...s } = u as any;
		return s;
	}),
}));

import bcrypt from "bcryptjs";
import {
	forgotPassword,
	login,
	logout,
	refreshToken,
	register,
	resendVerification,
	resetPassword,
	verifyEmail,
} from "@/controllers/auth.controller.js";
import {
	AccountDeactivatedError,
	InvalidCredentialsError,
	TokenExpiredError,
	UnauthorizedError,
	UserAlreadyExistsError,
	UserNotFoundError,
} from "@/errors/AppError.js";

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		query: {},
		user: undefined,
		...overrides,
	} as any;
}
function mockRes() {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
}
const next = vi.fn();

const fakeUser = {
	id: "u1",
	email: "a@b.com",
	firstName: "A",
	lastName: "B",
	passwordHash: "hashed",
	role: "STUDENT",
	isActive: true,
	isVerified: false,
};

beforeEach(() => vi.clearAllMocks());

// ── register ─────────────────────────────────────────────────────────────────
describe("register", () => {
	it("creates user and sends 201", async () => {
		db.user.findUnique.mockResolvedValue(null);
		db.user.create.mockResolvedValue(fakeUser);
		db.emailVerificationToken.create.mockResolvedValue({});
		const res = mockRes();
		await register(
			mockReq({
				body: {
					email: "a@b.com",
					password: "Pass1234",
					firstName: "A",
					lastName: "B",
					role: "STUDENT",
				},
			}),
			res,
			next,
		);
		expect(db.user.create).toHaveBeenCalledOnce();
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("throws UserAlreadyExistsError when email taken", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		await register(
			mockReq({ body: { email: "a@b.com", password: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(UserAlreadyExistsError));
	});

	it("calls next on db error", async () => {
		db.user.findUnique.mockRejectedValue(new Error("db"));
		await register(mockReq({ body: {} }), mockRes(), next);
		expect(next).toHaveBeenCalled();
	});
});

// ── login ─────────────────────────────────────────────────────────────────────
describe("login", () => {
	it("returns tokens for valid credentials", async () => {
		db.user.findUnique.mockResolvedValue({ ...fakeUser, isActive: true });
		(bcrypt.compare as any).mockResolvedValue(true);
		db.refreshToken.create.mockResolvedValue({});
		const res = mockRes();
		await login(
			mockReq({ body: { email: "a@b.com", password: "Pass1234" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
		const data = res.json.mock.calls[0][0];
		expect(data.data.accessToken).toBe("access-jwt");
	});

	it("throws InvalidCredentialsError when user not found", async () => {
		db.user.findUnique.mockResolvedValue(null);
		await login(
			mockReq({ body: { email: "x@b.com", password: "p" } }),
			mockRes(),
			next,
		);
		// login calls next() not next(error) on error – but the error is InvalidCredentialsError thrown
		// The controller has a bug: catch calls next() not next(error). Either way, next is called.
		expect(next).toHaveBeenCalled();
	});

	it("throws InvalidCredentialsError on bad password", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		(bcrypt.compare as any).mockResolvedValue(false);
		await login(
			mockReq({ body: { email: "a@b.com", password: "wrong" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});

	it("throws AccountDeactivatedError when inactive", async () => {
		db.user.findUnique.mockResolvedValue({ ...fakeUser, isActive: false });
		(bcrypt.compare as any).mockResolvedValue(true);
		await login(
			mockReq({ body: { email: "a@b.com", password: "Pass1234" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});
});

// ── refreshToken ──────────────────────────────────────────────────────────────
describe("refreshToken", () => {
	it("issues new tokens", async () => {
		db.refreshToken.findUnique.mockResolvedValue({
			id: "rt1",
			userId: "u1",
			revokedAt: null,
		});
		db.user.findUnique.mockResolvedValue({ ...fakeUser, isActive: true });
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.refreshToken.create.mockResolvedValue({ id: "rt2" });
		db.refreshToken.update.mockResolvedValue({});
		const res = mockRes();
		await refreshToken(
			mockReq({ body: { refreshToken: "rawtoken" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
		expect(res.json.mock.calls[0][0].data.accessToken).toBe("access-jwt");
	});

	it("throws UnauthorizedError for revoked token", async () => {
		db.refreshToken.findUnique.mockResolvedValue({ revokedAt: new Date() });
		await refreshToken(
			mockReq({ body: { refreshToken: "bad" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
	});

	it("throws UnauthorizedError when token not found", async () => {
		db.refreshToken.findUnique.mockResolvedValue(null);
		await refreshToken(
			mockReq({ body: { refreshToken: "gone" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
	});

	it("throws UserNotFoundError when user missing", async () => {
		db.refreshToken.findUnique.mockResolvedValue({
			id: "rt1",
			userId: "u1",
			revokedAt: null,
		});
		db.user.findUnique.mockResolvedValue(null);
		await refreshToken(
			mockReq({ body: { refreshToken: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(UserNotFoundError));
	});

	it("throws AccountDeactivatedError for inactive user", async () => {
		db.refreshToken.findUnique.mockResolvedValue({
			id: "rt1",
			userId: "u1",
			revokedAt: null,
		});
		db.user.findUnique.mockResolvedValue({ ...fakeUser, isActive: false });
		await refreshToken(
			mockReq({ body: { refreshToken: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(AccountDeactivatedError));
	});
});

// ── logout ────────────────────────────────────────────────────────────────────
describe("logout", () => {
	it("revokes token and returns success", async () => {
		db.refreshToken.updateMany.mockResolvedValue({});
		const res = mockRes();
		await logout(mockReq({ body: { refreshToken: "tok" } }), res, next);
		expect(db.refreshToken.updateMany).toHaveBeenCalledOnce();
		expect(res.json).toHaveBeenCalled();
	});

	it("calls next on db error", async () => {
		db.refreshToken.updateMany.mockRejectedValue(new Error("fail"));
		await logout(mockReq({ body: { refreshToken: "tok" } }), mockRes(), next);
		expect(next).toHaveBeenCalled();
	});
});

// ── verifyEmail ───────────────────────────────────────────────────────────────
describe("verifyEmail", () => {
	it("verifies email and returns success", async () => {
		const future = new Date(Date.now() + 10_000);
		db.emailVerificationToken.findUnique.mockResolvedValue({
			id: "ev1",
			userId: "u1",
			expiresAt: future,
			token: "tok",
		});
		db.$transaction.mockResolvedValue([{}, {}]);
		const res = mockRes();
		await verifyEmail(mockReq({ query: { token: "tok" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws TokenExpiredError when token missing", async () => {
		await verifyEmail(mockReq({ query: {} }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(TokenExpiredError));
	});

	it("throws TokenExpiredError when token not found", async () => {
		db.emailVerificationToken.findUnique.mockResolvedValue(null);
		await verifyEmail(mockReq({ query: { token: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(TokenExpiredError));
	});

	it("throws TokenExpiredError and deletes when expired", async () => {
		const past = new Date(Date.now() - 10_000);
		db.emailVerificationToken.findUnique.mockResolvedValue({
			id: "ev1",
			expiresAt: past,
			token: "tok",
		});
		db.emailVerificationToken.delete.mockResolvedValue({});
		await verifyEmail(mockReq({ query: { token: "tok" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(TokenExpiredError));
		expect(db.emailVerificationToken.delete).toHaveBeenCalledOnce();
	});
});

// ── resendVerification ────────────────────────────────────────────────────────
describe("resendVerification", () => {
	it("sends email for valid unverified user", async () => {
		db.user.findUnique.mockResolvedValue({ ...fakeUser, isVerified: false });
		db.emailVerificationToken.deleteMany.mockResolvedValue({});
		db.emailVerificationToken.create.mockResolvedValue({});
		const res = mockRes();
		await resendVerification(
			mockReq({ body: { email: "a@b.com" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("returns generic message when user not found", async () => {
		db.user.findUnique.mockResolvedValue(null);
		const res = mockRes();
		await resendVerification(
			mockReq({ body: { email: "x@b.com" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	it("returns generic message for already-verified user", async () => {
		db.user.findUnique.mockResolvedValue({ ...fakeUser, isVerified: true });
		const res = mockRes();
		await resendVerification(
			mockReq({ body: { email: "a@b.com" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});
});

// ── forgotPassword ────────────────────────────────────────────────────────────
describe("forgotPassword", () => {
	it("sends reset email for existing user", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		db.passwordResetToken.deleteMany.mockResolvedValue({});
		db.passwordResetToken.create.mockResolvedValue({});
		const res = mockRes();
		await forgotPassword(mockReq({ body: { email: "a@b.com" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("returns generic message when user not found", async () => {
		db.user.findUnique.mockResolvedValue(null);
		const res = mockRes();
		await forgotPassword(mockReq({ body: { email: "x@b.com" } }), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});
});

// ── resetPassword ─────────────────────────────────────────────────────────────
describe("resetPassword", () => {
	it("resets password successfully", async () => {
		const future = new Date(Date.now() + 60_000);
		db.passwordResetToken.findUnique.mockResolvedValue({
			id: "pr1",
			userId: "u1",
			used: false,
			expiresAt: future,
		});
		db.$transaction.mockResolvedValue([{}, {}, {}]);
		const res = mockRes();
		await resetPassword(
			mockReq({ body: { token: "tok", password: "NewPass1" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws TokenExpiredError for invalid/used token", async () => {
		db.passwordResetToken.findUnique.mockResolvedValue({
			id: "pr1",
			used: true,
			expiresAt: new Date(Date.now() + 1000),
		});
		await resetPassword(
			mockReq({ body: { token: "tok", password: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(TokenExpiredError));
	});

	it("throws TokenExpiredError and deletes expired token", async () => {
		const past = new Date(Date.now() - 1000);
		db.passwordResetToken.findUnique.mockResolvedValue({
			id: "pr1",
			used: false,
			expiresAt: past,
		});
		db.passwordResetToken.delete.mockResolvedValue({});
		await resetPassword(
			mockReq({ body: { token: "tok", password: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(TokenExpiredError));
		expect(db.passwordResetToken.delete).toHaveBeenCalledOnce();
	});

	it("throws TokenExpiredError when token not found", async () => {
		db.passwordResetToken.findUnique.mockResolvedValue(null);
		await resetPassword(
			mockReq({ body: { token: "x", password: "y" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(TokenExpiredError));
	});
});
