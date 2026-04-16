import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	BadRequestError,
	BoardingNotFoundError,
	ConflictError,
	ForbiddenError,
	GoneError,
	NotFoundError,
} from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding, VisitRequest } from "@/models/index.js";
import type {
	CreateVisitRequestInput,
	RejectVisitRequestInput,
} from "@/schemas/visitRequest.validators.js";
import { BoardingStatus, VisitRequestStatus } from "@/types/enums.js";
import { transformVisitRequestDoc } from "@/utils/index.js";

const VISIT_EXPIRY_HOURS = 72;

function hasValidDateRange(from: Date, to: Date): boolean {
	return Number.isFinite(from.getTime()) && Number.isFinite(to.getTime()) && from < to;
}

async function findApprovedVisitOverlap(params: {
	boardingId: string | mongoose.Types.ObjectId;
	requestedStartAt: Date;
	requestedEndAt: Date;
	excludeVisitRequestId?: string;
}) {
	const { boardingId, requestedStartAt, requestedEndAt, excludeVisitRequestId } =
		params;

	const query: {
		boardingId: mongoose.Types.ObjectId;
		status: VisitRequestStatus;
		requestedStartAt: { $lt: Date };
		requestedEndAt: { $gt: Date };
		_id?: { $ne: mongoose.Types.ObjectId };
	} = {
		boardingId: new mongoose.Types.ObjectId(boardingId),
		status: VisitRequestStatus.APPROVED,
		requestedStartAt: { $lt: requestedEndAt },
		requestedEndAt: { $gt: requestedStartAt },
	};

	if (excludeVisitRequestId) {
		query._id = { $ne: new mongoose.Types.ObjectId(excludeVisitRequestId) };
	}

	return VisitRequest.findOne(query).lean();
}

// POST /api/v1/visit-requests  (student)
export async function createVisitRequest(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const studentId = req.user.userId;
		const body = req.body as CreateVisitRequestInput;

		const now = new Date();
		const requestedStartAt = new Date(body.requestedStartAt);
		const requestedEndAt = new Date(body.requestedEndAt);

		if (requestedStartAt <= now) {
			throw new BadRequestError("requestedStartAt must be in the future");
		}

		if (requestedEndAt <= requestedStartAt) {
			throw new BadRequestError(
				"requestedEndAt must be after requestedStartAt",
			);
		}

		const boarding = await Boarding.findById(body.boardingId);

		if (!boarding || boarding.isDeleted) throw new BoardingNotFoundError();

		if (boarding.status !== BoardingStatus.ACTIVE) {
			throw new BadRequestError("Boarding is not available for visit requests");
		}

		const existing = await VisitRequest.findOne({
			studentId: new mongoose.Types.ObjectId(studentId),
			boardingId: new mongoose.Types.ObjectId(body.boardingId),
			status: VisitRequestStatus.PENDING,
		});

		if (existing) {
			throw new ConflictError(
				"You already have a pending visit request for this boarding",
			);
		}

		const overlappingApprovedVisit = await findApprovedVisitOverlap({
			boardingId: body.boardingId,
			requestedStartAt,
			requestedEndAt,
		});

		if (overlappingApprovedVisit) {
			throw new ConflictError(
				"Requested time slot is already reserved for this boarding",
			);
		}

		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + VISIT_EXPIRY_HOURS);

		const visitRequest = await VisitRequest.create({
			studentId: new mongoose.Types.ObjectId(studentId),
			boardingId: new mongoose.Types.ObjectId(body.boardingId),
			requestedStartAt,
			requestedEndAt,
			message: body.message,
			expiresAt,
		});

		const populated = await VisitRequest.findById(visitRequest._id)
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.lean();

		sendSuccess(
			res,
			{
				visitRequest: transformVisitRequestDoc(
					populated as Record<string, unknown>,
				),
			},
			"Visit request created successfully",
			201,
		);
	} catch (err) {
		next(err);
	}
}

// GET /api/v1/visit-requests/availability  (student)
export async function getVisitRequestAvailability(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}

		const {
			boardingId,
			from,
			to,
		} = req.query as {
			boardingId: string;
			from: string;
			to: string;
		};

		const fromDate = new Date(from);
		const toDate = new Date(to);

		if (!hasValidDateRange(fromDate, toDate)) {
			throw new BadRequestError("Invalid availability date range");
		}

		const boarding = await Boarding.findById(boardingId);

		if (!boarding || boarding.isDeleted) throw new BoardingNotFoundError();

		if (boarding.status !== BoardingStatus.ACTIVE) {
			throw new BadRequestError("Boarding is not available for visit requests");
		}

		const reservedSlots = await VisitRequest.find({
			boardingId: new mongoose.Types.ObjectId(boardingId),
			status: VisitRequestStatus.APPROVED,
			requestedStartAt: { $lt: toDate },
			requestedEndAt: { $gt: fromDate },
		})
			.select("requestedStartAt requestedEndAt")
			.sort({ requestedStartAt: 1 })
			.lean();

		sendSuccess(res, {
			reservedSlots: reservedSlots.map((slot) => ({
				requestedStartAt: slot.requestedStartAt,
				requestedEndAt: slot.requestedEndAt,
			})),
		});
	} catch (err) {
		next(err);
	}
}

// GET /api/v1/visit-requests/my-requests  (student)
export async function getMyVisitRequests(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const studentId = req.user.userId;

		const visitRequests = await VisitRequest.find({
			studentId: new mongoose.Types.ObjectId(studentId),
		})
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, {
			visitRequests: (visitRequests as Record<string, unknown>[]).map(
				transformVisitRequestDoc,
			),
		});
	} catch (err) {
		next(err);
	}
}

// GET /api/v1/visit-requests/my-boardings  (owner)
export async function getMyBoardingVisitRequests(
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
			sendSuccess(res, { visitRequests: [] });
			return;
		}

		// Then find visit requests for those boardings
		const visitRequests = await VisitRequest.find({
			boardingId: { $in: boardingIds },
		})
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, {
			visitRequests: (visitRequests as Record<string, unknown>[]).map(
				transformVisitRequestDoc,
			),
		});
	} catch (err) {
		next(err);
	}
}

// GET /api/v1/visit-requests/:id
export async function getVisitRequestById(
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

		const visitRequest = await VisitRequest.findById(id)
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.lean();

		if (!visitRequest) throw new NotFoundError("Visit request not found");

		if (role !== "ADMIN") {
			const isStudent = visitRequest.studentId._id.toString() === userId;

			if (!isStudent) {
				const boarding = await Boarding.findById(visitRequest.boardingId._id);

				if (!boarding || boarding.ownerId.toString() !== userId) {
					throw new ForbiddenError("Access denied");
				}
			}
		}

		sendSuccess(res, {
			visitRequest: transformVisitRequestDoc(
				visitRequest as Record<string, unknown>,
			),
		});
	} catch (err) {
		next(err);
	}
}

// PATCH /api/v1/visit-requests/:id/approve  (owner)
export async function approveVisitRequest(
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

		const existing = await VisitRequest.findById(id).populate(
			"boardingId",
			"ownerId",
		);

		if (!existing) throw new NotFoundError("Visit request not found");

		const boarding = existing.boardingId as typeof existing.boardingId & {
			ownerId?: mongoose.Types.ObjectId;
		};
		if (!boarding || boarding.ownerId?.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this boarding");
		}

		if (existing.status !== VisitRequestStatus.PENDING) {
			throw new BadRequestError("Only PENDING visit requests can be approved");
		}

		if (new Date() > existing.expiresAt) {
			await VisitRequest.findByIdAndUpdate(id, {
				status: VisitRequestStatus.EXPIRED,
			});
			throw new GoneError("Visit request has expired");
		}

		const overlappingApprovedVisit = await findApprovedVisitOverlap({
			boardingId: existing.boardingId._id,
			requestedStartAt: existing.requestedStartAt,
			requestedEndAt: existing.requestedEndAt,
			excludeVisitRequestId: id,
		});

		if (overlappingApprovedVisit) {
			throw new ConflictError("Requested time slot is already reserved");
		}

		const visitRequest = await VisitRequest.findByIdAndUpdate(
			id,
			{ status: VisitRequestStatus.APPROVED },
			{ new: true },
		)
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.lean();

		sendSuccess(
			res,
			{
				visitRequest: transformVisitRequestDoc(
					visitRequest as Record<string, unknown>,
				),
			},
			"Visit request approved",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/v1/visit-requests/:id/reject  (owner)
export async function rejectVisitRequest(
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
		const { reason } = req.body as RejectVisitRequestInput;

		const existing = await VisitRequest.findById(id).populate(
			"boardingId",
			"ownerId",
		);

		if (!existing) throw new NotFoundError("Visit request not found");

		const boarding = existing.boardingId as typeof existing.boardingId & {
			ownerId?: mongoose.Types.ObjectId;
		};
		if (!boarding || boarding.ownerId?.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this boarding");
		}

		if (existing.status !== VisitRequestStatus.PENDING) {
			throw new BadRequestError("Only PENDING visit requests can be rejected");
		}

		const visitRequest = await VisitRequest.findByIdAndUpdate(
			id,
			{
				status: VisitRequestStatus.REJECTED,
				rejectionReason: reason,
			},
			{ new: true },
		)
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.lean();

		sendSuccess(
			res,
			{
				visitRequest: transformVisitRequestDoc(
					visitRequest as Record<string, unknown>,
				),
			},
			"Visit request rejected",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/v1/visit-requests/:id/cancel  (student)
export async function cancelVisitRequest(
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

		const existing = await VisitRequest.findById(id);

		if (!existing) throw new NotFoundError("Visit request not found");

		if (existing.studentId.toString() !== studentId) {
			throw new ForbiddenError("This is not your visit request");
		}

		if (
			existing.status !== VisitRequestStatus.PENDING &&
			existing.status !== VisitRequestStatus.APPROVED
		) {
			throw new BadRequestError(
				"Only PENDING or APPROVED visit requests can be cancelled",
			);
		}

		const visitRequest = await VisitRequest.findByIdAndUpdate(
			id,
			{ status: VisitRequestStatus.CANCELLED },
			{ new: true },
		)
			.populate("studentId", "firstName lastName email")
			.populate("boardingId", "title slug city district")
			.lean();

		sendSuccess(
			res,
			{
				visitRequest: transformVisitRequestDoc(
					visitRequest as Record<string, unknown>,
				),
			},
			"Visit request cancelled",
		);
	} catch (err) {
		next(err);
	}
}
