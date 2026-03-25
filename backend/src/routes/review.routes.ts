import { Router } from "express";
import {
  reviewController,
  withUpload,
} from "../controllers/review.controller.js";
import {
  uploadReviewMedia,
  validateReviewFiles,
} from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  createReviewSchema,
  updateReviewSchema,
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
  reviewController.createReview,
);

// Get review by ID
router.get("/:id", reviewController.getReview);

// Update review (with file upload)
router.put(
  "/:id",
  uploadReviewMedia,
  validateReviewFiles,
  reviewController.updateReview,
);

// Delete review
router.delete("/:id", reviewController.deleteReview);

// Add reaction to review
router.post(
  "/:id/reactions",
  validate(reactionSchema, "body"),
  reviewController.addReviewReaction,
);

// Get reviews by boarding (separate route for boarding-specific queries)
router.get("/boarding/:boardingId", reviewController.getReviewsByBoarding);

// Get review statistics for boarding
router.get("/boarding/:boardingId/stats", reviewController.getReviewStats);

// Create comment on review (validation done in controller with commentBodySchema)
router.post("/:id/comments", reviewController.createReviewComment);

// Update comment
router.put(
  "/comments/:id",
  validate(updateReviewCommentSchema, "body"),
  reviewController.updateReviewComment,
);

// Delete comment
router.delete("/comments/:id", reviewController.deleteReviewComment);

// Add reaction to comment
router.post(
  "/comments/:id/reactions",
  validate(reactionSchema, "body"),
  reviewController.addReviewCommentReaction,
);

export default router;
