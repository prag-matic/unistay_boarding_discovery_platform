import mongoose, { type Document, Schema } from "mongoose";
import { RentalPeriodStatus } from "@/types/enums.js";
import type { IPayment } from "./Payment.js";

export interface IRentalPeriod extends Document {
	reservationId: mongoose.Types.ObjectId;
	periodLabel: string;
	dueDate: Date;
	amountDue: number;
	status: RentalPeriodStatus;
	createdAt: Date;
	updatedAt: Date;
	payments?: IPayment[];
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
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
);

// Virtual population for payments
rentalPeriodSchema.virtual("payments", {
	ref: "Payment",
	localField: "_id",
	foreignField: "rentalPeriodId",
});

rentalPeriodSchema.index({ reservationId: 1 });
rentalPeriodSchema.index({ status: 1 });
rentalPeriodSchema.index({ dueDate: 1 });

export const RentalPeriod = mongoose.model<IRentalPeriod>(
	"RentalPeriod",
	rentalPeriodSchema,
);
