import mongoose, { type Document, Schema, type Types } from "mongoose";

export interface IReviewComment extends Document {
	reviewId: Types.ObjectId;
	commentorId: Types.ObjectId;
	comment: string;
	commentedAt: Date;
	editedAt?: Date;
	likeCount: number;
	dislikeCount: number;
	createdAt: Date;
	updatedAt: Date;
}

const reviewCommentSchema = new Schema<IReviewComment>(
	{
		reviewId: {
			type: Schema.Types.ObjectId,
			ref: "Review",
			required: true,
		},
		commentorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		comment: {
			type: String,
			required: true,
		},
		commentedAt: {
			type: Date,
			default: Date.now,
		},
		editedAt: Date,
		likeCount: {
			type: Number,
			default: 0,
		},
		dislikeCount: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
	},
);

reviewCommentSchema.index({ reviewId: 1 });
reviewCommentSchema.index({ commentorId: 1 });

export const ReviewComment = mongoose.model<IReviewComment>(
	"ReviewComment",
	reviewCommentSchema,
);
