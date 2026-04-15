import mongoose, { type Document, Schema, type Types } from "mongoose";
import { ReservationStatus } from "@/types/enums.js";

export interface IReservation extends Document {
	studentId: Types.ObjectId;
	boardingId: Types.ObjectId;
	status: ReservationStatus;
	moveInDate: Date;
	specialRequests?: string;
	rentSnapshot: number;
	boardingSnapshot: Record<string, unknown>;
	rejectionReason?: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		boardingId: {
			type: Schema.Types.ObjectId,
			ref: "Boarding",
			required: true,
		},
		status: {
			type: String,
			enum: Object.values(ReservationStatus),
			default: ReservationStatus.PENDING,
		},
		moveInDate: {
			type: Date,
			required: true,
		},
		specialRequests: String,
		rentSnapshot: {
			type: Number,
			required: true,
		},
		boardingSnapshot: {
			type: Schema.Types.Mixed,
			required: true,
		},
		rejectionReason: String,
		expiresAt: {
			type: Date,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

reservationSchema.index({ studentId: 1 });
reservationSchema.index({ boardingId: 1 });
reservationSchema.index({ status: 1 });

export const Reservation = mongoose.model<IReservation>(
	"Reservation",
	reservationSchema,
);
