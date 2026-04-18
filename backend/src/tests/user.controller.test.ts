import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
	user: { findUnique: vi.fn(), update: vi.fn() },
};

vi.mock("bcryptjs", () => ({
	default: { hash: vi.fn().mockResolvedValue("newHash"), compare: vi.fn() },
}));
vi.mock("@/lib/cloudinary.js", () => ({ uploadProfileImage: vi.fn() }));

import bcrypt from "bcryptjs";
import {
	changePassword,
	getMe,
	updateMe,
	uploadProfileImageHandler,
} from "@/controllers/user.controller.js";
import {
	InvalidCredentialsError,
	UnauthorizedError,
	UserNotFoundError,
} from "@/errors/AppError.js";
import { uploadProfileImage } from "@/lib/cloudinary.js";

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		user: { userId: "u1" },
		file: undefined,
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
	passwordHash: "hash",
	role: "STUDENT",
	isActive: true,
};

beforeEach(() => vi.clearAllMocks());

// ── getMe ─────────────────────────────────────────────────────────────────────
describe("getMe", () => {
	it("returns sanitized user", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		const res = mockRes();
		await getMe(mockReq(), res, next);
		expect(res.json).toHaveBeenCalled();
		const data = res.json.mock.calls[0][0];
		expect(data.data.passwordHash).toBeUndefined();
	});

	it("throws UnauthorizedError when no req.user", async () => {
		await getMe(mockReq({ user: undefined }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
	});

	it("throws UserNotFoundError when user not in DB", async () => {
		db.user.findUnique.mockResolvedValue(null);
		await getMe(mockReq(), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UserNotFoundError));
	});
});

// ── updateMe ──────────────────────────────────────────────────────────────────
describe("updateMe", () => {
	it("updates user and returns sanitized data", async () => {
		db.user.update.mockResolvedValue({ ...fakeUser, firstName: "Z" });
		const res = mockRes();
		await updateMe(mockReq({ body: { firstName: "Z" } }), res, next);
		expect(db.user.update).toHaveBeenCalledOnce();
		expect(res.json).toHaveBeenCalled();
	});

	it("throws UnauthorizedError when no req.user", async () => {
		await updateMe(mockReq({ user: undefined }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
	});
});

// ── changePassword ────────────────────────────────────────────────────────────
describe("changePassword", () => {
	it("changes password on valid current password", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		(bcrypt.compare as any).mockResolvedValue(true);
		db.user.update.mockResolvedValue({});
		const res = mockRes();
		await changePassword(
			mockReq({ body: { currentPassword: "old", newPassword: "NewPass1" } }),
			res,
			next,
		);
		expect(db.user.update).toHaveBeenCalledOnce();
		expect(res.json).toHaveBeenCalled();
	});

	it("throws UnauthorizedError when no req.user", async () => {
		await changePassword(mockReq({ user: undefined }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
	});

	it("throws UserNotFoundError when user not in DB", async () => {
		db.user.findUnique.mockResolvedValue(null);
		await changePassword(
			mockReq({ body: { currentPassword: "x", newPassword: "y" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(UserNotFoundError));
	});

	it("throws InvalidCredentialsError for wrong current password", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		(bcrypt.compare as any).mockResolvedValue(false);
		await changePassword(
			mockReq({ body: { currentPassword: "wrong", newPassword: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(InvalidCredentialsError));
	});
});

// ── uploadProfileImageHandler ─────────────────────────────────────────────────
describe("uploadProfileImageHandler", () => {
	it("uploads image and updates user", async () => {
		(uploadProfileImage as any).mockResolvedValue("https://cdn/img.jpg");
		db.user.update.mockResolvedValue({
			...fakeUser,
			profileImageUrl: "https://cdn/img.jpg",
		});
		const fakeFile = {
			buffer: Buffer.from("x"),
			mimetype: "image/jpeg",
		} as any;
		const res = mockRes();
		await uploadProfileImageHandler(mockReq({ file: fakeFile }), res, next);
		expect(uploadProfileImage).toHaveBeenCalledOnce();
		expect(res.json).toHaveBeenCalled();
	});

	it("throws UnauthorizedError when no req.user", async () => {
		await uploadProfileImageHandler(
			mockReq({ user: undefined }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
	});

	it("throws ValidationError when no file provided", async () => {
		const { ValidationError } = await import("@/errors/AppError.js");
		await uploadProfileImageHandler(
			mockReq({ file: undefined }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
	});
});
