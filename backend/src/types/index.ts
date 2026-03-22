/**
 * Application-wide TypeScript types
 */

import type { Document, Types } from "mongoose";
import type {
  IUser,
  IBoarding,
  IReview,
  IReviewComment,
  IBoardingImage,
  IBoardingAmenity,
  IBoardingRule,
  IReservation,
  IVisitRequest,
} from "@/models/index.js";
import type { Role } from "@/types/enums.js";

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
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

/**
 * User types with relations
 */
export interface UserWithRelations extends Omit<IUser, keyof Document> {
  ownedBoardings?: IBoarding[];
  reviews?: IReview[];
}

/**
 * Boarding types with relations
 */
export interface BoardingWithRelations extends Omit<IBoarding, keyof Document> {
  owner: IUser;
  images?: IBoardingImage[];
  amenities?: IBoardingAmenity[];
  rules?: IBoardingRule[];
  reviews?: IReview[];
}

/**
 * Review types with relations
 */
export interface ReviewWithRelations extends Omit<IReview, keyof Document> {
  boarding: IBoarding;
  student: IUser;
  comments?: IReviewComment[];
}

/**
 * Review Comment types with relations
 */
export interface ReviewCommentWithRelations extends Omit<
  IReviewComment,
  keyof Document
> {
  review: IReview;
  commentor: IUser;
}

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
  sortOrder?: "asc" | "desc";
}

/**
 * Token pair for authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
