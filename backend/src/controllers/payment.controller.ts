import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "@/errors/AppError.js";
import { uploadPaymentProofImage } from "@/lib/cloudinary.js";
import { sendSuccess } from "@/lib/response.js";
import {
	Boarding,
	Payment,
	RentalPeriod,
	Reservation,
} from "@/models/index.js";
import type {
	LogPaymentInput,
	RejectPaymentInput,
} from "@/schemas/payment.validators.js";
import { PaymentStatus, RentalPeriodStatus } from "@/types/enums.js";
import { addId, transformPaymentDoc } from "@/utils/index.js";

async function recalcRentalPeriodStatus(rentalPeriodId: string): Promise<void> {
	const rentalPeriod = await RentalPeriod.findById(rentalPeriodId);

	if (!rentalPeriod) return;

	const payments = await Payment.find({
		rentalPeriodId: new mongoose.Types.ObjectId(rentalPeriodId),
	});

	const confirmedTotal = payments
		.filter((p) => p.status === PaymentStatus.CONFIRMED)
		.reduce((sum, p) => sum + p.amount, 0);

	let newStatus = rentalPeriod.status;

	if (confirmedTotal >= rentalPeriod.amountDue) {
		newStatus = RentalPeriodStatus.PAID;
	} else if (confirmedTotal > 0) {
		newStatus = RentalPeriodStatus.PARTIALLY_PAID;
	}

	if (newStatus !== rentalPeriod.status) {
		await RentalPeriod.findByIdAndUpdate(rentalPeriodId, { status: newStatus });
	}
}

// POST /api/payments  (student)
export async function logPayment(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const studentId = req.user.userId;
		const body = req.body as LogPaymentInput;

		const paidAt = new Date(body.paidAt);

		if (paidAt > new Date()) {
			throw new BadRequestError("paidAt cannot be in the future");
		}

		const rentalPeriod = await RentalPeriod.findById(body.rentalPeriodId);

		if (!rentalPeriod) throw new NotFoundError("Rental period not found");

		const reservation = await Reservation.findById(body.reservationId);

		if (!reservation) throw new NotFoundError("Reservation not found");

		if (reservation.studentId.toString() !== studentId) {
			throw new ForbiddenError("You are not the student on this reservation");
		}

		if (rentalPeriod.reservationId.toString() !== body.reservationId) {
			throw new BadRequestError(
				"Rental period does not belong to this reservation",
			);
		}

		if (rentalPeriod.status === RentalPeriodStatus.PAID) {
			throw new ConflictError("Rental period is already fully paid");
		}

		const payments = await Payment.find({
			rentalPeriodId: new mongoose.Types.ObjectId(body.rentalPeriodId),
		});

		const confirmedTotal = payments
			.filter((p) => p.status === PaymentStatus.CONFIRMED)
			.reduce((sum, p) => sum + p.amount, 0);

		const remaining = rentalPeriod.amountDue - confirmedTotal;

		if (body.amount > remaining) {
			throw new BadRequestError(
				`Amount exceeds remaining balance of ${remaining.toFixed(2)}`,
			);
		}

		const payment = await Payment.create({
			rentalPeriodId: new mongoose.Types.ObjectId(body.rentalPeriodId),
			reservationId: new mongoose.Types.ObjectId(body.reservationId),
			studentId: new mongoose.Types.ObjectId(studentId),
			amount: body.amount,
			paymentMethod: body.paymentMethod,
			referenceNumber: body.referenceNumber,
			proofImageUrl: body.proofImageUrl,
			paidAt,
		});

		const populatedPayment = await Payment.findById(payment._id).lean();

		sendSuccess(
			res,
			{ payment: addId(populatedPayment as Record<string, unknown>) },
			"Payment logged successfully",
			201,
		);
	} catch (err) {
		next(err);
	}
}

// GET /api/v1/payments/my-payments  (student)
export async function getMyPayments(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const studentId = req.user.userId;

		const payments = await Payment.find({
			studentId: new mongoose.Types.ObjectId(studentId),
		})
			.populate({
				path: "rentalPeriodId",
				select: "periodLabel dueDate amountDue status",
			})
			.populate({
				path: "reservationId",
				populate: {
					path: "boardingId",
					select: "title",
				},
			})
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, {
			payments: (payments as Record<string, unknown>[]).map(
				transformPaymentDoc,
			),
		});
	} catch (err) {
		next(err);
	}
}

// GET /api/payments/my-boardings  (owner)
export async function getMyBoardingPayments(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const ownerId = req.user.userId;

		// First, find all boardings owned by the current user
		const ownerBoardings = await Boarding.find({
			ownerId: new mongoose.Types.ObjectId(ownerId),
		})
			.select("_id")
			.lean();

		const boardingIds = ownerBoardings.map((b) => b._id);

		if (boardingIds.length === 0) {
			sendSuccess(res, { payments: [] });
			return;
		}

		// Find reservations for those boardings
		const reservations = await Reservation.find({
			boardingId: { $in: boardingIds },
		})
			.select("_id")
			.lean();

		const reservationIds = reservations.map((r) => r._id);

		// Then find payments for those reservations
		const payments = await Payment.find({
			reservationId: { $in: reservationIds },
		})
			.populate({
				path: "reservationId",
				populate: {
					path: "boardingId",
					select: "id title",
				},
			})
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, {
			payments: (payments as Record<string, unknown>[]).map(
				transformPaymentDoc,
			),
		});
	} catch (err) {
		next(err);
	}
}

// PATCH /api/v1/payments/:id/confirm  (owner)
export async function confirmPayment(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const ownerId = req.user.userId;

		const existing = await Payment.findById(id)
			.populate({
				path: "reservationId",
				populate: {
					path: "boardingId",
					select: "ownerId",
				},
			})
			.lean();

		if (!existing) throw new NotFoundError("Payment not found");

		const boarding = (
			existing.reservationId as typeof existing.reservationId & {
				boardingId?: { ownerId: mongoose.Types.ObjectId };
			}
		)?.boardingId;
		if (!boarding || boarding.ownerId.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this boarding");
		}

		if (existing.status !== PaymentStatus.PENDING) {
			throw new BadRequestError("Only PENDING payments can be confirmed");
		}

		await Payment.findByIdAndUpdate(id, {
			status: PaymentStatus.CONFIRMED,
			confirmedAt: new Date(),
		});

		await recalcRentalPeriodStatus(existing.rentalPeriodId.toString());

		const payment = await Payment.findById(id).lean();

		sendSuccess(
			res,
			{ payment: addId(payment as Record<string, unknown>) },
			"Payment confirmed",
		);
	} catch (err) {
		next(err);
	}
}

// PUT /api/payments/:id/proof-image  (student)
export async function uploadProofImage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();
		if (!req.file) throw new BadRequestError("No image file provided");

		const proofImageUrl = await uploadPaymentProofImage(
			req.file.buffer,
			req.file.mimetype,
		);

		sendSuccess(res, { proofImageUrl }, "Proof image uploaded successfully");
	} catch (err) {
		next(err);
	}
}

// PATCH /api/v1/payments/:id/reject  (owner)
export async function rejectPayment(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const ownerId = req.user.userId;
		const { reason } = req.body as RejectPaymentInput;

		const existing = await Payment.findById(id)
			.populate({
				path: "reservationId",
				populate: {
					path: "boardingId",
					select: "ownerId",
				},
			})
			.lean();

		if (!existing) throw new NotFoundError("Payment not found");

		const boarding = (
			existing.reservationId as typeof existing.reservationId & {
				boardingId?: { ownerId: mongoose.Types.ObjectId };
			}
		)?.boardingId;
		if (!boarding || boarding.ownerId.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this boarding");
		}

		if (existing.status !== PaymentStatus.PENDING) {
			throw new BadRequestError("Only PENDING payments can be rejected");
		}

		const payment = await Payment.findByIdAndUpdate(
			id,
			{
				status: PaymentStatus.REJECTED,
				rejectionReason: reason,
			},
			{ new: true },
		).lean();

		sendSuccess(
			res,
			{ payment: addId(payment as Record<string, unknown>) },
			"Payment rejected",
		);
	} catch (err) {
		next(err);
	}
}
