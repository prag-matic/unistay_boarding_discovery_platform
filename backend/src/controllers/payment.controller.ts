import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Payment, RentalPeriod, Reservation } from "@/models/index.js";
import { PaymentStatus, RentalPeriodStatus } from "@/types/enums.js";
import { sendSuccess } from "@/lib/response.js";

import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "@/errors/AppError.js";

import type {
  LogPaymentInput,
  RejectPaymentInput,
} from "@/schemas/payment.validators.js";

async function recalcRentalPeriodStatus(
  session: mongoose.ClientSession,
  rentalPeriodId: string,
): Promise<void> {
  const rentalPeriod =
    await RentalPeriod.findById(rentalPeriodId).session(session);

  if (!rentalPeriod) return;

  const payments = await Payment.find({
    rentalPeriodId: new mongoose.Types.ObjectId(rentalPeriodId),
  }).session(session);

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
    await RentalPeriod.findByIdAndUpdate(
      rentalPeriodId,
      { status: newStatus },
      { session },
    );
  }
}

// POST /api/payments  (student)
export async function logPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const studentId = req.user!.userId;
    const body = req.body as LogPaymentInput;

    const paidAt = new Date(body.paidAt);

    if (paidAt > new Date()) {
      throw new BadRequestError("paidAt cannot be in the future");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const rentalPeriod = await RentalPeriod.findById(
        body.rentalPeriodId,
      ).session(session);

      if (!rentalPeriod) throw new NotFoundError("Rental period not found");

      const reservation = await Reservation.findById(
        body.reservationId,
      ).session(session);

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
      }).session(session);

      const confirmedTotal = payments
        .filter((p) => p.status === PaymentStatus.CONFIRMED)
        .reduce((sum, p) => sum + p.amount, 0);

      const remaining = rentalPeriod.amountDue - confirmedTotal;

      if (body.amount > remaining) {
        throw new BadRequestError(
          `Amount exceeds remaining balance of ${remaining.toFixed(2)}`,
        );
      }

      const payment = await Payment.create(
        [
          {
            rentalPeriodId: new mongoose.Types.ObjectId(body.rentalPeriodId),
            reservationId: new mongoose.Types.ObjectId(body.reservationId),
            studentId: new mongoose.Types.ObjectId(studentId),
            amount: body.amount,
            paymentMethod: body.paymentMethod,
            referenceNumber: body.referenceNumber,
            proofImageUrl: body.proofImageUrl,
            paidAt,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      const populatedPayment = await Payment.findById(payment[0]._id).lean();

      sendSuccess(
        res,
        { payment: populatedPayment },
        "Payment logged successfully",
        201,
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
    const studentId = req.user!.userId;

    const payments = await Payment.find({
      studentId: new mongoose.Types.ObjectId(studentId),
    })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { payments });
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
    const ownerId = req.user!.userId;

    const reservations = await Reservation.find({})
      .populate({
        path: "boardingId",
        match: { ownerId: new mongoose.Types.ObjectId(ownerId) },
        select: "id ownerId",
      })
      .lean();

    const reservationIds = reservations
      .filter((r) => r.boardingId !== null)
      .map((r) => r._id);

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

    sendSuccess(res, { payments });
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
    const { id } = req.params as { id: string };
    const ownerId = req.user!.userId;

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

    const boarding = (existing.reservationId as any)?.boardingId;
    if (!boarding || boarding.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("You do not own this boarding");
    }

    if (existing.status !== PaymentStatus.PENDING) {
      throw new BadRequestError("Only PENDING payments can be confirmed");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Payment.findByIdAndUpdate(
        id,
        {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
        { session },
      );

      await recalcRentalPeriodStatus(
        session,
        existing.rentalPeriodId.toString(),
      );

      await session.commitTransaction();

      const payment = await Payment.findById(id).lean();

      sendSuccess(res, { payment }, "Payment confirmed");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
    const { id } = req.params as { id: string };
    const ownerId = req.user!.userId;
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

    const boarding = (existing.reservationId as any)?.boardingId;
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

    sendSuccess(res, { payment }, "Payment rejected");
  } catch (err) {
    next(err);
  }
}
