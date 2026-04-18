import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
	user: {
		findUnique: vi.fn(),
		update: vi.fn(),
		findMany: vi.fn(),
		count: vi.fn(),
	},
	boarding: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
	$transaction: vi.fn(),
};

import {
	activateUser,
	approveBoarding,
	deactivateUser,
	getUserById,
	listPendingBoardings,
	listUsers,
	rejectBoarding,
} from "@/controllers/admin.controller.js";
import {
	BoardingNotFoundError,
	InvalidStateTransitionError,
	UserNotFoundError,
} from "@/errors/AppError.js";

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		query: {},
		user: { userId: "admin1", role: "ADMIN" },
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
	role: "STUDENT",
	isActive: true,
};
const fakeBoarding = {
	id: "b1",
	title: "Room",
	status: "PENDING_APPROVAL",
	isDeleted: false,
};

beforeEach(() => vi.clearAllMocks());

// ── listUsers ─────────────────────────────────────────────────────────────────
describe("listUsers", () => {
	it("returns paginated users", async () => {
		db.$transaction.mockResolvedValue([[fakeUser], 1]);
		const res = mockRes();
		await listUsers(mockReq({ query: { page: 1, size: 20 } }), res, next);
		expect(res.json).toHaveBeenCalled();
		const data = res.json.mock.calls[0][0].data;
		expect(data.pagination.total).toBe(1);
	});

	it("calls next on db error", async () => {
		db.$transaction.mockRejectedValue(new Error("db"));
		await listUsers(mockReq({ query: { page: 1, size: 20 } }), mockRes(), next);
		expect(next).toHaveBeenCalled();
	});
});

// ── getUserById ───────────────────────────────────────────────────────────────
describe("getUserById", () => {
	it("returns user by ID", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		const res = mockRes();
		await getUserById(mockReq({ params: { id: "u1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws UserNotFoundError when not found", async () => {
		db.user.findUnique.mockResolvedValue(null);
		await getUserById(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UserNotFoundError));
	});
});

// ── activateUser ──────────────────────────────────────────────────────────────
describe("activateUser", () => {
	it("activates a user", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		db.user.update.mockResolvedValue({ ...fakeUser, isActive: true });
		const res = mockRes();
		await activateUser(mockReq({ params: { id: "u1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(db.user.update.mock.calls[0][0].data.isActive).toBe(true);
	});

	it("throws UserNotFoundError when not found", async () => {
		db.user.findUnique.mockResolvedValue(null);
		await activateUser(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UserNotFoundError));
	});
});

// ── deactivateUser ────────────────────────────────────────────────────────────
describe("deactivateUser", () => {
	it("deactivates a user", async () => {
		db.user.findUnique.mockResolvedValue(fakeUser);
		db.user.update.mockResolvedValue({ ...fakeUser, isActive: false });
		const res = mockRes();
		await deactivateUser(mockReq({ params: { id: "u1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(db.user.update.mock.calls[0][0].data.isActive).toBe(false);
	});

	it("throws UserNotFoundError when not found", async () => {
		db.user.findUnique.mockResolvedValue(null);
		await deactivateUser(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UserNotFoundError));
	});
});

// ── listPendingBoardings ──────────────────────────────────────────────────────
describe("listPendingBoardings", () => {
	it("returns pending boardings", async () => {
		db.boarding.findMany.mockResolvedValue([fakeBoarding]);
		const res = mockRes();
		await listPendingBoardings(mockReq(), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(db.boarding.findMany.mock.calls[0][0].where.status).toBe(
			"PENDING_APPROVAL",
		);
	});
});

// ── approveBoarding ───────────────────────────────────────────────────────────
describe("approveBoarding", () => {
	it("approves a PENDING_APPROVAL boarding", async () => {
		db.boarding.findUnique.mockResolvedValue(fakeBoarding);
		db.boarding.update.mockResolvedValue({ ...fakeBoarding, status: "ACTIVE" });
		const res = mockRes();
		await approveBoarding(mockReq({ params: { id: "b1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(db.boarding.update.mock.calls[0][0].data.status).toBe("ACTIVE");
	});

	it("throws BoardingNotFoundError when not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await approveBoarding(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws InvalidStateTransitionError when not PENDING_APPROVAL", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "ACTIVE",
		});
		await approveBoarding(mockReq({ params: { id: "b1" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(InvalidStateTransitionError));
	});
});

// ── rejectBoarding ────────────────────────────────────────────────────────────
describe("rejectBoarding", () => {
	it("rejects a PENDING_APPROVAL boarding", async () => {
		db.boarding.findUnique.mockResolvedValue(fakeBoarding);
		db.boarding.update.mockResolvedValue({
			...fakeBoarding,
			status: "REJECTED",
		});
		const res = mockRes();
		await rejectBoarding(
			mockReq({ params: { id: "b1" }, body: { reason: "Bad listing" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
		expect(db.boarding.update.mock.calls[0][0].data.status).toBe("REJECTED");
	});

	it("throws BoardingNotFoundError when not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await rejectBoarding(
			mockReq({ params: { id: "x" }, body: { reason: "r" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws InvalidStateTransitionError when not PENDING_APPROVAL", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "ACTIVE",
		});
		await rejectBoarding(
			mockReq({ params: { id: "b1" }, body: { reason: "r" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(InvalidStateTransitionError));
	});
});
