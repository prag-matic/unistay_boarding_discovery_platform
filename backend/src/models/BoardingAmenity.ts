import mongoose, { type Document, Schema } from "mongoose";
import { BoardingAmenityType } from "@/types/enums.js";

export interface IBoardingAmenity extends Document {
	boardingId: mongoose.Types.ObjectId;
	name: BoardingAmenityType;
	createdAt: Date;
}

const boardingAmenitySchema = new Schema<IBoardingAmenity>(
	{
		boardingId: {
			type: Schema.Types.ObjectId,
			ref: "Boarding",
			required: true,
		},
		name: {
			type: String,
			enum: Object.values(BoardingAmenityType),
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

boardingAmenitySchema.index({ boardingId: 1 });
boardingAmenitySchema.index({ boardingId: 1, name: 1 }, { unique: true });

export const BoardingAmenity = mongoose.model<IBoardingAmenity>(
	"BoardingAmenity",
	boardingAmenitySchema,
);
