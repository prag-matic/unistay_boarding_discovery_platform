import type { Router } from "express";
import { Router as createRouter } from "express";
import { reviewController } from "../controllers/review.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
	uploadReviewMedia,
	validateReviewFiles,
} from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { reactionSchema, updateReviewCommentSchema } from "../schemas/index.js";

const router: Router = createRouter();

/**
 * Review Routes
 *
 * All routes require user authentication
 */

// Create review (with file upload) - requires STUDENT role
router.post(
	"/",
	authenticate,
	requireRole("STUDENT"),
	uploadReviewMedia,
	validateReviewFiles,
	reviewController.createReview,
);

// Get review by ID (public)
router.get("/:id", reviewController.getReview);

// Update review (with file upload) - only the student who created it
router.put(
	"/:id",
	authenticate,
	requireRole("STUDENT"),
	uploadReviewMedia,
	validateReviewFiles,
	reviewController.updateReview,
);

// Delete review - only the student who created it
router.delete(
	"/:id",
	authenticate,
	requireRole("STUDENT"),
	reviewController.deleteReview,
);

// Add reaction to review - requires authentication
router.post(
	"/:id/reactions",
	authenticate,
	validate(reactionSchema, "body"),
	reviewController.addReviewReaction,
);

// Get reviews by boarding (separate route for boarding-specific queries) - public
router.get("/boarding/:boardingId", reviewController.getReviewsByBoarding);

// Get review statistics for boarding - public
router.get("/boarding/:boardingId/stats", reviewController.getReviewStats);

// Create comment on review - requires authentication
router.post(
	"/:id/comments",
	authenticate,
	reviewController.createReviewComment,
);

// Update comment - only the user who created it
router.put(
	"/comments/:id",
	authenticate,
	validate(updateReviewCommentSchema, "body"),
	reviewController.updateReviewComment,
);

// Delete comment - only the user who created it
router.delete(
	"/comments/:id",
	authenticate,
	reviewController.deleteReviewComment,
);

// Add reaction to comment - requires authentication
router.post(
	"/comments/:id/reactions",
	authenticate,
	validate(reactionSchema, "body"),
	reviewController.addReviewCommentReaction,
);

export default router;
