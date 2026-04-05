import mongoose from "mongoose";
import {
	Review,
	ReviewComment,
	ReviewCommentReaction,
	ReviewReaction,
} from "@/models/index.js";
import {
	deleteCloudinaryAsset,
	uploadReviewImage,
	uploadReviewVideo,
} from "@/lib/cloudinary.js";
import type {
	CreateReviewCommentInput,
	CreateReviewInput,
	UpdateReviewCommentInput,
	UpdateReviewInput,
} from "../schemas/index.js";

/**
 * Review Service
 * Handles all review-related business logic
 */

/**
 * Extracts the Cloudinary public_id from a Cloudinary secure URL.
 * e.g. https://res.cloudinary.com/cloud/image/upload/v123/folder/file.jpg → folder/file
 */
function extractCloudinaryPublicId(url: string): string {
	const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
	return match?.[1] ?? "";
}

export class ReviewService {
	/**
	 * Create a new review
	 */
	async createReview(
		studentId: string,
		boardingId: string,
		data: CreateReviewInput,
		images?: Express.Multer.File[],
		video?: Express.Multer.File,
	) {
		// Upload images to Cloudinary
		const imagePaths: string[] = [];
		if (images && images.length > 0) {
			for (const image of images) {
				const result = await uploadReviewImage(
					image.buffer,
					image.mimetype,
					boardingId,
				);
				imagePaths.push(result.url);
			}
		}

		// Upload video to Cloudinary
		let videoPath: string | null = null;
		if (video) {
			const result = await uploadReviewVideo(video.buffer, boardingId);
			videoPath = result.url;
		}

		// Create review in database
		const review = await Review.create({
			boardingId: new mongoose.Types.ObjectId(boardingId),
			studentId: new mongoose.Types.ObjectId(studentId),
			rating: data.rating,
			comment: data.comment ?? null,
			images: imagePaths,
			video: videoPath ?? null,
		});

		const populatedReview = await Review.findById(review._id)
			.populate("boardingId", "id title boardingType address city")
			.populate("studentId", "id firstName lastName email")
			.lean({ virtuals: true });

		return populatedReview;
	}

	/**
	 * Get a review by ID
	 */
	async getReviewById(reviewId: string) {
		if (!mongoose.Types.ObjectId.isValid(reviewId)) {
			return null;
		}

		const review = await Review.findById(reviewId)
			.populate({
				path: "boardingId",
				select: "id title boardingType address city",
			})
			.populate({
				path: "studentId",
				select: "id firstName lastName email",
			})
			.populate({
				path: "comments",
				populate: {
					path: "commentorId",
					select: "id firstName lastName email",
				},
				options: { sort: { commentedAt: 1 } },
			})
			.lean({ virtuals: true });

		return review;
	}

	/**
	 * Get all reviews for a boarding
	 */
	async getReviewsByBoarding(
		boardingId: string,
		options?: {
			page?: number;
			limit?: number;
			sortBy?: "rating" | "commentedAt";
			sortOrder?: "asc" | "desc";
		},
	) {
		const {
			page = 1,
			limit = 10,
			sortBy = "commentedAt",
			sortOrder = "desc",
		} = options ?? {};

		const skip = (page - 1) * limit;

		const [reviews, total] = await Promise.all([
			Review.find({ boardingId: new mongoose.Types.ObjectId(boardingId) })
				.populate({
					path: "studentId",
					select: "id firstName lastName email",
				})
				.populate({
					path: "comments",
					populate: {
						path: "commentorId",
						select: "id firstName lastName email",
					},
					options: { limit: 5 },
				})
				.sort({ [sortBy]: sortOrder })
				.skip(skip)
				.limit(limit)
				.lean({ virtuals: true }),

			Review.countDocuments({
				boardingId: new mongoose.Types.ObjectId(boardingId),
			}),
		]);

		return {
			data: reviews,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Get all reviews written by a specific student
	 */
	async getMyReviews(
		studentId: string,
		options?: {
			page?: number;
			limit?: number;
			sortBy?: "rating" | "commentedAt";
			sortOrder?: "asc" | "desc";
		},
	) {
		const {
			page = 1,
			limit = 10,
			sortBy = "commentedAt",
			sortOrder = "desc",
		} = options ?? {};

		const skip = (page - 1) * limit;

		const [reviews, total] = await Promise.all([
			Review.find({ studentId: new mongoose.Types.ObjectId(studentId) })
				.populate({
					path: "boardingId",
					select: "id title boardingType address city",
				})
				.sort({ [sortBy]: sortOrder })
				.skip(skip)
				.limit(limit)
				.lean({ virtuals: true }),

			Review.countDocuments({
				studentId: new mongoose.Types.ObjectId(studentId),
			}),
		]);

		return {
			data: reviews,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Get all reviews for boardings owned by a specific user
	 */
	async getMyBoardingReviews(
		ownerId: string,
		options?: {
			page?: number;
			limit?: number;
			sortBy?: "rating" | "commentedAt";
			sortOrder?: "asc" | "desc";
		},
	) {
		const {
			page = 1,
			limit = 10,
			sortBy = "commentedAt",
			sortOrder = "desc",
		} = options ?? {};

		const skip = (page - 1) * limit;

		// Find all boardings owned by this user
		const { Boarding } = await import("@/models/index.js");
		const boardingIds = await Boarding.find({
			ownerId: new mongoose.Types.ObjectId(ownerId),
		})
			.select("_id")
			.lean();

		const ids = boardingIds.map((b) => b._id);

		const [reviews, total] = await Promise.all([
			Review.find({ boardingId: { $in: ids } })
				.populate({
					path: "boardingId",
					select: "id title boardingType address city",
				})
				.populate({
					path: "studentId",
					select: "id firstName lastName email",
				})
				.sort({ [sortBy]: sortOrder })
				.skip(skip)
				.limit(limit)
				.lean({ virtuals: true }),

			Review.countDocuments({ boardingId: { $in: ids } }),
		]);

		return {
			data: reviews,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Update a review (one-time edit only)
	 */
	async updateReview(
		reviewId: string,
		studentId: string,
		data: UpdateReviewInput,
		images?: Express.Multer.File[],
		video?: Express.Multer.File,
	) {
		if (!mongoose.Types.ObjectId.isValid(reviewId)) {
			throw new Error("Review not found");
		}

		const existingReview = await Review.findById(reviewId);

		if (!existingReview) {
			throw new Error("Review not found");
		}

		if (existingReview.studentId.toString() !== studentId) {
			throw new Error("You can only edit your own reviews");
		}

		if (existingReview.editedAt) {
			throw new Error(
				"This review has already been edited and cannot be modified again",
			);
		}

		// Upload new images if provided
		let imagePaths: string[] = existingReview.images;
		if (images && images.length > 0) {
			// Delete old images from Cloudinary
			for (const oldUrl of existingReview.images) {
				try {
					const publicId = extractCloudinaryPublicId(oldUrl);
					if (publicId) await deleteCloudinaryAsset(publicId, "image");
				} catch {
					// Ignore delete errors
				}
			}

			// Upload new images to Cloudinary
			imagePaths = [];
			for (const image of images) {
				const result = await uploadReviewImage(
					image.buffer,
					image.mimetype,
					existingReview.boardingId.toString(),
				);
				imagePaths.push(result.url);
			}
		}

		// Upload new video if provided
		let videoPath: string | null = existingReview.video || null;
		if (video) {
			// Delete old video from Cloudinary
			if (existingReview.video) {
				try {
					const publicId = extractCloudinaryPublicId(existingReview.video);
					if (publicId) await deleteCloudinaryAsset(publicId, "video");
				} catch {
					// Ignore delete errors
				}
			}

			// Upload new video to Cloudinary
			const result = await uploadReviewVideo(
				video.buffer,
				existingReview.boardingId.toString(),
			);
			videoPath = result.url;
		}

		// Update review
		const review = await Review.findByIdAndUpdate(
			reviewId,
			{
				...(data.rating !== undefined && { rating: data.rating }),
				...(data.comment !== undefined && { comment: data.comment }),
				...(images && { images: imagePaths }),
				...(video && { video: videoPath }),
				editedAt: new Date(),
			},
			{ new: true },
		)
			.populate("boardingId")
			.populate("studentId", "id firstName lastName email")
			.lean({ virtuals: true });

		return review;
	}

	/**
	 * Delete a review
	 */
	async deleteReview(reviewId: string, studentId: string) {
		if (!mongoose.Types.ObjectId.isValid(reviewId)) {
			throw new Error("Review not found");
		}

		const existingReview = await Review.findById(reviewId);

		if (!existingReview) {
			throw new Error("Review not found");
		}

		if (existingReview.studentId.toString() !== studentId) {
			throw new Error("You can only delete your own reviews");
		}

		// Delete images from Cloudinary
		for (const imageUrl of existingReview.images) {
			try {
				const publicId = extractCloudinaryPublicId(imageUrl);
				if (publicId) await deleteCloudinaryAsset(publicId, "image");
			} catch {
				// Ignore delete errors
			}
		}

		// Delete video from Cloudinary
		if (existingReview.video) {
			try {
				const publicId = extractCloudinaryPublicId(existingReview.video);
				if (publicId) await deleteCloudinaryAsset(publicId, "video");
			} catch {
				// Ignore delete errors
			}
		}

		// Delete review from database (cascade will delete comments and reactions)
		await Review.findByIdAndDelete(reviewId);

		return { success: true, message: "Review deleted successfully" };
	}

	/**
	 * Add a reaction (like/dislike) to a review
	 */
	async addReviewReaction(
		reviewId: string,
		userId: string,
		type: "LIKE" | "DISLIKE",
	) {
		if (!mongoose.Types.ObjectId.isValid(reviewId)) {
			throw new Error("Review not found");
		}

		const review = await Review.findById(reviewId);

		if (!review) {
			throw new Error("Review not found");
		}

		const existingReaction = await ReviewReaction.findOne({
			reviewId: new mongoose.Types.ObjectId(reviewId),
			userId: new mongoose.Types.ObjectId(userId),
		});

		if (existingReaction) {
			if (existingReaction.type === type) {
				await ReviewReaction.findByIdAndDelete(existingReaction._id);

				await Review.findByIdAndUpdate(reviewId, {
					$inc: {
						[type === "LIKE" ? "likeCount" : "dislikeCount"]: -1,
					},
				});

				return { action: "removed", type };
			} else {
				await ReviewReaction.findByIdAndUpdate(existingReaction._id, { type });

				await Review.findByIdAndUpdate(reviewId, {
					$inc: {
						likeCount: type === "LIKE" ? 1 : -1,
						dislikeCount: type === "DISLIKE" ? 1 : -1,
					},
				});

				return { action: "changed", type };
			}
		}

		await ReviewReaction.create({
			reviewId: new mongoose.Types.ObjectId(reviewId),
			userId: new mongoose.Types.ObjectId(userId),
			type,
		});

		await Review.findByIdAndUpdate(reviewId, {
			$inc: {
				[type === "LIKE" ? "likeCount" : "dislikeCount"]: 1,
			},
		});

		return { action: "added", type };
	}

	/**
	 * Create a comment on a review
	 */
	async createReviewComment(
		reviewId: string,
		commentorId: string,
		data: CreateReviewCommentInput,
	) {
		if (!mongoose.Types.ObjectId.isValid(reviewId)) {
			throw new Error("Review not found");
		}

		const comment = await ReviewComment.create({
			reviewId: new mongoose.Types.ObjectId(reviewId),
			commentorId: new mongoose.Types.ObjectId(commentorId),
			comment: data.comment,
		});

		const populatedComment = await ReviewComment.findById(comment._id)
			.populate("commentorId", "id firstName lastName email")
			.populate("reviewId", "id boardingId")
			.lean({ virtuals: true });

		return populatedComment;
	}

	/**
	 * Update a review comment (one-time edit only)
	 */
	async updateReviewComment(
		commentId: string,
		commentorId: string,
		data: UpdateReviewCommentInput,
	) {
		if (!mongoose.Types.ObjectId.isValid(commentId)) {
			throw new Error("Comment not found");
		}

		const existingComment = await ReviewComment.findById(commentId);

		if (!existingComment) {
			throw new Error("Comment not found");
		}

		if (existingComment.commentorId.toString() !== commentorId) {
			throw new Error("You can only edit your own comments");
		}

		if (existingComment.editedAt) {
			throw new Error(
				"This comment has already been edited and cannot be modified again",
			);
		}

		const comment = await ReviewComment.findByIdAndUpdate(
			commentId,
			{
				comment: data.comment,
				editedAt: new Date(),
			},
			{ new: true },
		)
			.populate("commentorId", "id firstName lastName email")
			.lean({ virtuals: true });

		return comment;
	}

	/**
	 * Delete a review comment
	 */
	async deleteReviewComment(commentId: string, commentorId: string) {
		if (!mongoose.Types.ObjectId.isValid(commentId)) {
			throw new Error("Comment not found");
		}

		const existingComment = await ReviewComment.findById(commentId);

		if (!existingComment) {
			throw new Error("Comment not found");
		}

		if (existingComment.commentorId.toString() !== commentorId) {
			throw new Error("You can only delete your own comments");
		}

		await ReviewComment.findByIdAndDelete(commentId);

		return { success: true, message: "Comment deleted successfully" };
	}

	/**
	 * Add a reaction to a review comment
	 */
	async addReviewCommentReaction(
		commentId: string,
		userId: string,
		type: "LIKE" | "DISLIKE",
	) {
		if (!mongoose.Types.ObjectId.isValid(commentId)) {
			throw new Error("Comment not found");
		}

		const comment = await ReviewComment.findById(commentId);

		if (!comment) {
			throw new Error("Comment not found");
		}

		const existingReaction = await ReviewCommentReaction.findOne({
			reviewCommentId: new mongoose.Types.ObjectId(commentId),
			userId: new mongoose.Types.ObjectId(userId),
		});

		if (existingReaction) {
			if (existingReaction.type === type) {
				await ReviewCommentReaction.findByIdAndDelete(existingReaction._id);

				await ReviewComment.findByIdAndUpdate(commentId, {
					$inc: {
						[type === "LIKE" ? "likeCount" : "dislikeCount"]: -1,
					},
				});

				return { action: "removed", type };
			} else {
				await ReviewCommentReaction.findByIdAndUpdate(existingReaction._id, {
					type,
				});

				await ReviewComment.findByIdAndUpdate(commentId, {
					$inc: {
						likeCount: type === "LIKE" ? 1 : -1,
						dislikeCount: type === "DISLIKE" ? 1 : -1,
					},
				});

				return { action: "changed", type };
			}
		}

		await ReviewCommentReaction.create({
			reviewCommentId: new mongoose.Types.ObjectId(commentId),
			userId: new mongoose.Types.ObjectId(userId),
			type,
		});

		await ReviewComment.findByIdAndUpdate(commentId, {
			$inc: {
				[type === "LIKE" ? "likeCount" : "dislikeCount"]: 1,
			},
		});

		return { action: "added", type };
	}

	/**
	 * Get review statistics for a boarding
	 */
	async getReviewStats(boardingId: string) {
		const reviews = await Review.find({
			boardingId: new mongoose.Types.ObjectId(boardingId),
		})
			.select("rating")
			.lean({ virtuals: true });

		const totalReviews = reviews.length;
		const averageRating =
			totalReviews > 0
				? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
				: 0;

		const ratingDistribution = {
			5: reviews.filter((r) => r.rating === 5).length,
			4: reviews.filter((r) => r.rating === 4).length,
			3: reviews.filter((r) => r.rating === 3).length,
			2: reviews.filter((r) => r.rating === 2).length,
			1: reviews.filter((r) => r.rating === 1).length,
		};

		return {
			totalReviews,
			averageRating: Math.round(averageRating * 10) / 10,
			ratingDistribution,
		};
	}
}

export const reviewService = new ReviewService();
export default reviewService;
