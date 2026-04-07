import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	BoardingNotFoundError,
	UserNotFoundError,
} from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding, User } from "@/models/index.js";
import type {
	ModerationNoteInput,
	RejectBoardingInput,
} from "@/schemas/boarding.validators.js";
import type { AdminListUsersQuery } from "@/schemas/user.validators.js";
import { BoardingStatus } from "@/types/enums.js";
import { addId, transformBoardingDoc } from "@/utils/index.js";
import { boardingWorkflowService } from "@/services/boardingWorkflow.service.js";

// GET /api/admin/users
export async function listUsers(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, role, active, search } =
			req.query as unknown as AdminListUsersQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters = {
			...(role !== undefined ? { role } : {}),
			...(active !== undefined ? { isActive: active } : {}),
			...(searchRegex
				? {
						$or: [
							{ firstName: searchRegex },
							{ lastName: searchRegex },
							{ email: searchRegex },
							{ phone: searchRegex },
						],
					}
				: {}),
		};

		const [users, total] = await Promise.all([
			User.find(filters)
				.select("-passwordHash")
				.skip((page - 1) * size)
				.limit(size)
				.sort({ createdAt: -1 })
				.lean(),

			User.countDocuments(filters),
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
		if (!req.user?.userId) {
			throw new UserNotFoundError("Admin user context missing");
		}
		const { id } = req.params as { id: string };
		const note = (req.body as ModerationNoteInput | undefined)?.note;

		await boardingWorkflowService.approve(id, req.user.userId, note);
		const boarding = await Boarding.findById(id)
			.select("id status title updatedAt")
			.lean();
		if (!boarding) throw new BoardingNotFoundError();

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
		if (!req.user?.userId) {
			throw new UserNotFoundError("Admin user context missing");
		}
		const { id } = req.params as { id: string };
		const { reason, note } = req.body as RejectBoardingInput & ModerationNoteInput;

		await boardingWorkflowService.reject(id, req.user.userId, reason, note);

		const boarding = await Boarding.findById(id)
			.select("id status title rejectionReason updatedAt")
			.lean();
		if (!boarding) throw new BoardingNotFoundError();

		sendSuccess(
			res,
			{ boarding: addId(boarding as Record<string, unknown>) },
			"Boarding rejected successfully",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/admin/boardings/:id/reopen
export async function reopenBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new UserNotFoundError("Admin user context missing");
		}
		const { id } = req.params as { id: string };
		const { note } = req.body as ModerationNoteInput;

		await boardingWorkflowService.reopen(id, req.user.userId, note);

		const boarding = await Boarding.findById(id)
			.select("id status title updatedAt")
			.lean();
		if (!boarding) throw new BoardingNotFoundError();

		sendSuccess(
			res,
			{ boarding: addId(boarding as Record<string, unknown>) },
			"Boarding reopened successfully",
		);
	} catch (err) {
		next(err);
	}
}
