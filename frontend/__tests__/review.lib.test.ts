/**
 * Tests for lib/review.ts
 * Covers both the normalisation helpers and API functions.
 * The axios instance (lib/api) is mocked.
 */

jest.mock('../lib/api');

import api from '../lib/api';
import {
  getReviewStats,
  getBoardingReviewsById,
  getReviewById,
  getMyReviews,
  deleteReview,
  reactToReview,
  addComment,
  updateComment,
  deleteComment,
  reactToComment,
} from '../lib/review';
import type { RawReview, RawReviewComment } from '../types/review.types';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPut = api.put as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const okEnvelope = (data: unknown) => ({
  data: { success: true, message: 'ok', data },
});

// ── Fixture helpers ──────────────────────────────────────────────────────────

const makeRawComment = (overrides: Partial<RawReviewComment> = {}): RawReviewComment => ({
  id: 'c1',
  reviewId: 'r1',
  commentorId: 'u1',
  comment: 'Great place',
  likeCount: 2,
  dislikeCount: 0,
  commentedAt: '2024-01-10T08:00:00Z',
  editedAt: null,
  commentor: { id: 'u1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
  ...overrides,
});

const makeRawReview = (overrides: Partial<RawReview> = {}): RawReview => ({
  id: 'r1',
  boardingId: 'b1',
  studentId: 'u1',
  rating: 4,
  comment: 'Nice boarding',
  images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  video: 'https://example.com/video.mp4',
  likeCount: 5,
  dislikeCount: 1,
  commentedAt: '2024-01-10T08:00:00Z',
  editedAt: null,
  student: { id: 'u1', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' },
  comments: [makeRawComment()],
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

// ─── Normalisation (via getReviewById) ─────────────────────────────────────

describe('review normalisation', () => {
  it('maps student name to reviewerName', async () => {
    const raw = makeRawReview();
    mockGet.mockResolvedValueOnce(okEnvelope(raw));
    const result = await getReviewById('r1');
    expect(result.data.reviewerName).toBe('Bob Jones');
  });

  it('maps studentId to authorId', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope(makeRawReview()));
    const result = await getReviewById('r1');
    expect(result.data.authorId).toBe('u1');
  });

  it('converts images array into ReviewMedia with type "image"', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope(makeRawReview()));
    const result = await getReviewById('r1');
    const images = result.data.media.filter((m) => m.type === 'image');
    expect(images).toHaveLength(2);
    expect(images[0].url).toBe('https://example.com/img1.jpg');
  });

  it('converts video string into ReviewMedia with type "video"', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope(makeRawReview()));
    const result = await getReviewById('r1');
    const videos = result.data.media.filter((m) => m.type === 'video');
    expect(videos).toHaveLength(1);
    expect(videos[0].url).toBe('https://example.com/video.mp4');
  });

  it('produces no video media when video is null', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope(makeRawReview({ video: null })));
    const result = await getReviewById('r1');
    const videos = result.data.media.filter((m) => m.type === 'video');
    expect(videos).toHaveLength(0);
  });

  it('maps likeCount and dislikeCount to reactions', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope(makeRawReview({ likeCount: 5, dislikeCount: 1 })));
    const result = await getReviewById('r1');
    expect(result.data.reactions.likes).toBe(5);
    expect(result.data.reactions.dislikes).toBe(1);
    expect(result.data.reactions.userReaction).toBeNull();
  });

  it('normalises nested comments', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope(makeRawReview()));
    const result = await getReviewById('r1');
    expect(result.data.comments).toHaveLength(1);
    const comment = result.data.comments[0];
    expect(comment.authorName).toBe('Alice Smith');
    expect(comment.authorId).toBe('u1');
    expect(comment.comment).toBe('Great place');
  });

  it('sets _count.comments to the number of comments', async () => {
    const raw = makeRawReview({ comments: [makeRawComment(), makeRawComment({ id: 'c2' })] });
    mockGet.mockResolvedValueOnce(okEnvelope(raw));
    const result = await getReviewById('r1');
    expect(result.data._count?.comments).toBe(2);
  });

  it('handles empty images and null video gracefully', async () => {
    const raw = makeRawReview({ images: [], video: null });
    mockGet.mockResolvedValueOnce(okEnvelope(raw));
    const result = await getReviewById('r1');
    expect(result.data.media).toHaveLength(0);
  });
});

// ─── getReviewStats ──────────────────────────────────────────────────────────

describe('getReviewStats', () => {
  it('calls GET /reviews/boarding/:id/stats', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ averageRating: 4.2, totalReviews: 10, ratingDistribution: {} }));
    await getReviewStats('b1');
    expect(mockGet).toHaveBeenCalledWith('/reviews/boarding/b1/stats');
  });
});

// ─── getBoardingReviewsById ──────────────────────────────────────────────────

describe('getBoardingReviewsById', () => {
  it('calls GET /reviews/boarding/:id', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ reviews: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }));
    await getBoardingReviewsById('b1');
    expect(mockGet).toHaveBeenCalledWith('/reviews/boarding/b1', { params: {} });
  });

  it('normalises raw reviews in the response', async () => {
    mockGet.mockResolvedValueOnce(
      okEnvelope({ reviews: [makeRawReview()], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } })
    );
    const result = await getBoardingReviewsById('b1');
    expect(result.data.reviews[0].reviewerName).toBe('Bob Jones');
  });
});

// ─── getMyReviews ────────────────────────────────────────────────────────────

describe('getMyReviews', () => {
  it('calls GET /reviews/my', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ reviews: [], pagination: {} }));
    await getMyReviews();
    expect(mockGet).toHaveBeenCalledWith('/reviews/my', { params: {} });
  });
});

// ─── deleteReview ─────────────────────────────────────────────────────────────

describe('deleteReview', () => {
  it('calls DELETE /reviews/:id', async () => {
    mockDelete.mockResolvedValueOnce(okEnvelope(null));
    await deleteReview('r1');
    expect(mockDelete).toHaveBeenCalledWith('/reviews/r1');
  });
});

// ─── reactToReview ────────────────────────────────────────────────────────────

describe('reactToReview', () => {
  it('calls POST /reviews/:id/reactions with type payload', async () => {
    mockPost.mockResolvedValueOnce(okEnvelope({ action: 'added', type: 'LIKE' }));
    await reactToReview('r1', 'LIKE');
    expect(mockPost).toHaveBeenCalledWith('/reviews/r1/reactions', { type: 'LIKE' });
  });
});

// ─── addComment ───────────────────────────────────────────────────────────────

describe('addComment', () => {
  it('calls POST /reviews/:reviewId/comments with comment payload', async () => {
    mockPost.mockResolvedValueOnce(okEnvelope({ id: 'c1', reviewId: 'r1', commentor: {} }));
    await addComment('r1', { comment: 'Great place!' });
    expect(mockPost).toHaveBeenCalledWith('/reviews/r1/comments', { comment: 'Great place!' });
  });
});

// ─── updateComment ────────────────────────────────────────────────────────────

describe('updateComment', () => {
  it('calls PUT /reviews/comments/:id with comment payload', async () => {
    mockPut.mockResolvedValueOnce(okEnvelope({ id: 'c1', editedAt: '2024-01-15T10:00:00Z' }));
    await updateComment('c1', { comment: 'Updated comment' });
    expect(mockPut).toHaveBeenCalledWith('/reviews/comments/c1', { comment: 'Updated comment' });
  });
});

// ─── deleteComment ────────────────────────────────────────────────────────────

describe('deleteComment', () => {
  it('calls DELETE /reviews/comments/:id', async () => {
    mockDelete.mockResolvedValueOnce(okEnvelope(null));
    await deleteComment('c1');
    expect(mockDelete).toHaveBeenCalledWith('/reviews/comments/c1');
  });
});

// ─── reactToComment ───────────────────────────────────────────────────────────

describe('reactToComment', () => {
  it('calls POST /reviews/comments/:id/reactions with type payload', async () => {
    mockPost.mockResolvedValueOnce(okEnvelope({ action: 'added', type: 'DISLIKE' }));
    await reactToComment('c1', 'DISLIKE');
    expect(mockPost).toHaveBeenCalledWith('/reviews/comments/c1/reactions', { type: 'DISLIKE' });
  });
});
