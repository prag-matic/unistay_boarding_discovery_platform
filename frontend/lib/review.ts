import api from './api';
import type { UniStayApiResponse } from '@/types/api.types';
import type {
  RawReview,
  RawReviewComment,
  Review,
  ReviewComment,
  ReviewMedia,
  ReviewPersonInfo,
  ReviewStats,
  ReviewsListResponse,
  ReviewsQueryParams,
  ReactionType,
  ReactionAction,
  CreateCommentPayload,
  UpdateCommentPayload,
} from '@/types/review.types';

// ── Normalization helpers ────────────────────────────────────────────────────

function normalizeComment(raw: RawReviewComment): ReviewComment {
  // Mongoose populates the relation in-place under the FK field name:
  // raw.commentorId becomes the populated User object (not a string).
  // Accept both the Mongoose shape and a Prisma-like { commentor } shape.
  const commentor: ReviewPersonInfo =
    raw.commentor ?? (raw.commentorId as unknown as ReviewPersonInfo);
  const authorId =
    typeof raw.commentorId === 'string'
      ? raw.commentorId
      : ((raw.commentorId as unknown as ReviewPersonInfo)?.id ??
         (raw.commentorId as unknown as { _id: string })?._id ??
         '');
  const id =
    raw.id ??
    (raw as unknown as { _id?: string })._id ??
    '';
  return {
    id,
    reviewId: raw.reviewId,
    authorId,
    authorName: commentor
      ? `${commentor.firstName ?? ''} ${commentor.lastName ?? ''}`.trim() || 'Unknown'
      : 'Unknown',
    comment: raw.comment,
    editedAt: raw.editedAt,
    createdAt: raw.commentedAt,
    reactions: { likes: raw.likeCount, dislikes: raw.dislikeCount, userReaction: null },
  };
}

function normalizeReview(raw: RawReview): Review {
  // Mongoose populates the relation in-place under the FK field name:
  // raw.studentId becomes the populated User object (not a string).
  // Accept both the Mongoose shape and a Prisma-like { student } shape.
  const student: ReviewPersonInfo =
    raw.student ?? (raw.studentId as unknown as ReviewPersonInfo);
  const authorId =
    typeof raw.studentId === 'string'
      ? raw.studentId
      : ((raw.studentId as unknown as ReviewPersonInfo)?.id ??
         (raw.studentId as unknown as { _id: string })?._id ??
         '');
  // boardingId may also be populated (Mongoose replaces FK with the document)
  const rawBoarding = raw.boardingId as unknown as { id?: string; _id?: string; title?: string } | string;
  const boardingId =
    typeof rawBoarding === 'string'
      ? rawBoarding
      : (rawBoarding?.id ?? rawBoarding?._id ?? String(raw.boardingId));
  const boardingTitle =
    typeof rawBoarding === 'string' ? undefined : (rawBoarding?.title ?? undefined);
  // id virtual may be absent if lean() was called without { virtuals: true }
  const id =
    raw.id ??
    (raw as unknown as { _id?: string })._id ??
    '';
  const media: ReviewMedia[] = [
    ...(raw.images ?? []).map((url, i) => ({ id: `img_${i}`, url, type: 'image' as const })),
    ...(raw.video ? [{ id: 'video_0', url: raw.video, type: 'video' as const }] : []),
  ];
  const comments = (raw.comments ?? []).map(normalizeComment);
  return {
    id,
    boardingId,
    boardingTitle,
    authorId,
    reviewerName: student
      ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'Unknown'
      : 'Unknown',
    rating: raw.rating,
    comment: raw.comment,
    editedAt: raw.editedAt,
    commentedAt: raw.commentedAt,
    createdAt: raw.commentedAt,
    media,
    reactions: { likes: raw.likeCount, dislikes: raw.dislikeCount, userReaction: null },
    comments,
    _count: { comments: comments.length },
  };
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getReviewStats(boardingId: string) {
  const response = await api.get<UniStayApiResponse<ReviewStats>>(
    `/reviews/boarding/${boardingId}/stats`,
  );
  return response.data;
}

export async function getBoardingReviewsById(
  boardingId: string,
  params: ReviewsQueryParams = {},
) {
  const response = await api.get<UniStayApiResponse<{ reviews: RawReview[]; pagination: ReviewsListResponse['pagination'] }>>(
    `/reviews/boarding/${boardingId}`,
    { params },
  );
  const raw = response.data;
  return {
    ...raw,
    data: {
      reviews: (raw.data.reviews ?? []).map(normalizeReview),
      pagination: raw.data.pagination,
    },
  };
}

export async function getReviewById(reviewId: string) {
  const response = await api.get<UniStayApiResponse<RawReview>>(
    `/reviews/${reviewId}`,
  );
  const raw = response.data;
  return {
    ...raw,
    data: normalizeReview(raw.data),
  };
}

export async function getMyReviews(params: ReviewsQueryParams = {}) {
  const response = await api.get<UniStayApiResponse<{ reviews: RawReview[]; pagination: ReviewsListResponse['pagination'] }>>(
    '/reviews/my',
    { params },
  );
  const raw = response.data;
  return {
    ...raw,
    data: {
      reviews: (raw.data.reviews ?? []).map(normalizeReview),
      pagination: raw.data.pagination,
    },
  };
}

export async function getMyBoardingReviews(params: ReviewsQueryParams = {}) {
  const response = await api.get<UniStayApiResponse<{ reviews: RawReview[]; pagination: ReviewsListResponse['pagination'] }>>(
    '/reviews/my-boardings',
    { params },
  );
  const raw = response.data;
  return {
    ...raw,
    data: {
      reviews: (raw.data.reviews ?? []).map(normalizeReview),
      pagination: raw.data.pagination,
    },
  };
}

export async function createReview(formData: FormData) {
  const response = await api.post<UniStayApiResponse<RawReview>>(
    '/reviews',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return {
    ...response.data,
    data: normalizeReview(response.data.data),
  };
}

export async function updateReview(reviewId: string, formData: FormData) {
  const response = await api.put<UniStayApiResponse<RawReview>>(
    `/reviews/${reviewId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return {
    ...response.data,
    data: normalizeReview(response.data.data),
  };
}

export async function deleteReview(reviewId: string) {
  const response = await api.delete<UniStayApiResponse<null>>(
    `/reviews/${reviewId}`,
  );
  return response.data;
}

export async function reactToReview(reviewId: string, reactionType: ReactionType) {
  const response = await api.post<
    UniStayApiResponse<{ action: ReactionAction; type: ReactionType }>
  >(`/reviews/${reviewId}/reactions`, { type: reactionType });
  return response.data;
}

export async function addComment(reviewId: string, payload: CreateCommentPayload) {
  const response = await api.post<UniStayApiResponse<{ id: string; reviewId: string; commentor: Record<string, unknown> }>>(
    `/reviews/${reviewId}/comments`,
    payload,
  );
  return response.data;
}

export async function updateComment(commentId: string, payload: UpdateCommentPayload) {
  const response = await api.put<UniStayApiResponse<{ id: string; editedAt: string }>>(
    `/reviews/comments/${commentId}`,
    payload,
  );
  return response.data;
}

export async function deleteComment(commentId: string) {
  const response = await api.delete<UniStayApiResponse<null>>(
    `/reviews/comments/${commentId}`,
  );
  return response.data;
}

export async function reactToComment(commentId: string, reactionType: ReactionType) {
  const response = await api.post<
    UniStayApiResponse<{ action: ReactionAction; type: ReactionType }>
  >(`/reviews/comments/${commentId}/reactions`, { type: reactionType });
  return response.data;
}
