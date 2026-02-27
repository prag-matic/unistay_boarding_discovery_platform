/**
 * Application-wide TypeScript types
 */

import type { User, Boarding, Review, ReviewComment } from '@prisma/client';

/**
 * API Response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * JWT Payload type
 */
export interface JWTPayload {
  id: string;
  email: string;
  role: 'STUDENT' | 'OWNER';
  iat?: number;
  exp?: number;
}

/**
 * User types with relations
 */
export type UserWithRelations = User & {
  ownedBoardings?: Boarding[];
  reviews?: Review[];
};

/**
 * Boarding types with relations
 */
export type BoardingWithRelations = Boarding & {
  owner: User;
  reviews?: Review[];
};

/**
 * Review types with relations
 */
export type ReviewWithRelations = Review & {
  boarding: Boarding;
  student: User;
  comments?: ReviewComment[];
};

/**
 * Review Comment types with relations
 */
export type ReviewCommentWithRelations = ReviewComment & {
  review: Review;
  commentor: User;
};

/**
 * File upload types
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Token pair for authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
