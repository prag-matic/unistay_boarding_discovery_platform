import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the review service (the controller is a thin facade over it)
vi.mock('@/services/review.service.js', () => {
  const svc = {
    createReview: vi.fn(),
    getReviewById: vi.fn(),
    getReviewsByBoarding: vi.fn(),
    getReviewStats: vi.fn(),
    updateReview: vi.fn(),
    deleteReview: vi.fn(),
    addReviewReaction: vi.fn(),
    createReviewComment: vi.fn(),
    updateReviewComment: vi.fn(),
    deleteReviewComment: vi.fn(),
    addReviewCommentReaction: vi.fn(),
  };
  return { reviewService: svc, ReviewService: vi.fn(() => svc), default: svc };
});

vi.mock('@/lib/jwt.js', () => ({
  verifyAccessToken: vi.fn().mockReturnValue({ userId: 'u1' }),
  signAccessToken: vi.fn(),
  parseDurationMs: vi.fn(),
}));

import { reviewService } from '@/services/review.service.js';
import {
  createReview, getReview, getReviewsByBoarding, getReviewStats,
  updateReview, deleteReview,
  addReviewReaction, createReviewComment, updateReviewComment,
  deleteReviewComment, addReviewCommentReaction,
} from '@/controllers/review.controller.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/errors/AppError.js';

const svc = reviewService as any;

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { userId: 'u1' },
    files: undefined,
    file: undefined,
    ...overrides,
  } as any;
}
function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}
const next = vi.fn();

// cuid-shaped IDs required by the review schema
const BOARDING_ID = 'clz1234567890abcdefghijklm';
const fakeReview = { id: 'r1', boardingId: BOARDING_ID, studentId: 'u1', rating: 4, comment: 'Great place', images: [], video: null };
const fakePaginated = { data: [fakeReview], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
const fakeStats = { averageRating: 4.5, totalReviews: 10 };

beforeEach(() => vi.clearAllMocks());

// ── createReview ─────────────────────────────────────────────────────────────
describe('createReview', () => {
  it('creates a review and returns 201', async () => {
    svc.createReview.mockResolvedValue(fakeReview);
    const res = mockRes();
    await createReview(mockReq({ body: { data: JSON.stringify({ boardingId: BOARDING_ID, rating: 4, comment: 'Great' }) } }), res, next);
    expect(svc.createReview).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws BadRequestError for invalid JSON in body.data', async () => {
    await createReview(mockReq({ body: { data: '{bad json' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('throws BadRequestError when userId missing', async () => {
    await createReview(mockReq({ body: { data: JSON.stringify({ boardingId: BOARDING_ID, rating: 4 }) }, user: undefined, headers: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('throws BadRequestError when more than 5 images', async () => {
    const files = { images: Array.from({ length: 6 }, (_, i) => ({ buffer: Buffer.from('x'), mimetype: 'image/jpeg', fieldname: 'images', originalname: `img${i}.jpg` })) };
    await createReview(mockReq({ body: { data: JSON.stringify({ boardingId: BOARDING_ID, rating: 4 }) }, files }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

// ── getReview ────────────────────────────────────────────────────────────────
describe('getReview', () => {
  it('returns review when found', async () => {
    svc.getReviewById.mockResolvedValue(fakeReview);
    const res = mockRes();
    await getReview(mockReq({ params: { id: 'r1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws NotFoundError when review not found', async () => {
    svc.getReviewById.mockResolvedValue(null);
    await getReview(mockReq({ params: { id: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('calls next on service error', async () => {
    svc.getReviewById.mockRejectedValue(new Error('db'));
    await getReview(mockReq({ params: { id: 'r1' } }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

// ── getReviewsByBoarding ─────────────────────────────────────────────────────
describe('getReviewsByBoarding', () => {
  it('returns paginated reviews', async () => {
    svc.getReviewsByBoarding.mockResolvedValue(fakePaginated);
    const res = mockRes();
    await getReviewsByBoarding(mockReq({ params: { boardingId: 'b1' }, query: { page: '1', limit: '10' } }), res, next);
    expect(res.json).toHaveBeenCalled();
    expect(svc.getReviewsByBoarding).toHaveBeenCalledWith('b1', expect.objectContaining({ page: 1, limit: 10 }));
  });
});

// ── getReviewStats ────────────────────────────────────────────────────────────
describe('getReviewStats', () => {
  it('returns review stats', async () => {
    svc.getReviewStats.mockResolvedValue(fakeStats);
    const res = mockRes();
    await getReviewStats(mockReq({ params: { boardingId: 'b1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });
});

// ── updateReview ──────────────────────────────────────────────────────────────
describe('updateReview', () => {
  it('updates review', async () => {
    svc.updateReview.mockResolvedValue({ ...fakeReview, comment: 'Updated' });
    const res = mockRes();
    await updateReview(mockReq({ params: { id: 'r1' }, body: { data: JSON.stringify({ rating: 5, comment: 'Updated' }) } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('maps "Review not found" to NotFoundError', async () => {
    svc.updateReview.mockRejectedValue(new Error('Review not found'));
    await updateReview(mockReq({ params: { id: 'x' }, body: { data: JSON.stringify({ rating: 5 }) } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('maps ownership error to ForbiddenError', async () => {
    svc.updateReview.mockRejectedValue(new Error('You can only edit your own reviews'));
    await updateReview(mockReq({ params: { id: 'r1' }, body: { data: JSON.stringify({ rating: 3 }) } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

// ── deleteReview ──────────────────────────────────────────────────────────────
describe('deleteReview', () => {
  it('deletes review', async () => {
    svc.deleteReview.mockResolvedValue({ message: 'Review deleted' });
    const res = mockRes();
    await deleteReview(mockReq({ params: { id: 'r1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('maps "Review not found" to NotFoundError', async () => {
    svc.deleteReview.mockRejectedValue(new Error('Review not found'));
    await deleteReview(mockReq({ params: { id: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('maps ownership error to ForbiddenError', async () => {
    svc.deleteReview.mockRejectedValue(new Error('You can only delete your own reviews'));
    await deleteReview(mockReq({ params: { id: 'r1' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('throws BadRequestError when userId missing', async () => {
    await deleteReview(mockReq({ params: { id: 'r1' }, user: undefined, headers: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

// ── addReviewReaction ─────────────────────────────────────────────────────────
describe('addReviewReaction', () => {
  it('adds a reaction', async () => {
    svc.addReviewReaction.mockResolvedValue({ action: 'added', type: 'LIKE' });
    const res = mockRes();
    await addReviewReaction(mockReq({ params: { id: 'r1' }, body: { type: 'LIKE' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws BadRequestError when userId missing', async () => {
    await addReviewReaction(mockReq({ params: { id: 'r1' }, body: { type: 'LIKE' }, user: undefined, headers: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

// ── createReviewComment ───────────────────────────────────────────────────────
describe('createReviewComment', () => {
  it('creates a comment and returns 201', async () => {
    svc.createReviewComment.mockResolvedValue({ id: 'c1', comment: 'Nice' });
    const res = mockRes();
    await createReviewComment(mockReq({ params: { id: 'r1' }, body: { comment: 'Nice' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws BadRequestError when userId missing', async () => {
    await createReviewComment(mockReq({ params: { id: 'r1' }, body: { comment: 'x' }, user: undefined, headers: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

// ── updateReviewComment ───────────────────────────────────────────────────────
describe('updateReviewComment', () => {
  it('updates a comment', async () => {
    svc.updateReviewComment.mockResolvedValue({ id: 'c1', comment: 'Updated' });
    const res = mockRes();
    await updateReviewComment(mockReq({ params: { id: 'c1' }, body: { comment: 'Updated' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('maps "Comment not found" to NotFoundError', async () => {
    svc.updateReviewComment.mockRejectedValue(new Error('Comment not found'));
    await updateReviewComment(mockReq({ params: { id: 'x' }, body: { comment: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('maps ownership error to ForbiddenError', async () => {
    svc.updateReviewComment.mockRejectedValue(new Error('You can only edit your own comments'));
    await updateReviewComment(mockReq({ params: { id: 'c1' }, body: { comment: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

// ── deleteReviewComment ───────────────────────────────────────────────────────
describe('deleteReviewComment', () => {
  it('deletes a comment', async () => {
    svc.deleteReviewComment.mockResolvedValue({ message: 'Comment deleted' });
    const res = mockRes();
    await deleteReviewComment(mockReq({ params: { id: 'c1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('maps "Comment not found" to NotFoundError', async () => {
    svc.deleteReviewComment.mockRejectedValue(new Error('Comment not found'));
    await deleteReviewComment(mockReq({ params: { id: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('throws BadRequestError when userId missing', async () => {
    await deleteReviewComment(mockReq({ params: { id: 'c1' }, user: undefined, headers: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

// ── addReviewCommentReaction ──────────────────────────────────────────────────
describe('addReviewCommentReaction', () => {
  it('adds a reaction to a comment', async () => {
    svc.addReviewCommentReaction.mockResolvedValue({ action: 'added', type: 'LIKE' });
    const res = mockRes();
    await addReviewCommentReaction(mockReq({ params: { id: 'c1' }, body: { type: 'LIKE' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws BadRequestError when userId missing', async () => {
    await addReviewCommentReaction(mockReq({ params: { id: 'c1' }, body: { type: 'DISLIKE' }, user: undefined, headers: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});
