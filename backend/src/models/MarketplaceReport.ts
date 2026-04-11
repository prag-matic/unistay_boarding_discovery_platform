import mongoose, { type Document, Schema, type Types } from "mongoose";
import {
	MarketplaceReportReason,
	MarketplaceReportStatus,
} from "@/types/enums.js";

export interface IMarketplaceReport extends Document {
	itemId: Types.ObjectId;
	reporterId: Types.ObjectId;
	reason: MarketplaceReportReason;
	details?: string;
	status: MarketplaceReportStatus;
	handledBy?: Types.ObjectId;
	handledAt?: Date;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
}

const marketplaceReportSchema = new Schema<IMarketplaceReport>(
	{
		itemId: {
			type: Schema.Types.ObjectId,
			ref: "MarketplaceItem",
			required: true,
		},
		reporterId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		reason: {
			type: String,
			enum: Object.values(MarketplaceReportReason),
			required: true,
		},
		details: {
			type: String,
			required: false,
			trim: true,
		},
		status: {
			type: String,
			enum: Object.values(MarketplaceReportStatus),
			default: MarketplaceReportStatus.OPEN,
		},
		handledBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
		handledAt: {
			type: Date,
			required: false,
		},
		notes: {
			type: String,
			required: false,
			trim: true,
		},
	},
	{
		timestamps: true,
	},
);

marketplaceReportSchema.index({ itemId: 1, createdAt: -1 });
marketplaceReportSchema.index({ reporterId: 1, createdAt: -1 });
marketplaceReportSchema.index({ status: 1, createdAt: -1 });
marketplaceReportSchema.index({ itemId: 1, reporterId: 1, status: 1 });

export const MarketplaceReport = mongoose.model<IMarketplaceReport>(
	"MarketplaceReport",
	marketplaceReportSchema,
);
