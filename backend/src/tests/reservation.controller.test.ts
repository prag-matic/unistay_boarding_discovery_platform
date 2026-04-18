import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
	reservation: {
		findUnique: vi.fn(),
		findFirst: vi.fn(),
		findMany: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	boarding: { findUnique: vi.fn(), update: vi.fn() },
	rentalPeriod: { createMany: vi.fn() },
	$transaction: vi.fn(),
};

import {
	approveReservation,
	cancelReservation,
	completeReservation,
	createReservation,
	getMyBoardingRequests,
	getMyRequests,
	getReservationById,
	rejectReservation,
} from "@/controllers/reservation.controller.js";
import {
	BadRequestError,
	BoardingNotFoundError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "@/errors/AppError.js";

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		user: { userId: "student1", role: "STUDENT" },
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

const tomorrow = new Date(Date.now() + 2 * 86_400_000)
	.toISOString()
	.split("T")[0];
const futureDate = new Date(Date.now() + 2 * 86_400_000);
futureDate.setUTCHours(0, 0, 0, 0);

const activeBoarding = {
	id: "b1",
	ownerId: "owner1",
	status: "ACTIVE",
	isDeleted: false,
	currentOccupants: 0,
	maxOccupants: 2,
	monthlyRent: 10000,
	title: "T",
	slug: "s",
	city: "C",
	district: "D",
	address: "A",
	boardingType: "HOSTEL",
	genderPref: "ANY",
	nearUniversity: null,
};

const fakeReservation = {
	id: "res1",
	studentId: "student1",
	boardingId: "b1",
	status: "PENDING",
	moveInDate: futureDate,
	boarding: activeBoarding,
	rentSnapshot: 10000,
	expiresAt: new Date(Date.now() + 72 * 3600_000),
};

beforeEach(() => vi.clearAllMocks());

// ── createReservation ─────────────────────────────────────────────────────────
describe("createReservation", () => {
	it("creates reservation and returns 201", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.boarding.findUnique.mockResolvedValue(activeBoarding);
		db.reservation.findFirst.mockResolvedValue(null);
		db.reservation.create.mockResolvedValue(fakeReservation);
		const res = mockRes();
		await createReservation(
			mockReq({ body: { boardingId: "b1", moveInDate: tomorrow } }),
			res,
			next,
		);
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("throws BadRequestError for past move-in date", async () => {
		const yesterday = new Date(Date.now() - 86_400_000)
			.toISOString()
			.split("T")[0];
		await createReservation(
			mockReq({ body: { boardingId: "b1", moveInDate: yesterday } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});

	it("throws BoardingNotFoundError when boarding not found", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.boarding.findUnique.mockResolvedValue(null);
		await createReservation(
			mockReq({ body: { boardingId: "x", moveInDate: tomorrow } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws BadRequestError when boarding not ACTIVE", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.boarding.findUnique.mockResolvedValue({
			...activeBoarding,
			status: "DRAFT",
		});
		await createReservation(
			mockReq({ body: { boardingId: "b1", moveInDate: tomorrow } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});

	it("throws ConflictError when boarding is full", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.boarding.findUnique.mockResolvedValue({
			...activeBoarding,
			currentOccupants: 2,
			maxOccupants: 2,
		});
		await createReservation(
			mockReq({ body: { boardingId: "b1", moveInDate: tomorrow } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
	});

	it("throws ConflictError when student already has active reservation", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.boarding.findUnique.mockResolvedValue(activeBoarding);
		db.reservation.findFirst.mockResolvedValueOnce({
			id: "res0",
			status: "ACTIVE",
		}); // active reservation check
		await createReservation(
			mockReq({ body: { boardingId: "b1", moveInDate: tomorrow } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
	});
});

// ── getMyRequests ─────────────────────────────────────────────────────────────
describe("getMyRequests", () => {
	it("returns student reservations", async () => {
		db.reservation.findMany.mockResolvedValue([fakeReservation]);
		const res = mockRes();
		await getMyRequests(mockReq(), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(db.reservation.findMany.mock.calls[0][0].where.studentId).toBe(
			"student1",
		);
	});
});

// ── getMyBoardingRequests ─────────────────────────────────────────────────────
describe("getMyBoardingRequests", () => {
	it("returns reservations for owner boardings", async () => {
		db.reservation.findMany.mockResolvedValue([fakeReservation]);
		const res = mockRes();
		await getMyBoardingRequests(
			mockReq({ user: { userId: "owner1", role: "OWNER" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
		expect(
			db.reservation.findMany.mock.calls[0][0].where.boarding.ownerId,
		).toBe("owner1");
	});
});

// ── getReservationById ────────────────────────────────────────────────────────
describe("getReservationById", () => {
	it("returns reservation for the student", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			studentId: "student1",
		});
		const res = mockRes();
		await getReservationById(mockReq({ params: { id: "res1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws NotFoundError when not found", async () => {
		db.reservation.findUnique.mockResolvedValue(null);
		await getReservationById(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError for unrelated user", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			studentId: "other",
			boardingId: "b1",
		});
		db.boarding.findUnique.mockResolvedValue({
			...activeBoarding,
			ownerId: "another",
		});
		await getReservationById(
			mockReq({
				params: { id: "res1" },
				user: { userId: "random", role: "STUDENT" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("allows ADMIN to access any reservation", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			studentId: "other",
		});
		const res = mockRes();
		await getReservationById(
			mockReq({
				params: { id: "res1" },
				user: { userId: "admin1", role: "ADMIN" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});
});

// ── approveReservation ────────────────────────────────────────────────────────
describe("approveReservation", () => {
	it("approves a PENDING reservation", async () => {
		const res = mockRes();
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			boarding: { ...activeBoarding, ownerId: "owner1" },
		});
		db.boarding.update.mockResolvedValue({});
		db.reservation.update.mockResolvedValue({
			...fakeReservation,
			status: "ACTIVE",
		});
		db.rentalPeriod.createMany.mockResolvedValue({});
		await approveReservation(
			mockReq({
				params: { id: "res1" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws NotFoundError when not found", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.reservation.findUnique.mockResolvedValue(null);
		await approveReservation(
			mockReq({
				params: { id: "x" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			boarding: { ...activeBoarding, ownerId: "other" },
		});
		await approveReservation(
			mockReq({
				params: { id: "res1" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws BadRequestError when not PENDING", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "ACTIVE",
			boarding: { ...activeBoarding, ownerId: "owner1" },
		});
		await approveReservation(
			mockReq({
				params: { id: "res1" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});

// ── rejectReservation ─────────────────────────────────────────────────────────
describe("rejectReservation", () => {
	it("rejects a PENDING reservation", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			boarding: { ...activeBoarding, ownerId: "owner1" },
		});
		db.reservation.update.mockResolvedValue({
			...fakeReservation,
			status: "REJECTED",
		});
		const res = mockRes();
		await rejectReservation(
			mockReq({
				params: { id: "res1" },
				body: { reason: "Not eligible" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws NotFoundError when not found", async () => {
		db.reservation.findUnique.mockResolvedValue(null);
		await rejectReservation(
			mockReq({
				params: { id: "x" },
				body: { reason: "r" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			boarding: { ...activeBoarding, ownerId: "other" },
		});
		await rejectReservation(
			mockReq({
				params: { id: "res1" },
				body: { reason: "r" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws BadRequestError when not PENDING", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "ACTIVE",
			boarding: { ...activeBoarding, ownerId: "owner1" },
		});
		await rejectReservation(
			mockReq({
				params: { id: "res1" },
				body: { reason: "r" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});

// ── cancelReservation ─────────────────────────────────────────────────────────
describe("cancelReservation", () => {
	it("cancels a PENDING reservation", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "PENDING",
			studentId: "student1",
		});
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.reservation.update.mockResolvedValue({
			...fakeReservation,
			status: "CANCELLED",
		});
		const res = mockRes();
		await cancelReservation(mockReq({ params: { id: "res1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("decrements occupants when cancelling ACTIVE reservation", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "ACTIVE",
			studentId: "student1",
		});
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.reservation.update.mockResolvedValue({
			...fakeReservation,
			status: "CANCELLED",
		});
		db.boarding.update.mockResolvedValue({});
		await cancelReservation(
			mockReq({ params: { id: "res1" } }),
			mockRes(),
			next,
		);
		expect(db.boarding.update).toHaveBeenCalledOnce();
	});

	it("throws NotFoundError when not found", async () => {
		db.reservation.findUnique.mockResolvedValue(null);
		await cancelReservation(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError when not the student", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			studentId: "other",
		});
		await cancelReservation(
			mockReq({ params: { id: "res1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws BadRequestError for non-cancellable status", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "COMPLETED",
			studentId: "student1",
		});
		await cancelReservation(
			mockReq({ params: { id: "res1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});

// ── completeReservation ───────────────────────────────────────────────────────
describe("completeReservation", () => {
	it("completes an ACTIVE reservation", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "ACTIVE",
			boarding: { ...activeBoarding, ownerId: "owner1" },
		});
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.reservation.update.mockResolvedValue({
			...fakeReservation,
			status: "COMPLETED",
		});
		db.boarding.update.mockResolvedValue({});
		const res = mockRes();
		await completeReservation(
			mockReq({
				params: { id: "res1" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws NotFoundError when not found", async () => {
		db.reservation.findUnique.mockResolvedValue(null);
		await completeReservation(
			mockReq({
				params: { id: "x" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "ACTIVE",
			boarding: { ...activeBoarding, ownerId: "other" },
		});
		await completeReservation(
			mockReq({
				params: { id: "res1" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws BadRequestError when not ACTIVE", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			status: "PENDING",
			boarding: { ...activeBoarding, ownerId: "owner1" },
		});
		await completeReservation(
			mockReq({
				params: { id: "res1" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});
