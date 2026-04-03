import type { Router } from "express";
import { Router as createRouter } from "express";
import {
	addReviewCommentReaction,
	addReviewReaction,
	createReview,
	createReviewComment,
	deleteReview,
	deleteReviewComment,
	getReview,
	getReviewStats,
	getReviewsByBoarding,
	updateReview,
	updateReviewComment,
} from "../controllers/review.controller.js";
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
	createReview,
);

// Get review by ID
router.get("/:id", getReview);

// Update review (with file upload) - only the student who created it
router.put(
	"/:id",
	authenticate,
	requireRole("STUDENT"),
	uploadReviewMedia,
	validateReviewFiles,
	updateReview,
);

// Delete review
router.delete("/:id", authenticate, deleteReview);

// Add reaction to review - requires authentication
router.post(
	"/:id/reactions",
	authenticate,
	requireRole("STUDENT"),
	validate(reactionSchema, "body"),
	addReviewReaction,
);

// Get reviews by boarding (separate route for boarding-specific queries)
router.get("/boarding/:boardingId", getReviewsByBoarding);

// Get review statistics for boarding
router.get("/boarding/:boardingId/stats", getReviewStats);

// Create comment on review (validation done in controller with commentBodySchema)
router.post("/:id/comments", authenticate, createReviewComment);

// Update comment
router.put(
	"/comments/:id",
	requireRole("STUDENT"),
	validate(updateReviewCommentSchema, "body"),
	updateReviewComment,
);

// Delete comment
router.delete("/comments/:id", deleteReviewComment);

// Delete comment - only the user who created it
router.delete("/comments/:id", authenticate, deleteReviewComment);

// Add reaction to comment - requires authentication
router.post(
	"/comments/:id/reactions",
	validate(reactionSchema, "body"),
	addReviewCommentReaction,
);

export default router;
