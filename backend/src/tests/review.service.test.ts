import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewService } from "@/services/review.service.js";

vi.mock("@/lib/prisma.js", () => {
	const db = {
		review: {
			create: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			count: vi.fn(),
		},
		reviewReaction: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		reviewComment: {
			create: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		reviewCommentReaction: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	};
	return { default: db, prisma: db };
});

vi.mock("@/lib/cloudinary.js", () => ({
	uploadReviewImage: vi.fn(),
	uploadReviewVideo: vi.fn(),
	deleteCloudinaryAsset: vi.fn(),
}));

import {
	deleteCloudinaryAsset,
	uploadReviewImage,
	uploadReviewVideo,
} from "@/lib/cloudinary.js";
import prisma from "@/lib/prisma.js";

const db = prisma as any;
const mockUploadImage = uploadReviewImage as ReturnType<typeof vi.fn>;
const mockUploadVideo = uploadReviewVideo as ReturnType<typeof vi.fn>;
const mockDeleteAsset = deleteCloudinaryAsset as ReturnType<typeof vi.fn>;

const review = (o: Record<string, unknown> = {}) => ({
	id: "r1",
	boardingId: "b1",
	studentId: "s1",
	rating: 4,
	comment: "ok",
	images: [],
	video: null,
	editedAt: null,
	likeCount: 0,
	dislikeCount: 0,
	...o,
});
const comment = (o: Record<string, unknown> = {}) => ({
	id: "c1",
	reviewId: "r1",
	commentorId: "u1",
	comment: "nice",
	editedAt: null,
	likeCount: 0,
	dislikeCount: 0,
	...o,
});

describe("ReviewService", () => {
	let svc: ReviewService;
	beforeEach(() => {
		vi.clearAllMocks();
		svc = new ReviewService();
	});

	describe("createReview", () => {
		it("creates without images/video", async () => {
			db.review.create.mockResolvedValue(review());
			await svc.createReview("s1", "b1", {
				rating: 4,
				comment: "ok",
				images: [],
				video: null,
			});
			expect(db.review.create).toHaveBeenCalledOnce();
		});

		it("uploads images", async () => {
			mockUploadImage.mockResolvedValue({ url: "https://cdn/img.jpg" });
			db.review.create.mockResolvedValue(
				review({ images: ["https://cdn/img.jpg"] }),
			);
			const file = {
				buffer: Buffer.from("x"),
				mimetype: "image/jpeg",
			} as Express.Multer.File;
			await svc.createReview(
				"s1",
				"b1",
				{ rating: 5, images: [], video: null },
				[file],
			);
			expect(mockUploadImage).toHaveBeenCalledOnce();
			expect(db.review.create.mock.calls[0][0].data.images).toEqual([
				"https://cdn/img.jpg",
			]);
		});

		it("uploads video", async () => {
			mockUploadVideo.mockResolvedValue({ url: "https://cdn/vid.mp4" });
			db.review.create.mockResolvedValue(
				review({ video: "https://cdn/vid.mp4" }),
			);
			const file = {
				buffer: Buffer.from("x"),
				mimetype: "video/mp4",
			} as Express.Multer.File;
			await svc.createReview(
				"s1",
				"b1",
				{ rating: 4, images: [], video: null },
				undefined,
				file,
			);
			expect(mockUploadVideo).toHaveBeenCalledOnce();
		});
	});

	describe("getReviewById", () => {
		it("returns review when found", async () => {
			db.review.findUnique.mockResolvedValue(review());
			expect(await svc.getReviewById("r1")).toEqual(review());
		});
		it("returns null when not found", async () => {
			db.review.findUnique.mockResolvedValue(null);
			expect(await svc.getReviewById("x")).toBeNull();
		});
	});

	describe("getReviewsByBoarding", () => {
		it("returns paginated reviews with defaults", async () => {
			db.review.findMany.mockResolvedValue([review()]);
			db.review.count.mockResolvedValue(1);
			const r = await svc.getReviewsByBoarding("b1");
			expect(r.pagination.page).toBe(1);
			expect(r.pagination.totalPages).toBe(1);
		});

		it("respects custom options", async () => {
			db.review.findMany.mockResolvedValue([]);
			db.review.count.mockResolvedValue(0);
			await svc.getReviewsByBoarding("b1", {
				page: 2,
				limit: 5,
				sortBy: "rating",
				sortOrder: "asc",
			});
			const call = db.review.findMany.mock.calls[0][0];
			expect(call.skip).toBe(5);
			expect(call.take).toBe(5);
		});
	});

	describe("updateReview", () => {
		it("throws when review not found", async () => {
			db.review.findUnique.mockResolvedValue(null);
			await expect(svc.updateReview("x", "s1", { rating: 5 })).rejects.toThrow(
				"Review not found",
			);
		});
		it("throws when belongs to different student", async () => {
			db.review.findUnique.mockResolvedValue(review({ studentId: "other" }));
			await expect(svc.updateReview("r1", "s1", { rating: 5 })).rejects.toThrow(
				"own reviews",
			);
		});
		it("throws when already edited", async () => {
			db.review.findUnique.mockResolvedValue(review({ editedAt: new Date() }));
			await expect(svc.updateReview("r1", "s1", { rating: 3 })).rejects.toThrow(
				"already been edited",
			);
		});
		it("updates and marks editedAt", async () => {
			db.review.findUnique.mockResolvedValue(review());
			db.review.update.mockResolvedValue(review({ rating: 5 }));
			await svc.updateReview("r1", "s1", { rating: 5 });
			expect(db.review.update.mock.calls[0][0].data.editedAt).toBeInstanceOf(
				Date,
			);
		});
		it("deletes old images and uploads new ones", async () => {
			db.review.findUnique.mockResolvedValue(
				review({ images: ["https://cdn/upload/v1/reviews/old.jpg"] }),
			);
			mockUploadImage.mockResolvedValue({ url: "https://cdn/new.jpg" });
			db.review.update.mockResolvedValue(review());
			const file = {
				buffer: Buffer.from("x"),
				mimetype: "image/png",
			} as Express.Multer.File;
			await svc.updateReview("r1", "s1", {}, [file]);
			expect(mockDeleteAsset).toHaveBeenCalledOnce();
			expect(mockUploadImage).toHaveBeenCalledOnce();
		});
	});

	describe("deleteReview", () => {
		it("throws when not found", async () => {
			db.review.findUnique.mockResolvedValue(null);
			await expect(svc.deleteReview("x", "s1")).rejects.toThrow(
				"Review not found",
			);
		});
		it("throws when belongs to different student", async () => {
			db.review.findUnique.mockResolvedValue(review({ studentId: "other" }));
			await expect(svc.deleteReview("r1", "s1")).rejects.toThrow("own reviews");
		});
		it("deletes assets and record", async () => {
			db.review.findUnique.mockResolvedValue(
				review({
					images: ["https://cdn/upload/v1/img.jpg"],
					video: "https://cdn/upload/v1/vid.mp4",
				}),
			);
			db.review.delete.mockResolvedValue({});
			const r = await svc.deleteReview("r1", "s1");
			expect(mockDeleteAsset).toHaveBeenCalledTimes(2);
			expect(r).toEqual({
				success: true,
				message: "Review deleted successfully",
			});
		});
	});

	describe("addReviewReaction", () => {
		it("throws when review not found", async () => {
			db.review.findUnique.mockResolvedValue(null);
			await expect(svc.addReviewReaction("x", "u1", "LIKE")).rejects.toThrow(
				"Review not found",
			);
		});
		it("adds a new LIKE", async () => {
			db.review.findUnique.mockResolvedValue(review());
			db.reviewReaction.findUnique.mockResolvedValue(null);
			db.reviewReaction.create.mockResolvedValue({});
			db.review.update.mockResolvedValue({});
			expect(await svc.addReviewReaction("r1", "u1", "LIKE")).toEqual({
				action: "added",
				type: "LIKE",
			});
		});
		it("removes when toggled with same type", async () => {
			db.review.findUnique.mockResolvedValue(review());
			db.reviewReaction.findUnique.mockResolvedValue({
				id: "rx1",
				type: "LIKE",
			});
			db.reviewReaction.delete.mockResolvedValue({});
			db.review.update.mockResolvedValue({});
			expect(await svc.addReviewReaction("r1", "u1", "LIKE")).toEqual({
				action: "removed",
				type: "LIKE",
			});
		});
		it("changes reaction type", async () => {
			db.review.findUnique.mockResolvedValue(review());
			db.reviewReaction.findUnique.mockResolvedValue({
				id: "rx1",
				type: "LIKE",
			});
			db.reviewReaction.update.mockResolvedValue({});
			db.review.update.mockResolvedValue({});
			expect(await svc.addReviewReaction("r1", "u1", "DISLIKE")).toEqual({
				action: "changed",
				type: "DISLIKE",
			});
		});
	});

	describe("createReviewComment", () => {
		it("creates and returns a comment", async () => {
			db.reviewComment.create.mockResolvedValue(comment());
			const r = await svc.createReviewComment("r1", "u1", { comment: "nice" });
			expect(r).toEqual(comment());
		});
	});

	describe("updateReviewComment", () => {
		it("throws when not found", async () => {
			db.reviewComment.findUnique.mockResolvedValue(null);
			await expect(
				svc.updateReviewComment("x", "u1", { comment: "upd" }),
			).rejects.toThrow("Comment not found");
		});
		it("throws when belongs to different user", async () => {
			db.reviewComment.findUnique.mockResolvedValue(
				comment({ commentorId: "other" }),
			);
			await expect(
				svc.updateReviewComment("c1", "u1", { comment: "upd" }),
			).rejects.toThrow("own comments");
		});
		it("throws when already edited", async () => {
			db.reviewComment.findUnique.mockResolvedValue(
				comment({ editedAt: new Date() }),
			);
			await expect(
				svc.updateReviewComment("c1", "u1", { comment: "upd" }),
			).rejects.toThrow("already been edited");
		});
		it("updates and marks editedAt", async () => {
			db.reviewComment.findUnique.mockResolvedValue(comment());
			db.reviewComment.update.mockResolvedValue(
				comment({ comment: "updated" }),
			);
			const r = await svc.updateReviewComment("c1", "u1", {
				comment: "updated",
			});
			expect(
				db.reviewComment.update.mock.calls[0][0].data.editedAt,
			).toBeInstanceOf(Date);
		});
	});

	describe("deleteReviewComment", () => {
		it("throws when not found", async () => {
			db.reviewComment.findUnique.mockResolvedValue(null);
			await expect(svc.deleteReviewComment("x", "u1")).rejects.toThrow(
				"Comment not found",
			);
		});
		it("throws when belongs to different user", async () => {
			db.reviewComment.findUnique.mockResolvedValue(
				comment({ commentorId: "other" }),
			);
			await expect(svc.deleteReviewComment("c1", "u1")).rejects.toThrow(
				"own comments",
			);
		});
		it("deletes and returns success", async () => {
			db.reviewComment.findUnique.mockResolvedValue(comment());
			db.reviewComment.delete.mockResolvedValue({});
			expect(await svc.deleteReviewComment("c1", "u1")).toEqual({
				success: true,
				message: "Comment deleted successfully",
			});
		});
	});

	describe("addReviewCommentReaction", () => {
		it("throws when comment not found", async () => {
			db.reviewComment.findUnique.mockResolvedValue(null);
			await expect(
				svc.addReviewCommentReaction("x", "u1", "LIKE"),
			).rejects.toThrow("Comment not found");
		});
		it("adds a new DISLIKE", async () => {
			db.reviewComment.findUnique.mockResolvedValue(comment());
			db.reviewCommentReaction.findUnique.mockResolvedValue(null);
			db.reviewCommentReaction.create.mockResolvedValue({});
			db.reviewComment.update.mockResolvedValue({});
			expect(await svc.addReviewCommentReaction("c1", "u1", "DISLIKE")).toEqual(
				{ action: "added", type: "DISLIKE" },
			);
		});
		it("removes when toggled with same type", async () => {
			db.reviewComment.findUnique.mockResolvedValue(comment());
			db.reviewCommentReaction.findUnique.mockResolvedValue({
				id: "cr1",
				type: "DISLIKE",
			});
			db.reviewCommentReaction.delete.mockResolvedValue({});
			db.reviewComment.update.mockResolvedValue({});
			expect(await svc.addReviewCommentReaction("c1", "u1", "DISLIKE")).toEqual(
				{ action: "removed", type: "DISLIKE" },
			);
		});
		it("changes reaction type", async () => {
			db.reviewComment.findUnique.mockResolvedValue(comment());
			db.reviewCommentReaction.findUnique.mockResolvedValue({
				id: "cr1",
				type: "DISLIKE",
			});
			db.reviewCommentReaction.update.mockResolvedValue({});
			db.reviewComment.update.mockResolvedValue({});
			expect(await svc.addReviewCommentReaction("c1", "u1", "LIKE")).toEqual({
				action: "changed",
				type: "LIKE",
			});
		});
	});

	describe("getReviewStats", () => {
		it("returns zero stats for no reviews", async () => {
			db.review.findMany.mockResolvedValue([]);
			const s = await svc.getReviewStats("b1");
			expect(s.totalReviews).toBe(0);
			expect(s.averageRating).toBe(0);
			expect(s.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
		});
		it("computes correct average", async () => {
			db.review.findMany.mockResolvedValue([
				{ rating: 5 },
				{ rating: 3 },
				{ rating: 4 },
			]);
			const s = await svc.getReviewStats("b1");
			expect(s.averageRating).toBe(4.0);
			expect(s.totalReviews).toBe(3);
		});
		it("populates ratingDistribution", async () => {
			db.review.findMany.mockResolvedValue([
				{ rating: 5 },
				{ rating: 5 },
				{ rating: 4 },
				{ rating: 2 },
			]);
			const s = await svc.getReviewStats("b1");
			expect(s.ratingDistribution[5]).toBe(2);
			expect(s.ratingDistribution[4]).toBe(1);
			expect(s.ratingDistribution[3]).toBe(0);
			expect(s.ratingDistribution[2]).toBe(1);
		});
	});
});
