import api from './api';
import type { UniStayApiResponse } from '@/types/api.types';
import type {
  RawReview,
  RawReviewComment,
  Review,
  ReviewComment,
  ReviewMedia,
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
  return {
    id: raw.id,
    reviewId: raw.reviewId,
    authorId: raw.commentorId,
    authorName: `${raw.commentor.firstName} ${raw.commentor.lastName}`,
    comment: raw.comment,
    editedAt: raw.editedAt,
    createdAt: raw.commentedAt,
    reactions: { likes: raw.likeCount, dislikes: raw.dislikeCount, userReaction: null },
  };
}

function normalizeReview(raw: RawReview): Review {
  const media: ReviewMedia[] = [
    ...(raw.images ?? []).map((url, i) => ({ id: `img_${i}`, url, type: 'image' as const })),
    ...(raw.video ? [{ id: 'video_0', url: raw.video, type: 'video' as const }] : []),
  ];
  const comments = (raw.comments ?? []).map(normalizeComment);
  return {
    id: raw.id,
    boardingId: raw.boardingId,
    authorId: raw.studentId,
    reviewerName: `${raw.student.firstName} ${raw.student.lastName}`,
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
  const response = await api.post<UniStayApiResponse<{ id: string; boardingId: string; studentId: string }>>(
    '/reviews',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

export async function updateReview(reviewId: string, formData: FormData) {
  const response = await api.put<UniStayApiResponse<{ id: string; editedAt: string }>>(
    `/reviews/${reviewId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
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
