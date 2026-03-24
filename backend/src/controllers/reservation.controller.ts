import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	BadRequestError,
	BoardingNotFoundError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding, RentalPeriod, Reservation } from "@/models/index.js";

import type {
	CreateReservationInput,
	RejectReservationInput,
} from "@/schemas/reservation.validators.js";
import { BoardingStatus, ReservationStatus } from "@/types/enums.js";

const RESERVATION_EXPIRY_HOURS = 72;

// Helper: generate rental periods for an active reservation
async function generateRentalPeriods(
	session: mongoose.ClientSession,
	reservationId: string,
	moveInDate: Date,
	monthlyRent: number,
): Promise<void> {
	const firstDue = new Date(moveInDate);
	firstDue.setUTCHours(0, 0, 0, 0);

	const formatPeriodLabel = (d: Date) =>
		`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

	const periods = [];

	for (let i = 0; i < 12; i++) {
		let dueDate: Date;

		if (i === 0) {
			dueDate = new Date(firstDue);
		} else {
			dueDate = new Date(firstDue);
			dueDate.setUTCMonth(firstDue.getUTCMonth() + i);
			dueDate.setUTCDate(1);
		}

		periods.push({
			reservationId: new mongoose.Types.ObjectId(reservationId),
			periodLabel: formatPeriodLabel(dueDate),
			dueDate,
			amountDue: monthlyRent,
		});
	}

	await RentalPeriod.insertMany(periods, { session });
}

// POST /api/reservations
export async function createReservation(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const studentId = req.user.userId;
		const body = req.body as CreateReservationInput;

		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);

		const minMoveIn = new Date(today);
		minMoveIn.setUTCDate(minMoveIn.getUTCDate() + 1);

		const moveInDate = new Date(body.moveInDate);
		moveInDate.setUTCHours(0, 0, 0, 0);

		if (moveInDate < minMoveIn) {
			throw new BadRequestError(
				"Move-in date must be at least 1 day in the future",
			);
		}

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const boarding = await Boarding.findById(body.boardingId).session(
				session,
			);

			if (!boarding || boarding.isDeleted) throw new BoardingNotFoundError();

			if (boarding.status !== BoardingStatus.ACTIVE) {
				throw new BadRequestError("Boarding is not available for reservation");
			}

			if (boarding.currentOccupants >= boarding.maxOccupants) {
				throw new ConflictError("Boarding is full");
			}

			const activeReservation = await Reservation.findOne({
				studentId: new mongoose.Types.ObjectId(studentId),
				status: ReservationStatus.ACTIVE,
			}).session(session);

			if (activeReservation) {
				throw new ConflictError("You already have an active reservation");
			}

			const existingForBoarding = await Reservation.findOne({
				studentId: new mongoose.Types.ObjectId(studentId),
				boardingId: new mongoose.Types.ObjectId(body.boardingId),
				status: { $in: [ReservationStatus.PENDING, ReservationStatus.ACTIVE] },
			}).session(session);

			if (existingForBoarding) {
				throw new ConflictError(
					"You already have a pending or active reservation for this boarding",
				);
			}

			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + RESERVATION_EXPIRY_HOURS);

			const boardingSnapshot = {
				id: boarding._id.toString(),
				title: boarding.title,
				slug: boarding.slug,
				city: boarding.city,
				district: boarding.district,
				address: boarding.address,
				boardingType: boarding.boardingType,
				genderPref: boarding.genderPref,
				monthlyRent: boarding.monthlyRent,
				maxOccupants: boarding.maxOccupants,
				nearUniversity: boarding.nearUniversity,
			};

			const reservation = await Reservation.create(
				[
					{
						studentId: new mongoose.Types.ObjectId(studentId),
						boardingId: new mongoose.Types.ObjectId(body.boardingId),
						moveInDate,
						specialRequests: body.specialRequests,
						rentSnapshot: boarding.monthlyRent,
						boardingSnapshot,
						expiresAt,
					},
				],
				{ session },
			);

			await session.commitTransaction();

			const populatedReservation = await Reservation.findById(
				reservation[0]._id,
			)
				.populate("studentId", "id firstName lastName email")
				.populate("boardingId", "id title slug city district")
				.lean();

			sendSuccess(
				res,
				{ reservation: populatedReservation },
				"Reservation request created successfully",
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

// GET /api/reservations/my-requests  (student)
export async function getMyRequests(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const studentId = req.user.userId;

		const reservations = await Reservation.find({
			studentId: new mongoose.Types.ObjectId(studentId),
		})
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, { reservations });
	} catch (err) {
		next(err);
	}
}

// GET /api/reservations/my-boardings  (owner)
export async function getMyBoardingRequests(
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
			sendSuccess(res, { reservations: [] });
			return;
		}

		// Then find reservations for those boardings
		const reservations = await Reservation.find({
			boardingId: { $in: boardingIds },
		})
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, { reservations });
	} catch (err) {
		next(err);
	}
}

// GET /api/reservations/:id
export async function getReservationById(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const userId = req.user.userId;
		const role = req.user.role;

		const reservation = await Reservation.findById(id)
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.lean();

		if (!reservation) throw new NotFoundError("Reservation not found");

		if (role !== "ADMIN") {
			const isStudent = reservation.studentId._id.toString() === userId;

			if (!isStudent) {
				const boarding = await Boarding.findById(reservation.boardingId._id);

				if (!boarding || boarding.ownerId.toString() !== userId) {
					throw new ForbiddenError("Access denied");
				}
			}
		}

		sendSuccess(res, { reservation });
	} catch (err) {
		next(err);
	}
}

// PATCH /api/reservations/:id/approve  (owner)
export async function approveReservation(
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

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const reservation = await Reservation.findById(id)
				.populate({
					path: "boardingId",
					select: "ownerId currentOccupants maxOccupants",
				})
				.session(session);

			if (!reservation) throw new NotFoundError("Reservation not found");

			const boardingInfo =
				reservation.boardingId as typeof reservation.boardingId & {
					ownerId?: mongoose.Types.ObjectId;
				};
			if (!boardingInfo || boardingInfo.ownerId?.toString() !== ownerId) {
				throw new ForbiddenError("You do not own this boarding");
			}

			if (reservation.status !== ReservationStatus.PENDING) {
				throw new BadRequestError("Only PENDING reservations can be approved");
			}

			if (new Date() > reservation.expiresAt) {
				await Reservation.findByIdAndUpdate(
					id,
					{ status: ReservationStatus.EXPIRED },
					{ session },
				);
				throw new BadRequestError("Reservation has expired");
			}

			const boarding = reservation.boardingId as unknown as {
				_id: string;
				currentOccupants: number;
				maxOccupants: number;
			};
			if (boarding.currentOccupants >= boarding.maxOccupants) {
				throw new ConflictError("Boarding is full");
			}

			await Boarding.findByIdAndUpdate(
				boarding._id,
				{
					$inc: { currentOccupants: 1 },
				},
				{ session },
			);

			await Reservation.findByIdAndUpdate(
				id,
				{ status: ReservationStatus.ACTIVE },
				{ session },
			);

			await generateRentalPeriods(
				session,
				id,
				reservation.moveInDate,
				reservation.rentSnapshot,
			);

			await session.commitTransaction();

			const updatedReservation = await Reservation.findById(id, undefined, {
				populate: [
					{ path: "studentId", select: "firstName lastName email" },
					{ path: "boardingId", select: "title slug city district" },
				],
				lean: true,
				session,
			});

			res.status(200).json({
				success: true,
				message: "Reservation approved",
				data: { reservation: updatedReservation },
				timestamp: new Date().toISOString(),
			});
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

// PATCH /api/reservations/:id/reject  (owner)
export async function rejectReservation(
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
		const { reason } = req.body as RejectReservationInput;

		const existing = await Reservation.findById(id).populate(
			"boardingId",
			"ownerId",
		);

		if (!existing) throw new NotFoundError("Reservation not found");

		const boarding = existing.boardingId as typeof existing.boardingId & {
			ownerId?: mongoose.Types.ObjectId;
		};
		if (!boarding || boarding.ownerId?.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this boarding");
		}

		if (existing.status !== ReservationStatus.PENDING) {
			throw new BadRequestError("Only PENDING reservations can be rejected");
		}

		const reservation = await Reservation.findByIdAndUpdate(
			id,
			{ status: ReservationStatus.REJECTED, rejectionReason: reason },
			{ new: true },
		)
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.lean();

		sendSuccess(res, { reservation }, "Reservation rejected");
	} catch (err) {
		next(err);
	}
}

// PATCH /api/v1/reservations/:id/cancel  (student)
export async function cancelReservation(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const studentId = req.user.userId;

		const existing = await Reservation.findById(id);

		if (!existing) throw new NotFoundError("Reservation not found");

		if (existing.studentId.toString() !== studentId) {
			throw new ForbiddenError("This is not your reservation");
		}

		if (
			existing.status !== ReservationStatus.PENDING &&
			existing.status !== ReservationStatus.ACTIVE
		) {
			throw new BadRequestError(
				"Only PENDING or ACTIVE reservations can be cancelled",
			);
		}

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const updated = await Reservation.findByIdAndUpdate(
				id,
				{ status: ReservationStatus.CANCELLED },
				{ new: true, session },
			)
				.populate("studentId", "firstName lastName email")
				.populate("boardingId", "title slug city district")
				.lean();

			if (existing.status === ReservationStatus.ACTIVE) {
				await Boarding.findByIdAndUpdate(
					existing.boardingId,
					{
						$inc: { currentOccupants: -1 },
					},
					{ session },
				);
			}

			await session.commitTransaction();

			sendSuccess(res, { reservation: updated }, "Reservation cancelled");
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

// PATCH /api/reservations/:id/complete  (owner)
export async function completeReservation(
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

		const existing = await Reservation.findById(id).populate(
			"boardingId",
			"ownerId",
		);

		if (!existing) throw new NotFoundError("Reservation not found");

		const boarding = existing.boardingId as typeof existing.boardingId & {
			ownerId?: mongoose.Types.ObjectId;
		};
		if (!boarding || boarding.ownerId?.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this boarding");
		}

		if (existing.status !== ReservationStatus.ACTIVE) {
			throw new BadRequestError("Only ACTIVE reservations can be completed");
		}

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const updated = await Reservation.findByIdAndUpdate(
				id,
				{ status: ReservationStatus.COMPLETED },
				{ new: true, session },
			)
				.populate("studentId", "firstName lastName email")
				.populate("boardingId", "title slug city district")
				.lean();

			await Boarding.findByIdAndUpdate(
				existing.boardingId,
				{
					$inc: { currentOccupants: -1 },
				},
				{ session },
			);

			await session.commitTransaction();

			sendSuccess(res, { reservation: updated }, "Reservation completed");
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
