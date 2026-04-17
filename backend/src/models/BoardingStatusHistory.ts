import mongoose, { type Document, Schema, type Types } from "mongoose";
import { BoardingStatus, Role } from "@/types/enums.js";

export interface IBoardingStatusHistory extends Document {
	boardingId: Types.ObjectId;
	fromStatus: BoardingStatus;
	toStatus: BoardingStatus;
	action: string;
	actorId?: Types.ObjectId;
	actorRole: Role | "SYSTEM";
	reason?: string;
	note?: string;
	createdAt: Date;
	updatedAt: Date;
}

const boardingStatusHistorySchema = new Schema<IBoardingStatusHistory>(
	{
		boardingId: {
			type: Schema.Types.ObjectId,
			ref: "Boarding",
			required: true,
		},
		fromStatus: {
			type: String,
			enum: Object.values(BoardingStatus),
			required: true,
		},
		toStatus: {
			type: String,
			enum: Object.values(BoardingStatus),
			required: true,
		},
		action: {
			type: String,
			required: true,
		},
		actorId: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		actorRole: {
			type: String,
			enum: [...Object.values(Role), "SYSTEM"],
			required: true,
		},
		reason: String,
		note: String,
	},
	{
		timestamps: true,
	},
);

boardingStatusHistorySchema.index({ boardingId: 1, createdAt: -1 });
boardingStatusHistorySchema.index({ actorId: 1, createdAt: -1 });

export const BoardingStatusHistory = mongoose.model<IBoardingStatusHistory>(
	"BoardingStatusHistory",
	boardingStatusHistorySchema,
);
