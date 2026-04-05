import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ForbiddenError, NotFoundError } from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import { RentalPeriod, Reservation } from "@/models/index.js";
import { transformRentalPeriodDoc } from "@/utils/index.js";

// GET /api/reservations/:resId/rental-periods  (participant)
export async function getRentalPeriods(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { resId } = req.params as { resId: string };
		const userId = req.user.userId;
		const role = req.user.role;

		const reservation = await Reservation.findById(resId)
			.populate("boardingId", "ownerId")
			.lean();

		if (!reservation) throw new NotFoundError("Reservation not found");

		if (role !== "ADMIN") {
			const isStudent = reservation.studentId.toString() === userId;
			const boarding =
				reservation.boardingId as typeof reservation.boardingId & {
					ownerId?: mongoose.Types.ObjectId;
				};
			const isOwner = boarding?.ownerId?.toString() === userId;

			if (!isStudent && !isOwner) {
				throw new ForbiddenError("Access denied");
			}
		}

		const rentalPeriods = await RentalPeriod.find({
			reservationId: new mongoose.Types.ObjectId(resId),
		})
			.populate({
				path: "payments",
				select: "id amount paymentMethod status paidAt confirmedAt",
			})
			.sort({ dueDate: 1 })
			.lean({ virtuals: true });

		sendSuccess(res, {
			rentalPeriods: (rentalPeriods as Record<string, unknown>[]).map(
				transformRentalPeriodDoc,
			),
		});
	} catch (err) {
		next(err);
	}
}
