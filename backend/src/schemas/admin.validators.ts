import { z } from "zod";
import {
	BoardingStatus,
	MarketplaceStatus,
	PaymentStatus,
	ReservationStatus,
	VisitRequestStatus,
} from "@/types/enums.js";

const dateTimeOrDateSchema = z.union([
	z.string().datetime({ offset: true }),
	z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
]);

export const adminIdParamSchema = z.object({
	id: z.string().min(1, "id is required"),
});

export const adminListReservationsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	status: z.nativeEnum(ReservationStatus).optional(),
	search: z.string().trim().max(100).optional(),
	createdFrom: dateTimeOrDateSchema.optional(),
	createdTo: dateTimeOrDateSchema.optional(),
});

export const adminListVisitRequestsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	status: z.nativeEnum(VisitRequestStatus).optional(),
	search: z.string().trim().max(100).optional(),
	createdFrom: dateTimeOrDateSchema.optional(),
	createdTo: dateTimeOrDateSchema.optional(),
});

export const adminListBoardingsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	status: z.nativeEnum(BoardingStatus).optional(),
	search: z.string().trim().max(100).optional(),
});

export const adminSetBoardingStatusSchema = z.object({
	status: z.enum([
		BoardingStatus.ACTIVE,
		BoardingStatus.INACTIVE,
		BoardingStatus.REJECTED,
	]),
	reason: z.string().trim().max(500).optional(),
});

export const adminListMarketplaceQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	status: z.nativeEnum(MarketplaceStatus).optional(),
	search: z.string().trim().max(100).optional(),
});

export const adminSetMarketplaceStatusSchema = z.object({
	status: z.nativeEnum(MarketplaceStatus),
	reason: z.string().trim().max(500).optional(),
});

export const adminListPaymentsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	status: z.nativeEnum(PaymentStatus).optional(),
	search: z.string().trim().max(100).optional(),
	minAmount: z.coerce.number().positive().optional(),
	maxAmount: z.coerce.number().positive().optional(),
	createdFrom: dateTimeOrDateSchema.optional(),
	createdTo: dateTimeOrDateSchema.optional(),
});

export const adminListReviewsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	minRating: z.coerce.number().int().min(1).max(5).optional(),
	maxRating: z.coerce.number().int().min(1).max(5).optional(),
	search: z.string().trim().max(100).optional(),
	createdFrom: dateTimeOrDateSchema.optional(),
	createdTo: dateTimeOrDateSchema.optional(),
});

export const adminBulkUserStatusSchema = z.object({
	userIds: z.array(z.string().min(1)).min(1).max(200),
	isActive: z.boolean(),
});

export const adminBulkConfirmPaymentsSchema = z.object({
	paymentIds: z.array(z.string().min(1)).min(1).max(200),
});

export const adminBulkRejectPaymentsSchema = z.object({
	paymentIds: z.array(z.string().min(1)).min(1).max(200),
	reason: z.string().trim().min(1, "Rejection reason is required"),
});

export const adminBulkDeleteReviewsSchema = z.object({
	reviewIds: z.array(z.string().min(1)).min(1).max(200),
});

export const adminListActionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	action: z.string().trim().max(80).optional(),
	targetType: z.enum(["USER", "BOARDING", "PAYMENT", "REVIEW", "SYSTEM"]).optional(),
});

export const adminRejectPaymentSchema = z.object({
	reason: z.string().trim().min(1, "Rejection reason is required"),
});

export type AdminListReservationsQuery = z.infer<
	typeof adminListReservationsQuerySchema
>;
export type AdminListVisitRequestsQuery = z.infer<
	typeof adminListVisitRequestsQuerySchema
>;
export type AdminListBoardingsQuery = z.infer<typeof adminListBoardingsQuerySchema>;
export type AdminSetBoardingStatusInput = z.infer<
	typeof adminSetBoardingStatusSchema
>;
export type AdminListMarketplaceQuery = z.infer<
	typeof adminListMarketplaceQuerySchema
>;
export type AdminSetMarketplaceStatusInput = z.infer<
	typeof adminSetMarketplaceStatusSchema
>;
export type AdminListPaymentsQuery = z.infer<
	typeof adminListPaymentsQuerySchema
>;
export type AdminListReviewsQuery = z.infer<typeof adminListReviewsQuerySchema>;
export type AdminRejectPaymentInput = z.infer<typeof adminRejectPaymentSchema>;
export type AdminBulkUserStatusInput = z.infer<typeof adminBulkUserStatusSchema>;
export type AdminBulkConfirmPaymentsInput = z.infer<
	typeof adminBulkConfirmPaymentsSchema
>;
export type AdminBulkRejectPaymentsInput = z.infer<
	typeof adminBulkRejectPaymentsSchema
>;
export type AdminBulkDeleteReviewsInput = z.infer<
	typeof adminBulkDeleteReviewsSchema
>;
export type AdminListActionsQuery = z.infer<typeof adminListActionsQuerySchema>;
