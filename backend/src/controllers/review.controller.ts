import type { Request, Response } from "express";
import { reviewService } from "../services/review.service.js";
import { uploadReviewMedia } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  createReviewSchema,
  updateReviewSchema,
  updateReviewCommentSchema,
  reactionSchema,
} from "../schemas/index.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "@/errors/AppError.js";
import { z } from "zod";

// Schema for comment request body (only comment field, reviewId comes from URL)
const commentBodySchema = z.object({
  comment: z.string().min(1, "Comment is required").max(500),
});

/**
 * Review Controller
 * Handles HTTP requests for review operations
 */

// Helper functions to safely get values from Express request (handles string | string[] types)
const getParam = (req: Request, name: string): string => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
};

const getHeader = (req: Request, name: string): string | undefined => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const getQueryParam = (req: Request, name: string): string | undefined => {
  const value = req.query[name] as string | string[] | undefined;
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;
  return undefined;
};

// Helper to safely parse query params (handles ParsedQs objects)
const getQueryParamSafe = (req: Request, name: string): string | undefined => {
  const value = req.query[name] as string | string[] | undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
};

export class ReviewController {
  /**
   * Create a new review
   * POST /api/reviews
   */
  createReview = async (req: Request, res: Response) => {
    try {
      // Parse form data
      const reviewData = JSON.parse(req.body.data || "{}");

      // Validate
      const validatedData = createReviewSchema.parse(reviewData);

      // Get user ID from request (assuming auth middleware sets req.user)
      const studentId = (req as any).user?.id || getHeader(req, "x-user-id");

      if (!studentId) {
        throw new BadRequestError("User ID is required");
      }

      // Get files from multer (using .fields() returns object with arrays)
      const files = (req as any).files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;
      const images = files?.images || [];
      const video = files?.video?.[0];

      // Validate file limits
      if (images.length > 5) {
        throw new BadRequestError("Maximum 5 images allowed");
      }

      // Create review
      const review = await reviewService.createReview(
        studentId,
        validatedData.boardingId,
        validatedData,
        images,
        video,
      );

      res.status(201).json({
        success: true,
        data: review,
        message: "Review created successfully",
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        throw new BadRequestError(
          error.errors[0]?.message || "Validation failed",
        );
      }
      throw error;
    }
  };

  /**
   * Get review by ID
   * GET /api/reviews/:id
   */
  getReview = async (req: Request, res: Response) => {
    const id = getParam(req, "id");

    const review = await reviewService.getReviewById(id);

    if (!review) {
      throw new NotFoundError("Review");
    }

    res.json({
      success: true,
      data: review,
    });
  };

  /**
   * Get reviews by boarding
   * GET /api/boardings/:boardingId/reviews
   */
  getReviewsByBoarding = async (req: Request, res: Response) => {
    const boardingId = getParam(req, "boardingId");

    const result = await reviewService.getReviewsByBoarding(boardingId, {
      page: parseInt(getQueryParamSafe(req, "page") || "1"),
      limit: parseInt(getQueryParamSafe(req, "limit") || "10"),
      sortBy:
        (getQueryParamSafe(req, "sortBy") as "rating" | "commentedAt") ||
        "commentedAt",
      sortOrder:
        (getQueryParamSafe(req, "sortOrder") as "asc" | "desc") || "desc",
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  };

  /**
   * Get review statistics
   * GET /api/boardings/:boardingId/reviews/stats
   */
  getReviewStats = async (req: Request, res: Response) => {
    const boardingId = getParam(req, "boardingId");

    const stats = await reviewService.getReviewStats(boardingId);

    res.json({
      success: true,
      data: stats,
    });
  };

  /**
   * Update a review
   * PUT /api/reviews/:id
   */
  updateReview = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const reviewData = JSON.parse(req.body.data || "{}");

      const validatedData = updateReviewSchema.parse(reviewData);

      const studentId = (req as any).user?.id || getHeader(req, "x-user-id");

      if (!studentId) {
        throw new BadRequestError("User ID is required");
      }

      // Get files from multer (using .fields() returns object with arrays)
      const files = (req as any).files as
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

      res.json({
        success: true,
        data: review,
        message: "Review updated successfully",
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        throw new BadRequestError(
          error.errors[0]?.message || "Validation failed",
        );
      }
      throw error;
    }
  };

  /**
   * Delete a review
   * DELETE /api/reviews/:id
   */
  deleteReview = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const studentId = (req as any).user?.id || getHeader(req, "x-user-id");

    if (!studentId) {
      throw new BadRequestError("User ID is required");
    }

    const result = await reviewService.deleteReview(id, studentId);

    res.json({
      success: true,
      message: result.message,
    });
  };

  /**
   * Add reaction to review
   * POST /api/reviews/:id/reactions
   */
  addReviewReaction = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const { type } = reactionSchema.parse(req.body);

    const userId = (req as any).user?.id || getHeader(req, "x-user-id");

    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const result = await reviewService.addReviewReaction(id, userId, type);

    res.json({
      success: true,
      data: result,
      message: `Review ${result.action === "added" ? "liked" : result.action === "removed" ? "unliked" : "reaction updated"}`,
    });
  };

  /**
   * Create a comment on a review
   * POST /api/reviews/:id/comments
   */
  createReviewComment = async (req: Request, res: Response) => {
    const reviewId = getParam(req, "id");
    const { comment } = commentBodySchema.parse(req.body);

    const commentorId = (req as any).user?.id || getHeader(req, "x-user-id");

    if (!commentorId) {
      throw new BadRequestError("User ID is required");
    }

    const reviewComment = await reviewService.createReviewComment(
      reviewId,
      commentorId,
      { comment },
    );

    res.status(201).json({
      success: true,
      data: reviewComment,
      message: "Comment added successfully",
    });
  };

  /**
   * Update a review comment
   * PUT /api/reviews/comments/:id
   */
  updateReviewComment = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const { comment } = updateReviewCommentSchema.parse(req.body);

    const commentorId = (req as any).user?.id || getHeader(req, "x-user-id");

    if (!commentorId) {
      throw new BadRequestError("User ID is required");
    }

    const reviewComment = await reviewService.updateReviewComment(
      id,
      commentorId,
      { comment },
    );

    res.json({
      success: true,
      data: reviewComment,
      message: "Comment updated successfully",
    });
  };

  /**
   * Delete a review comment
   * DELETE /api/reviews/comments/:id
   */
  deleteReviewComment = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const commentorId = (req as any).user?.id || getHeader(req, "x-user-id");

    if (!commentorId) {
      throw new BadRequestError("User ID is required");
    }

    const result = await reviewService.deleteReviewComment(id, commentorId);

    res.json({
      success: true,
      message: result.message,
    });
  };

  /**
   * Add reaction to review comment
   * POST /api/reviews/comments/:id/reactions
   */
  addReviewCommentReaction = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const { type } = reactionSchema.parse(req.body);

    const userId = (req as any).user?.id || getHeader(req, "x-user-id");

    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const result = await reviewService.addReviewCommentReaction(
      id,
      userId,
      type,
    );

    res.json({
      success: true,
      data: result,
      message: `Comment ${result.action === "added" ? "liked" : result.action === "removed" ? "unliked" : "reaction updated"}`,
    });
  };
}

// Middleware wrapper for multer with error handling
export const withUpload = (fn: Function) => {
  return (req: Request, res: Response, next: Function) => {
    uploadReviewMedia(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: "UploadError",
          message: err.message,
        });
      }
      fn(req, res, next);
    });
  };
};

export const reviewController = new ReviewController();
export default reviewController;
