import mongoose, { type Document, Schema, type Types } from "mongoose";
import {
	MarketplaceAdType,
	MarketplaceCondition,
	MarketplaceStatus,
} from "@/types/enums.js";

export interface IMarketplaceImage {
	_id?: Types.ObjectId;
	url: string;
	publicId: string;
	createdAt: Date;
}

export interface IMarketplaceItem extends Document {
	sellerId: Types.ObjectId;
	title: string;
	description: string;
	adType: MarketplaceAdType;
	category: string;
	itemCondition: MarketplaceCondition;
	price?: number;
	city: string;
	district: string;
	status: MarketplaceStatus;
	takedownReason?: string;
	reportCount: number;
	lastReportedAt?: Date;
	images: IMarketplaceImage[];
	isDeleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const marketplaceImageSchema = new Schema<IMarketplaceImage>(
	{
		url: { type: String, required: true },
		publicId: { type: String, required: true },
		createdAt: { type: Date, default: Date.now },
	},
	{ _id: true },
);

const marketplaceItemSchema = new Schema<IMarketplaceItem>(
	{
		sellerId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
		},
		adType: {
			type: String,
			enum: Object.values(MarketplaceAdType),
			required: true,
		},
		category: {
			type: String,
			required: true,
			trim: true,
		},
		itemCondition: {
			type: String,
			enum: Object.values(MarketplaceCondition),
			required: true,
		},
		price: {
			type: Number,
			min: 0,
			required: false,
		},
		city: {
			type: String,
			required: true,
			trim: true,
		},
		district: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			enum: Object.values(MarketplaceStatus),
			default: MarketplaceStatus.ACTIVE,
		},
		takedownReason: {
			type: String,
			required: false,
		},
		reportCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		lastReportedAt: {
			type: Date,
			required: false,
		},
		images: {
			type: [marketplaceImageSchema],
			default: [],
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	},
);

marketplaceItemSchema.path("price").validate(function (value: number | undefined) {
	if (this.adType === MarketplaceAdType.SELL) {
		return typeof value === "number" && value > 0;
	}
	return value === undefined || value === null || value === 0;
}, "Price is required and must be greater than zero for SELL listings");

marketplaceItemSchema.index({ sellerId: 1, createdAt: -1 });
marketplaceItemSchema.index({ status: 1, createdAt: -1 });
marketplaceItemSchema.index({ adType: 1, category: 1 });
marketplaceItemSchema.index({ city: 1, district: 1 });
marketplaceItemSchema.index({ isDeleted: 1, createdAt: -1 });
marketplaceItemSchema.index({ title: "text", description: "text", category: "text" });

export const MarketplaceItem = mongoose.model<IMarketplaceItem>(
	"MarketplaceItem",
	marketplaceItemSchema,
);
