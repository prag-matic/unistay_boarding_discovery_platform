import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma.js", () => {
	const db = {
		reservation: { findUnique: vi.fn() },
		rentalPeriod: { findMany: vi.fn() },
	};
	return { default: db, prisma: db };
});

import { getRentalPeriods } from "@/controllers/rentalPeriod.controller.js";
import { ForbiddenError, NotFoundError } from "@/errors/AppError.js";
import prisma from "@/lib/prisma.js";

const db = prisma as any;

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
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

const fakeBoarding = { id: "b1", ownerId: "owner1" };
const fakeReservation = {
	id: "res1",
	studentId: "student1",
	boarding: fakeBoarding,
};
const fakeRentalPeriods = [
	{
		id: "rp1",
		reservationId: "res1",
		periodLabel: "2026-01",
		dueDate: new Date(),
		amountDue: 10000,
		status: "UPCOMING",
		createdAt: new Date(),
		updatedAt: new Date(),
		payments: [],
	},
];

beforeEach(() => vi.clearAllMocks());

describe("getRentalPeriods", () => {
	it("returns rental periods for the student", async () => {
		db.reservation.findUnique.mockResolvedValue(fakeReservation);
		db.rentalPeriod.findMany.mockResolvedValue(fakeRentalPeriods);
		const res = mockRes();
		await getRentalPeriods(mockReq({ params: { resId: "res1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
		const data = res.json.mock.calls[0][0].data;
		expect(data.rentalPeriods).toHaveLength(1);
	});

	it("returns rental periods for the owner", async () => {
		db.reservation.findUnique.mockResolvedValue(fakeReservation);
		db.rentalPeriod.findMany.mockResolvedValue(fakeRentalPeriods);
		const res = mockRes();
		await getRentalPeriods(
			mockReq({
				params: { resId: "res1" },
				user: { userId: "owner1", role: "OWNER" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("allows ADMIN to access any reservation", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			studentId: "other",
		});
		db.rentalPeriod.findMany.mockResolvedValue(fakeRentalPeriods);
		const res = mockRes();
		await getRentalPeriods(
			mockReq({
				params: { resId: "res1" },
				user: { userId: "admin1", role: "ADMIN" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws NotFoundError when reservation not found", async () => {
		db.reservation.findUnique.mockResolvedValue(null);
		await getRentalPeriods(
			mockReq({ params: { resId: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError for unrelated user", async () => {
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			studentId: "other",
			boarding: { ownerId: "another" },
		});
		await getRentalPeriods(
			mockReq({
				params: { resId: "res1" },
				user: { userId: "random", role: "STUDENT" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("calls next on db error", async () => {
		db.reservation.findUnique.mockRejectedValue(new Error("db"));
		await getRentalPeriods(
			mockReq({ params: { resId: "res1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});
});
