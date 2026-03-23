import mongoose, { type Document, Schema, type Types } from "mongoose";
import { ReactionType } from "@/types/enums.js";

export interface IReviewReaction extends Document {
	reviewId: Types.ObjectId;
	userId: Types.ObjectId;
	type: ReactionType;
	createdAt: Date;
}

const reviewReactionSchema = new Schema<IReviewReaction>(
	{
		reviewId: {
			type: Schema.Types.ObjectId,
			ref: "Review",
			required: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		type: {
			type: String,
			enum: Object.values(ReactionType),
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

reviewReactionSchema.index({ reviewId: 1 });
reviewReactionSchema.index({ userId: 1 });
reviewReactionSchema.index({ reviewId: 1, userId: 1 }, { unique: true });

export const ReviewReaction = mongoose.model<IReviewReaction>(
	"ReviewReaction",
	reviewReactionSchema,
);
