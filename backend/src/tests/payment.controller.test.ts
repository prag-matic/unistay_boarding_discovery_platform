import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
	payment: {
		create: vi.fn(),
		findMany: vi.fn(),
		findUnique: vi.fn(),
		update: vi.fn(),
	},
	rentalPeriod: { findUnique: vi.fn(), update: vi.fn() },
	reservation: { findUnique: vi.fn() },
	$transaction: vi.fn(),
};

vi.mock("@/lib/cloudinary.js", () => ({
	uploadPaymentProofImage: vi.fn().mockResolvedValue("https://cdn/proof.jpg"),
}));

import {
	confirmPayment,
	getMyBoardingPayments,
	getMyPayments,
	logPayment,
	rejectPayment,
	uploadProofImage,
} from "@/controllers/payment.controller.js";
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "@/errors/AppError.js";
import { uploadPaymentProofImage } from "@/lib/cloudinary.js";

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		user: { userId: "student1" },
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

const pastDate = new Date(Date.now() - 1000).toISOString();
const futureDate = new Date(Date.now() + 60_000).toISOString();

const fakeRentalPeriod = {
	id: "rp1",
	reservationId: "res1",
	amountDue: 10000,
	status: "UPCOMING",
	payments: [],
};
const fakeReservation = { id: "res1", studentId: "student1" };
const fakeBoarding = { id: "b1", ownerId: "owner1", title: "T" };
const fakePayment = {
	id: "pay1",
	rentalPeriodId: "rp1",
	reservationId: "res1",
	studentId: "student1",
	status: "PENDING",
	amount: 5000,
	reservation: { boarding: fakeBoarding },
};

beforeEach(() => vi.clearAllMocks());

// ── logPayment ────────────────────────────────────────────────────────────────
describe("logPayment", () => {
	it("logs a payment and returns 201", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.rentalPeriod.findUnique.mockResolvedValue(fakeRentalPeriod);
		db.reservation.findUnique.mockResolvedValue(fakeReservation);
		db.payment.create.mockResolvedValue(fakePayment);
		const res = mockRes();
		await logPayment(
			mockReq({
				body: {
					rentalPeriodId: "rp1",
					reservationId: "res1",
					amount: 5000,
					paymentMethod: "CASH",
					paidAt: pastDate,
				},
			}),
			res,
			next,
		);
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("throws BadRequestError for future paidAt", async () => {
		await logPayment(
			mockReq({
				body: {
					rentalPeriodId: "rp1",
					reservationId: "res1",
					amount: 100,
					paymentMethod: "CASH",
					paidAt: futureDate,
				},
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});

	it("throws NotFoundError when rental period not found", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.rentalPeriod.findUnique.mockResolvedValue(null);
		await logPayment(
			mockReq({
				body: {
					rentalPeriodId: "x",
					reservationId: "res1",
					amount: 100,
					paymentMethod: "CASH",
					paidAt: pastDate,
				},
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws NotFoundError when reservation not found", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.rentalPeriod.findUnique.mockResolvedValue(fakeRentalPeriod);
		db.reservation.findUnique.mockResolvedValue(null);
		await logPayment(
			mockReq({
				body: {
					rentalPeriodId: "rp1",
					reservationId: "x",
					amount: 100,
					paymentMethod: "CASH",
					paidAt: pastDate,
				},
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError when student does not own reservation", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.rentalPeriod.findUnique.mockResolvedValue(fakeRentalPeriod);
		db.reservation.findUnique.mockResolvedValue({
			...fakeReservation,
			studentId: "other",
		});
		await logPayment(
			mockReq({
				body: {
					rentalPeriodId: "rp1",
					reservationId: "res1",
					amount: 100,
					paymentMethod: "CASH",
					paidAt: pastDate,
				},
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws ConflictError when rental period already PAID", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.rentalPeriod.findUnique.mockResolvedValue({
			...fakeRentalPeriod,
			status: "PAID",
		});
		db.reservation.findUnique.mockResolvedValue(fakeReservation);
		await logPayment(
			mockReq({
				body: {
					rentalPeriodId: "rp1",
					reservationId: "res1",
					amount: 100,
					paymentMethod: "CASH",
					paidAt: pastDate,
				},
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
	});

	it("throws BadRequestError when amount exceeds remaining balance", async () => {
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.rentalPeriod.findUnique.mockResolvedValue({
			...fakeRentalPeriod,
			amountDue: 1000,
			payments: [],
		});
		db.reservation.findUnique.mockResolvedValue(fakeReservation);
		await logPayment(
			mockReq({
				body: {
					rentalPeriodId: "rp1",
					reservationId: "res1",
					amount: 9999,
					paymentMethod: "CASH",
					paidAt: pastDate,
				},
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});

// ── getMyPayments ─────────────────────────────────────────────────────────────
describe("getMyPayments", () => {
	it("returns student payments", async () => {
		db.payment.findMany.mockResolvedValue([fakePayment]);
		const res = mockRes();
		await getMyPayments(mockReq(), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(db.payment.findMany.mock.calls[0][0].where.studentId).toBe(
			"student1",
		);
	});
});

// ── getMyBoardingPayments ─────────────────────────────────────────────────────
describe("getMyBoardingPayments", () => {
	it("returns payments for owner boardings", async () => {
		db.payment.findMany.mockResolvedValue([fakePayment]);
		const res = mockRes();
		await getMyBoardingPayments(
			mockReq({ user: { userId: "owner1" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
		expect(
			db.payment.findMany.mock.calls[0][0].where.reservation.boarding.ownerId,
		).toBe("owner1");
	});
});

// ── confirmPayment ────────────────────────────────────────────────────────────
describe("confirmPayment", () => {
	it("confirms a PENDING payment", async () => {
		db.payment.findUnique
			.mockResolvedValueOnce(fakePayment) // initial lookup with include
			.mockResolvedValueOnce({ ...fakePayment, status: "CONFIRMED" }); // final select
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.rentalPeriod.findUnique.mockResolvedValue({
			...fakeRentalPeriod,
			payments: [
				{
					...fakePayment,
					status: "CONFIRMED",
					amount: { add: () => ({ gte: () => false, gt: () => false }) },
				},
			],
		});
		db.payment.update.mockResolvedValue({});
		const res = mockRes();
		await confirmPayment(
			mockReq({ params: { id: "pay1" }, user: { userId: "owner1" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws NotFoundError when payment not found", async () => {
		db.payment.findUnique.mockResolvedValue(null);
		await confirmPayment(
			mockReq({ params: { id: "x" }, user: { userId: "owner1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError when not owner of boarding", async () => {
		db.payment.findUnique.mockResolvedValue({
			...fakePayment,
			reservation: { boarding: { ...fakeBoarding, ownerId: "other" } },
		});
		await confirmPayment(
			mockReq({ params: { id: "pay1" }, user: { userId: "owner1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws BadRequestError when payment is not PENDING", async () => {
		db.payment.findUnique.mockResolvedValue({
			...fakePayment,
			status: "CONFIRMED",
			reservation: { boarding: fakeBoarding },
		});
		await confirmPayment(
			mockReq({ params: { id: "pay1" }, user: { userId: "owner1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});

// ── uploadProofImage ──────────────────────────────────────────────────────────
describe("uploadProofImage", () => {
	it("uploads proof image", async () => {
		const fakeFile = {
			buffer: Buffer.from("x"),
			mimetype: "image/jpeg",
		} as any;
		const res = mockRes();
		await uploadProofImage(mockReq({ file: fakeFile }), res, next);
		expect(uploadPaymentProofImage).toHaveBeenCalledOnce();
		expect(res.json).toHaveBeenCalled();
	});

	it("throws UnauthorizedError when no req.user", async () => {
		await uploadProofImage(mockReq({ user: undefined }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
	});

	it("throws BadRequestError when no file", async () => {
		await uploadProofImage(mockReq({ file: undefined }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});

// ── rejectPayment ─────────────────────────────────────────────────────────────
describe("rejectPayment", () => {
	it("rejects a PENDING payment", async () => {
		db.payment.findUnique.mockResolvedValue(fakePayment);
		db.payment.update.mockResolvedValue({ ...fakePayment, status: "REJECTED" });
		const res = mockRes();
		await rejectPayment(
			mockReq({
				params: { id: "pay1" },
				body: { reason: "Fake proof" },
				user: { userId: "owner1" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws NotFoundError when payment not found", async () => {
		db.payment.findUnique.mockResolvedValue(null);
		await rejectPayment(
			mockReq({
				params: { id: "x" },
				body: { reason: "r" },
				user: { userId: "owner1" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
	});

	it("throws ForbiddenError when not owner of boarding", async () => {
		db.payment.findUnique.mockResolvedValue({
			...fakePayment,
			reservation: { boarding: { ...fakeBoarding, ownerId: "other" } },
		});
		await rejectPayment(
			mockReq({
				params: { id: "pay1" },
				body: { reason: "r" },
				user: { userId: "owner1" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws BadRequestError when payment is not PENDING", async () => {
		db.payment.findUnique.mockResolvedValue({
			...fakePayment,
			status: "CONFIRMED",
			reservation: { boarding: fakeBoarding },
		});
		await rejectPayment(
			mockReq({
				params: { id: "pay1" },
				body: { reason: "r" },
				user: { userId: "owner1" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
	});
});
