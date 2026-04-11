import { z } from "zod";
import {
	MarketplaceAdType,
	MarketplaceCondition,
	MarketplaceReportReason,
	MarketplaceReportStatus,
	MarketplaceStatus,
} from "@/types/enums.js";

export const createMarketplaceItemSchema = z
	.object({
		title: z.string().min(5, "Title must be at least 5 characters").max(120),
		description: z
			.string()
			.min(10, "Description must be at least 10 characters")
			.max(2000),
		adType: z.enum(MarketplaceAdType),
		category: z.string().min(2).max(60),
		itemCondition: z.enum(MarketplaceCondition),
		price: z.coerce.number().positive().optional(),
		city: z.string().min(1).max(80),
		district: z.string().min(1).max(80),
	})
	.superRefine((value, ctx) => {
		if (value.adType === MarketplaceAdType.SELL && value.price === undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["price"],
				message: "Price is required for SELL listings",
			});
		}

		if (value.adType === MarketplaceAdType.GIVEAWAY && value.price !== undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["price"],
				message: "Price must not be set for GIVEAWAY listings",
			});
		}
	});

export const updateMarketplaceItemSchema = z
	.object({
		title: z.string().min(5).max(120).optional(),
		description: z.string().min(10).max(2000).optional(),
		adType: z.enum(MarketplaceAdType).optional(),
		category: z.string().min(2).max(60).optional(),
		itemCondition: z.enum(MarketplaceCondition).optional(),
		price: z.coerce.number().positive().nullable().optional(),
		city: z.string().min(1).max(80).optional(),
		district: z.string().min(1).max(80).optional(),
	})
	.superRefine((value, ctx) => {
		if (
			value.adType === MarketplaceAdType.GIVEAWAY &&
			value.price !== undefined &&
			value.price !== null
		) {
			ctx.addIssue({
				code: "custom",
				path: ["price"],
				message: "Price must be null/undefined for GIVEAWAY listings",
			});
		}
	});

export const marketplaceItemIdParamSchema = z.object({
	id: z.string().min(1, "Marketplace item id is required"),
});

export const marketplaceImageParamSchema = z.object({
	id: z.string().min(1, "Marketplace item id is required"),
	imageId: z.string().min(1, "Image id is required"),
});

export const searchMarketplaceQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	size: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	adType: z.enum(MarketplaceAdType).optional(),
	category: z.string().optional(),
	city: z.string().optional(),
	district: z.string().optional(),
	minPrice: z.coerce.number().positive().optional(),
	maxPrice: z.coerce.number().positive().optional(),
	sortBy: z.enum(["price", "createdAt"]).default("createdAt"),
	sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const reportMarketplaceItemSchema = z.object({
	reason: z.enum(MarketplaceReportReason),
	details: z.string().max(500).optional(),
});

export const resolveMarketplaceReportSchema = z.object({
	status: z.enum(MarketplaceReportStatus),
	notes: z.string().max(500).optional(),
});

export const marketplaceReportIdParamSchema = z.object({
	reportId: z.string().min(1, "Report id is required"),
});

export const adminTakedownSchema = z.object({
	reason: z.string().min(5).max(500).optional(),
});

export type CreateMarketplaceItemInput = z.infer<
	typeof createMarketplaceItemSchema
>;
export type UpdateMarketplaceItemInput = z.infer<
	typeof updateMarketplaceItemSchema
>;
export type SearchMarketplaceQuery = z.infer<typeof searchMarketplaceQuerySchema>;
export type ReportMarketplaceItemInput = z.infer<
	typeof reportMarketplaceItemSchema
>;
export type ResolveMarketplaceReportInput = z.infer<
	typeof resolveMarketplaceReportSchema
>;
