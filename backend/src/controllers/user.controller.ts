import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { config } from "@/config/env.js";

import {
	InvalidCredentialsError,
	UnauthorizedError,
	UserNotFoundError,
	ValidationError,
} from "@/errors/AppError.js";
import { uploadProfileImage } from "@/lib/cloudinary.js";
import { sendSuccess } from "@/lib/response.js";
import { User } from "@/models/index.js";
import type { UpdateUserInput } from "@/schemas/index.js";
import type { ChangePasswordInput } from "@/schemas/user.validators.js";
import { addId } from "@/utils/index.js";

function sanitizeUser(user: unknown) {
	if (!user || typeof user !== "object") return {};
	const obj = user as Record<string, unknown>;
	const { passwordHash: _, ...safeUser } = obj;
	return safeUser;
}

// GET /api/users/me
export async function getMe(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const user = await User.findById(req.user.userId).lean();

		if (!user) throw new UserNotFoundError();

		sendSuccess(res, sanitizeUser(addId(user as Record<string, unknown>)));
	} catch (error) {
		next(error);
	}
}

// PUT /api/users/me
export async function updateMe(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const body = req.body as UpdateUserInput;

		const user = await User.findByIdAndUpdate(
			req.user.userId,
			{
				...(body.firstName !== undefined && { firstName: body.firstName }),
				...(body.lastName !== undefined && { lastName: body.lastName }),
				...(body.phone !== undefined && { phone: body.phone }),
				...(body.university !== undefined && { university: body.university }),
				...(body.nicNumber !== undefined && { nicNumber: body.nicNumber }),
			},
			{ new: true },
		).lean();

		sendSuccess(
			res,
			sanitizeUser(addId(user as Record<string, unknown>)),
			"Profile Updated Successfully",
		);
	} catch (error) {
		next(error);
	}
}

// PUT /api/users/me/password
export async function changePassword(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const { currentPassword, newPassword } = req.body as ChangePasswordInput;

		const user = await User.findById(req.user.userId);

		if (!user) throw new UserNotFoundError();

		const match = await bcrypt.compare(currentPassword, user.passwordHash);
		if (!match)
			throw new InvalidCredentialsError("Current password is incorrect");

		const newPasswordHash = await bcrypt.hash(newPassword, config.saltRounds);

		await User.findByIdAndUpdate(req.user.userId, {
			passwordHash: newPasswordHash,
		});

		sendSuccess(res, null, "Password Changed Successfully");
	} catch (error) {
		next(error);
	}
}

// PUT /api/users/me/profile-image
export async function uploadProfileImageHandler(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();
		if (!req.file)
			throw new ValidationError("Validation Error", "No Image File Provided");

		const imageUrl = await uploadProfileImage(
			req.file.buffer,
			req.file.mimetype,
		);

		const user = await User.findByIdAndUpdate(
			req.user.userId,
			{ profileImageUrl: imageUrl },
			{ new: true },
		).lean();

		if (!user) throw new UserNotFoundError();

		sendSuccess(
			res,
			{ profileImageUrl: user.profileImageUrl },
			"Profile image updated",
		);
	} catch (error) {
		next(error);
	}
}
