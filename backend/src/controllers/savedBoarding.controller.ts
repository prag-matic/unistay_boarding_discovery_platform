import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { BoardingNotFoundError, ValidationError } from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding, SavedBoarding } from "@/models/index.js";
import { BoardingStatus } from "@/types/enums.js";

// POST /api/v1/saved-boardings/:boardingId  (student)
export async function saveBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { boardingId } = req.params as { boardingId: string };
		const studentId = req.user?.userId;

		const boarding = await Boarding.findById(boardingId);

		if (
			!boarding ||
			boarding.isDeleted ||
			boarding.status !== BoardingStatus.ACTIVE
		) {
			throw new BoardingNotFoundError();
		}

		const existing = await SavedBoarding.findOne({
			boardingId: new mongoose.Types.ObjectId(boardingId),
			studentId: new mongoose.Types.ObjectId(studentId),
		});

		if (existing) {
			throw new ValidationError("Boarding is already saved");
		}

		const saved = await SavedBoarding.create({
			boardingId: new mongoose.Types.ObjectId(boardingId),
			studentId: new mongoose.Types.ObjectId(studentId),
		});

		sendSuccess(res, { saved }, "Boarding saved successfully", 201);
	} catch (err) {
		next(err);
	}
}

// DELETE /api/v1/saved-boardings/:boardingId  (student)
export async function unsaveBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { boardingId } = req.params as { boardingId: string };
		const studentId = req.user?.userId;

		const existing = await SavedBoarding.findOne({
			boardingId: new mongoose.Types.ObjectId(boardingId),
			studentId: new mongoose.Types.ObjectId(studentId),
		});

		if (!existing) {
			throw new BoardingNotFoundError("Saved boarding not found");
		}

		await SavedBoarding.findByIdAndDelete(existing._id);

		sendSuccess(res, null, "Boarding unsaved successfully");
	} catch (err) {
		next(err);
	}
}

// GET /api/v1/saved-boardings  (student)
export async function getSavedBoardings(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const studentId = req.user?.userId;

		const saved = await SavedBoarding.find({
			studentId: new mongoose.Types.ObjectId(studentId),
		})
			.populate({
				path: "boardingId",
				populate: [
					{ path: "ownerId", select: "firstName lastName phone" },
					{ path: "images", select: "id url publicId createdAt" },
					{ path: "amenities", select: "id name createdAt" },
					{ path: "rules", select: "id rule" },
				],
			})
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, { saved });
	} catch (err) {
		next(err);
	}
}
