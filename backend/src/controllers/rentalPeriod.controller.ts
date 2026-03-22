import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { RentalPeriod, Reservation, Boarding } from "@/models/index.js";
import { sendSuccess } from "@/lib/response.js";
import { ForbiddenError, NotFoundError } from "@/errors/AppError.js";

// GET /api/reservations/:resId/rental-periods  (participant)
export async function getRentalPeriods(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { resId } = req.params as { resId: string };
    const userId = req.user!.userId;
    const role = req.user!.role;

    const reservation = await Reservation.findById(resId)
      .populate("boardingId", "ownerId")
      .lean();

    if (!reservation) throw new NotFoundError("Reservation not found");

    if (role !== "ADMIN") {
      const isStudent = reservation.studentId.toString() === userId;
      const isOwner =
        (reservation.boardingId as any)?.ownerId.toString() === userId;

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
      .lean();

    sendSuccess(res, { rentalPeriods });
  } catch (err) {
    next(err);
  }
}
