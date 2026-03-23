import mongoose, { type Document, Schema, type Types } from "mongoose";

export interface IReview extends Document {
	boardingId: Types.ObjectId;
	studentId: Types.ObjectId;
	rating: number;
	comment?: string;
	commentedAt: Date;
	editedAt?: Date;
	likeCount: number;
	dislikeCount: number;
	images: string[];
	video?: string;
	createdAt: Date;
	updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
	{
		boardingId: {
			type: Schema.Types.ObjectId,
			ref: "Boarding",
			required: true,
		},
		studentId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		comment: String,
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
		images: {
			type: [String],
			default: [],
		},
		video: String,
	},
	{
		timestamps: true,
	},
);

reviewSchema.index({ boardingId: 1 });
reviewSchema.index({ studentId: 1 });
reviewSchema.index({ rating: 1 });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
