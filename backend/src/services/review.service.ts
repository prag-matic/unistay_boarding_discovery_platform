import prisma from '../lib/prisma.js';
import { openinary } from '../lib/openinary.js';
import type { CreateReviewInput, UpdateReviewInput, CreateReviewCommentInput, UpdateReviewCommentInput } from '../schemas/index.js';

/**
 * Review Service
 * Handles all review-related business logic
 */

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
    // Upload images to Openinary (convert to WebP)
    const imagePaths: string[] = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const result = await openinary.uploadImageWebp(
          image.buffer,
          `reviews/${boardingId}/images`,
        );
        imagePaths.push(result.path);
      }
    }

    // Upload video to Openinary (convert to WebM)
    let videoPath: string | null = null;
    if (video) {
      const result = await openinary.uploadVideoWebm(
        video.buffer,
        `reviews/${boardingId}/videos`,
      );
      videoPath = result.path;
    }

    // Create review in database
    const review = await prisma.review.create({
      data: {
        boardingId,
        studentId,
        rating: data.rating,
        comment: data.comment ?? null,
        images: imagePaths,
        video: videoPath ?? null,
      },
      include: {
        boarding: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Get a review by ID
   */
  async getReviewById(reviewId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        boarding: {
          select: {
            id: true,
            propertyName: true,
            type: true,
            address: true,
            city: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        comments: {
          include: {
            commentor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { commentedAt: 'asc' },
        },
      },
    });

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
      sortBy?: 'rating' | 'commentedAt';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'commentedAt',
      sortOrder = 'desc',
    } = options ?? {};

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { boardingId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          comments: {
            include: {
              commentor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            take: 5, // Get latest 5 comments per review
          },
        },
      }),
      prisma.review.count({ where: { boardingId } }),
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
    // Check if review exists and belongs to student
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      throw new Error('Review not found');
    }

    if (existingReview.studentId !== studentId) {
      throw new Error('You can only edit your own reviews');
    }

    if (existingReview.editedAt) {
      throw new Error('This review has already been edited and cannot be modified again');
    }

    // Upload new images if provided
    let imagePaths: string[] = existingReview.images;
    if (images && images.length > 0) {
      // Delete old images
      for (const oldPath of existingReview.images) {
        try {
          const publicId = oldPath.split('/').pop()?.split('.')[0] || '';
          if (publicId) await openinary.delete(publicId);
        } catch {
          // Ignore delete errors
        }
      }

      // Upload new images
      imagePaths = [];
      for (const image of images) {
        const result = await openinary.uploadImageWebp(
          image.buffer,
          `reviews/${existingReview.boardingId}/images`,
        );
        imagePaths.push(result.path);
      }
    }

    // Upload new video if provided
    let videoPath: string | null = existingReview.video;
    if (video) {
      // Delete old video
      if (existingReview.video) {
        try {
          const publicId = existingReview.video.split('/').pop()?.split('.')[0] || '';
          if (publicId) await openinary.delete(publicId);
        } catch {
          // Ignore delete errors
        }
      }

      // Upload new video
      const result = await openinary.uploadVideoWebm(
        video.buffer,
        `reviews/${existingReview.boardingId}/videos`,
      );
      videoPath = result.path;
    }

    // Update review
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.comment !== undefined && { comment: data.comment }),
        ...(images && { images: imagePaths }),
        ...(video && { video: videoPath }),
        editedAt: new Date(), // Mark as edited
      },
      include: {
        boarding: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string, studentId: string) {
    // Check if review exists and belongs to student
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      throw new Error('Review not found');
    }

    if (existingReview.studentId !== studentId) {
      throw new Error('You can only delete your own reviews');
    }

    // Delete images from Openinary
    for (const imagePath of existingReview.images) {
      try {
        const publicId = imagePath.split('/').pop()?.split('.')[0] || '';
        if (publicId) await openinary.delete(publicId);
      } catch {
        // Ignore delete errors
      }
    }

    // Delete video from Openinary
    if (existingReview.video) {
      try {
        const publicId = existingReview.video.split('/').pop()?.split('.')[0] || '';
        if (publicId) await openinary.delete(publicId);
      } catch {
        // Ignore delete errors
      }
    }

    // Delete review from database (cascade will delete comments and reactions)
    await prisma.review.delete({
      where: { id: reviewId },
    });

    return { success: true, message: 'Review deleted successfully' };
  }

  /**
   * Add a reaction (like/dislike) to a review
   */
  async addReviewReaction(
    reviewId: string,
    userId: string,
    type: 'LIKE' | 'DISLIKE',
  ) {
    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Check if user already reacted
    const existingReaction = await prisma.reviewReaction.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Toggle off (remove reaction)
        await prisma.reviewReaction.delete({
          where: { id: existingReaction.id },
        });

        // Update counts
        await prisma.review.update({
          where: { id: reviewId },
          data: {
            [type === 'LIKE' ? 'likeCount' : 'dislikeCount']: {
              decrement: 1,
            },
          },
        });

        return { action: 'removed', type };
      } else {
        // Change reaction
        await prisma.reviewReaction.update({
          where: { id: existingReaction.id },
          data: { type },
        });

        // Update counts
        await prisma.review.update({
          where: { id: reviewId },
          data: {
            likeCount: {
              increment: type === 'LIKE' ? 1 : -1,
            },
            dislikeCount: {
              increment: type === 'DISLIKE' ? 1 : -1,
            },
          },
        });

        return { action: 'changed', type };
      }
    }

    // Add new reaction
    await prisma.reviewReaction.create({
      data: {
        reviewId,
        userId,
        type,
      },
    });

    // Update counts
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        [type === 'LIKE' ? 'likeCount' : 'dislikeCount']: {
          increment: 1,
        },
      },
    });

    return { action: 'added', type };
  }

  /**
   * Create a comment on a review
   */
  async createReviewComment(
    reviewId: string,
    commentorId: string,
    data: CreateReviewCommentInput,
  ) {
    const comment = await prisma.reviewComment.create({
      data: {
        reviewId,
        commentorId,
        comment: data.comment,
      },
      include: {
        commentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        review: {
          select: {
            id: true,
            boardingId: true,
          },
        },
      },
    });

    return comment;
  }

  /**
   * Update a review comment (one-time edit only)
   */
  async updateReviewComment(
    commentId: string,
    commentorId: string,
    data: UpdateReviewCommentInput,
  ) {
    // Check if comment exists and belongs to user
    const existingComment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      throw new Error('Comment not found');
    }

    if (existingComment.commentorId !== commentorId) {
      throw new Error('You can only edit your own comments');
    }

    if (existingComment.editedAt) {
      throw new Error('This comment has already been edited and cannot be modified again');
    }

    const comment = await prisma.reviewComment.update({
      where: { id: commentId },
      data: {
        comment: data.comment!,
        editedAt: new Date(),
      },
      include: {
        commentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return comment;
  }

  /**
   * Delete a review comment
   */
  async deleteReviewComment(commentId: string, commentorId: string) {
    // Check if comment exists and belongs to user
    const existingComment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      throw new Error('Comment not found');
    }

    if (existingComment.commentorId !== commentorId) {
      throw new Error('You can only delete your own comments');
    }

    await prisma.reviewComment.delete({
      where: { id: commentId },
    });

    return { success: true, message: 'Comment deleted successfully' };
  }

  /**
   * Add a reaction to a review comment
   */
  async addReviewCommentReaction(
    commentId: string,
    userId: string,
    type: 'LIKE' | 'DISLIKE',
  ) {
    // Check if comment exists
    const comment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if user already reacted
    const existingReaction = await prisma.reviewCommentReaction.findUnique({
      where: {
        reviewCommentId_userId: {
          reviewCommentId: commentId,
          userId,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Toggle off (remove reaction)
        await prisma.reviewCommentReaction.delete({
          where: { id: existingReaction.id },
        });

        // Update counts
        await prisma.reviewComment.update({
          where: { id: commentId },
          data: {
            [type === 'LIKE' ? 'likeCount' : 'dislikeCount']: {
              decrement: 1,
            },
          },
        });

        return { action: 'removed', type };
      } else {
        // Change reaction
        await prisma.reviewCommentReaction.update({
          where: { id: existingReaction.id },
          data: { type },
        });

        // Update counts
        await prisma.reviewComment.update({
          where: { id: commentId },
          data: {
            likeCount: {
              increment: type === 'LIKE' ? 1 : -1,
            },
            dislikeCount: {
              increment: type === 'DISLIKE' ? 1 : -1,
            },
          },
        });

        return { action: 'changed', type };
      }
    }

    // Add new reaction
    await prisma.reviewCommentReaction.create({
      data: {
        reviewCommentId: commentId,
        userId,
        type,
      },
    });

    // Update counts
    await prisma.reviewComment.update({
      where: { id: commentId },
      data: {
        [type === 'LIKE' ? 'likeCount' : 'dislikeCount']: {
          increment: 1,
        },
      },
    });

    return { action: 'added', type };
  }

  /**
   * Get review statistics for a boarding
   */
  async getReviewStats(boardingId: string) {
    const reviews = await prisma.review.findMany({
      where: { boardingId },
      select: {
        rating: true,
      },
    });

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
