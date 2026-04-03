import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "@/errors/AppError.js";
import { verifyAccessToken } from "@/lib/jwt.js";
import { sendSuccess } from "@/lib/response.js";
import {
	createReviewSchema,
	reactionSchema,
	updateReviewCommentSchema,
	updateReviewSchema,
} from "@/schemas/index.js";
import { reviewService } from "@/services/review.service.js";

// Schema for comment request body (only comment field, reviewId comes from URL)
const commentBodySchema = z.object({
	comment: z.string().min(1, "Comment is required").max(500),
});

// Helper functions to safely get values from Express request
const getParam = (req: Request, name: string): string => {
	const value = req.params[name];
	return Array.isArray(value) ? value[0] : value;
};

const getHeader = (req: Request, name: string): string | undefined => {
	const value = req.headers[name];
	return Array.isArray(value) ? value[0] : value;
};

const getQueryParamSafe = (req: Request, name: string): string | undefined => {
	const value = req.query[name] as string | string[] | undefined;
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value[0];
	return undefined;
};

const getUserId = (req: Request): string | undefined => {
	const userIdFromAuth = req.user?.userId;
	if (userIdFromAuth) return userIdFromAuth;

	const userIdFromHeader = getHeader(req, "x-user-id");
	if (userIdFromHeader) return userIdFromHeader;

	const authHeader = getHeader(req, "authorization");
	if (!authHeader?.startsWith("Bearer ")) return undefined;

	const token = authHeader.slice(7);

	try {
		return verifyAccessToken(token).userId;
	} catch {
		return undefined;
	}
};

const parseReviewMultipartData = <T extends z.ZodTypeAny>(
	req: Request,
	schema: T,
): z.infer<T> => {
	let parsed: unknown;

	try {
		parsed = JSON.parse(req.body.data || "{}");
	} catch {
		throw new BadRequestError("Invalid JSON in form field 'data'");
	}

	const result = schema.safeParse(parsed);
	if (!result.success) {
		throw new BadRequestError(
			result.error.issues[0]?.message ?? "Validation failed",
		);
	}

	return result.data;
};

const mapReviewServiceError = (error: unknown): never => {
	if (!(error instanceof Error)) throw error;

	switch (error.message) {
		case "Review not found":
			throw new NotFoundError("Review");
		case "Comment not found":
			throw new NotFoundError("Comment");
		case "You can only edit your own reviews":
		case "You can only delete your own reviews":
		case "You can only edit your own comments":
		case "You can only delete your own comments":
			throw new ForbiddenError(error.message);
		case "This review has already been edited and cannot be modified again":
		case "This comment has already been edited and cannot be modified again":
			throw new BadRequestError(error.message);
		default:
			throw error;
	}
};

// POST /api/reviews
export async function createReview(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const validatedData = parseReviewMultipartData(req, createReviewSchema);
		const studentId = getUserId(req);

		if (!studentId) throw new BadRequestError("User ID is required");
		const files = req.files as
			| { [fieldname: string]: Express.Multer.File[] }
			| undefined;
		const images = files?.images || [];
		const video = files?.video?.[0];

		if (images.length > 5) {
			throw new BadRequestError("Maximum 5 images allowed");
		}

		const review = await reviewService.createReview(
			studentId,
			validatedData.boardingId,
			validatedData,
			images,
			video,
		);

		sendSuccess(res, review, "Review created successfully", 201);
	} catch (error) {
		next(error);
	}
}

// GET /api/reviews/:id
export async function getReview(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = getParam(req, "id");
		const review = await reviewService.getReviewById(id);

		if (!review) throw new NotFoundError("Review");

		sendSuccess(res, review);
	} catch (error) {
		next(error);
	}
}

// GET /api/reviews/boarding/:boardingId
export async function getReviewsByBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const boardingId = getParam(req, "boardingId");

		const result = await reviewService.getReviewsByBoarding(boardingId, {
			page: parseInt(getQueryParamSafe(req, "page") || "1", 10),
			limit: parseInt(getQueryParamSafe(req, "limit") || "10", 10),
			sortBy:
				(getQueryParamSafe(req, "sortBy") as "rating" | "commentedAt") ||
				"commentedAt",
			sortOrder:
				(getQueryParamSafe(req, "sortOrder") as "asc" | "desc") || "desc",
		});

		sendSuccess(res, {
			reviews: result.data,
			pagination: result.pagination,
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/reviews/boarding/:boardingId/stats
export async function getReviewStats(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const boardingId = getParam(req, "boardingId");
		const stats = await reviewService.getReviewStats(boardingId);

		sendSuccess(res, stats);
	} catch (error) {
		next(error);
	}
}

// PUT /api/reviews/:id
export async function updateReview(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = getParam(req, "id");
		const validatedData = parseReviewMultipartData(req, updateReviewSchema);
		const studentId = getUserId(req);

		if (!studentId) throw new BadRequestError("User ID is required");

		const files = req.files as
			| { [fieldname: string]: Express.Multer.File[] }
			| undefined;
		const images = files?.images || [];
		const video = files?.video?.[0];

		const review = await reviewService.updateReview(
			id,
			studentId,
			validatedData,
			images,
			video,
		);

		sendSuccess(res, review, "Review updated successfully");
	} catch (error) {
		try {
			mapReviewServiceError(error);
		} catch (mappedError) {
			next(mappedError);
		}
	}
}

// DELETE /api/reviews/:id
export async function deleteReview(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = getParam(req, "id");
		const studentId = getUserId(req);

		if (!studentId) throw new BadRequestError("User ID is required");

		const result = await reviewService.deleteReview(id, studentId);

		sendSuccess(res, null, result.message);
	} catch (error) {
		try {
			mapReviewServiceError(error);
		} catch (mappedError) {
			next(mappedError);
		}
	}
}

// POST /api/reviews/:id/reactions
export async function addReviewReaction(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = getParam(req, "id");
		const { type } = reactionSchema.parse(req.body);
		const userId = getUserId(req);

		if (!userId) throw new BadRequestError("User ID is required");

		const result = await reviewService.addReviewReaction(id, userId, type);

		sendSuccess(
			res,
			result,
			`Review ${result.action === "added" ? "liked" : result.action === "removed" ? "unliked" : "reaction updated"}`,
		);
	} catch (error) {
		try {
			mapReviewServiceError(error);
		} catch (mappedError) {
			next(mappedError);
		}
	}
}

// POST /api/reviews/:id/comments
export async function createReviewComment(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const reviewId = getParam(req, "id");
		const { comment } = commentBodySchema.parse(req.body);
		const commentorId = getUserId(req);

		if (!commentorId) throw new BadRequestError("User ID is required");

		const reviewComment = await reviewService.createReviewComment(
			reviewId,
			commentorId,
			{ comment },
		);

		sendSuccess(res, reviewComment, "Comment added successfully", 201);
	} catch (error) {
		try {
			mapReviewServiceError(error);
		} catch (mappedError) {
			next(mappedError);
		}
	}
}

// PUT /api/reviews/comments/:id
export async function updateReviewComment(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = getParam(req, "id");
		const { comment } = updateReviewCommentSchema.parse(req.body);
		const commentorId = getUserId(req);

		if (!commentorId) throw new BadRequestError("User ID is required");

		const reviewComment = await reviewService.updateReviewComment(
			id,
			commentorId,
			{ comment },
		);

		sendSuccess(res, reviewComment, "Comment updated successfully");
	} catch (error) {
		try {
			mapReviewServiceError(error);
		} catch (mappedError) {
			next(mappedError);
		}
	}
}

// DELETE /api/reviews/comments/:id
export async function deleteReviewComment(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = getParam(req, "id");
		const commentorId = getUserId(req);

		if (!commentorId) throw new BadRequestError("User ID is required");

		const result = await reviewService.deleteReviewComment(id, commentorId);

		sendSuccess(res, null, result.message);
	} catch (error) {
		try {
			mapReviewServiceError(error);
		} catch (mappedError) {
			next(mappedError);
		}
	}
}

// POST /api/reviews/comments/:id/reactions
export async function addReviewCommentReaction(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = getParam(req, "id");
		const { type } = reactionSchema.parse(req.body);
		const userId = getUserId(req);

		if (!userId) throw new BadRequestError("User ID is required");

		const result = await reviewService.addReviewCommentReaction(
			id,
			userId,
			type,
		);

		sendSuccess(
			res,
			result,
			`Comment ${result.action === "added" ? "liked" : result.action === "removed" ? "unliked" : "reaction updated"}`,
		);
	} catch (error) {
		try {
			mapReviewServiceError(error);
		} catch (mappedError) {
			next(mappedError);
		}
	}
}
