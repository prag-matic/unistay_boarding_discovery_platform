import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	BoardingNotFoundError,
	InvalidStateTransitionError,
	UserNotFoundError,
} from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding, User } from "@/models/index.js";
import type { RejectBoardingInput } from "@/schemas/boarding.validators.js";
import type { AdminListUsersQuery } from "@/schemas/user.validators.js";
import { BoardingStatus } from "@/types/enums.js";
import { addId, transformBoardingDoc } from "@/utils/index.js";

// GET /api/v1/admin/users
export async function listUsers(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, role, active } =
			req.query as unknown as AdminListUsersQuery;

		const query: Record<string, unknown> = {};
		if (role !== undefined) query.role = role;
		if (active !== undefined) query.isActive = active;

		const [users, total] = await Promise.all([
			User.find(query)
				.select("-passwordHash")
				.skip((page - 1) * size)
				.limit(size)
				.sort({ createdAt: -1 })
				.lean(),

			User.countDocuments(query),
		]);

		sendSuccess(res, {
			users: (users as Record<string, unknown>[]).map(addId),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/users/:id
export async function getUserById(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id as string;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			throw new UserNotFoundError();
		}

		const user = await User.findById(id).select("-passwordHash").lean();

		if (!user) throw new UserNotFoundError();

		sendSuccess(res, addId(user as Record<string, unknown>));
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/users/:id/activate
export async function activateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id as string;

		const existing = await User.findById(id);

		if (!existing) throw new UserNotFoundError();

		const user = await User.findByIdAndUpdate(
			id,
			{ isActive: true },
			{ new: true },
		).lean();

		if (!user) throw new UserNotFoundError();

		sendSuccess(
			res,
			{ id: user._id.toString(), isActive: user.isActive },
			"User activated successfully",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/admin/users/:id/deactivate
export async function deactivateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id as string;

		const existing = await User.findById(id);

		if (!existing) throw new UserNotFoundError();

		const user = await User.findByIdAndUpdate(
			id,
			{ isActive: false },
			{ new: true },
		).lean();

		if (!user) throw new UserNotFoundError();

		sendSuccess(
			res,
			{ id: user._id.toString(), isActive: user.isActive },
			"User deactivated successfully",
		);
	} catch (err) {
		next(err);
	}
}

// GET /api/admin/boardings/pending
export async function listPendingBoardings(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const boardings = await Boarding.find({
			status: BoardingStatus.PENDING_APPROVAL,
			isDeleted: false,
		})
			.populate("ownerId", "firstName lastName phone")
			.populate({
				path: "images",
				select: "id url publicId createdAt",
			})
			.populate({
				path: "amenities",
				select: "id name createdAt",
			})
			.populate({
				path: "rules",
				select: "id rule",
			})
			.sort({ updatedAt: 1 })
			.lean();

		sendSuccess(res, {
			boardings: (boardings as Record<string, unknown>[]).map(
				transformBoardingDoc,
			),
		});
	} catch (err) {
		next(err);
	}
}

// PATCH /api/admin/boardings/:id/approve
export async function approveBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
			throw new InvalidStateTransitionError(
				"Only PENDING_APPROVAL listings can be approved",
			);
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{ status: BoardingStatus.ACTIVE, rejectionReason: null },
			{ new: true },
		)
			.select("id status title updatedAt")
			.lean();

		sendSuccess(
			res,
			{ boarding: addId(boarding as Record<string, unknown>) },
			"Boarding approved successfully",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/admin/boardings/:id/reject
export async function rejectBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const { reason } = req.body as RejectBoardingInput;

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
			throw new InvalidStateTransitionError(
				"Only PENDING_APPROVAL listings can be rejected",
			);
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{
				status: BoardingStatus.REJECTED,
				rejectionReason: reason,
			},
			{ new: true },
		)
			.select("id status title rejectionReason updatedAt")
			.lean();

		sendSuccess(
			res,
			{ boarding: addId(boarding as Record<string, unknown>) },
			"Boarding rejected successfully",
		);
	} catch (err) {
		next(err);
	}
}
