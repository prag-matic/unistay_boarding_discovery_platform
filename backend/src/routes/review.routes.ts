import { Router } from "express";
import {
  createReview,
  getReview,
  updateReview,
  deleteReview,
  addReviewReaction,
  getReviewsByBoarding,
  getReviewStats,
  createReviewComment,
  updateReviewComment,
  deleteReviewComment,
  addReviewCommentReaction,
} from "../controllers/review.controller.js";
import {
  uploadReviewMedia,
  validateReviewFiles,
} from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  updateReviewCommentSchema,
  reactionSchema,
} from "../schemas/index.js";

const router = Router();

/**
 * Review Routes
 *
 * All routes require user authentication (user ID passed via x-user-id header)
 * In production, use the auth middleware instead
 */

// Create review (with file upload)
router.post(
  "/",
  uploadReviewMedia,
  validateReviewFiles,
  createReview,
);

// Get review by ID
router.get("/:id", getReview);

// Update review (with file upload)
router.put(
  "/:id",
  uploadReviewMedia,
  validateReviewFiles,
  updateReview,
);

// Delete review
router.delete("/:id", deleteReview);

// Add reaction to review
router.post(
  "/:id/reactions",
  validate(reactionSchema, "body"),
  addReviewReaction,
);

// Get reviews by boarding (separate route for boarding-specific queries)
router.get("/boarding/:boardingId", getReviewsByBoarding);

// Get review statistics for boarding
router.get("/boarding/:boardingId/stats", getReviewStats);

// Create comment on review (validation done in controller with commentBodySchema)
router.post("/:id/comments", createReviewComment);

// Update comment
router.put(
  "/comments/:id",
  validate(updateReviewCommentSchema, "body"),
  updateReviewComment,
);

// Delete comment
router.delete("/comments/:id", deleteReviewComment);

// Add reaction to comment
router.post(
  "/comments/:id/reactions",
  validate(reactionSchema, "body"),
  addReviewCommentReaction,
);

export default router;
