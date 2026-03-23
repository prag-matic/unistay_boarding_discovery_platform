import mongoose, { type Document, Schema } from "mongoose";
import { RentalPeriodStatus } from "@/types/enums.js";

export interface IRentalPeriod extends Document {
	reservationId: mongoose.Types.ObjectId;
	periodLabel: string;
	dueDate: Date;
	amountDue: number;
	status: RentalPeriodStatus;
	createdAt: Date;
	updatedAt: Date;
}

const rentalPeriodSchema = new Schema<IRentalPeriod>(
	{
		reservationId: {
			type: Schema.Types.ObjectId,
			ref: "Reservation",
			required: true,
		},
		periodLabel: {
			type: String,
			required: true,
		},
		dueDate: {
			type: Date,
			required: true,
		},
		amountDue: {
			type: Number,
			required: true,
		},
		status: {
			type: String,
			enum: Object.values(RentalPeriodStatus),
			default: RentalPeriodStatus.UPCOMING,
		},
	},
	{
		timestamps: true,
	},
);

rentalPeriodSchema.index({ reservationId: 1 });
rentalPeriodSchema.index({ status: 1 });
rentalPeriodSchema.index({ dueDate: 1 });

export const RentalPeriod = mongoose.model<IRentalPeriod>(
	"RentalPeriod",
	rentalPeriodSchema,
);
