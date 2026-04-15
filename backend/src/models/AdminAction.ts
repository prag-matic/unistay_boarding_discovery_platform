import mongoose, { type Document, Schema, type Types } from "mongoose";

export interface IAdminAction extends Document {
	adminId: Types.ObjectId;
	action: string;
	targetType: "USER" | "BOARDING" | "PAYMENT" | "REVIEW" | "SYSTEM";
	targetIds: string[];
	metadata?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
	createdAt: Date;
	updatedAt: Date;
}

const adminActionSchema = new Schema<IAdminAction>(
	{
		adminId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		action: {
			type: String,
			required: true,
			trim: true,
		},
		targetType: {
			type: String,
			enum: ["USER", "BOARDING", "PAYMENT", "REVIEW", "SYSTEM"],
			required: true,
		},
		targetIds: {
			type: [String],
			required: true,
			default: [],
		},
		metadata: {
			type: Schema.Types.Mixed,
			required: false,
		},
		ipAddress: {
			type: String,
			required: false,
			trim: true,
		},
		userAgent: {
			type: String,
			required: false,
			trim: true,
		},
	},
	{
		timestamps: true,
	},
);

adminActionSchema.index({ adminId: 1, createdAt: -1 });
adminActionSchema.index({ action: 1, createdAt: -1 });
adminActionSchema.index({ targetType: 1, createdAt: -1 });

export const AdminAction = mongoose.model<IAdminAction>(
	"AdminAction",
	adminActionSchema,
);
