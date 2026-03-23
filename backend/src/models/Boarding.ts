import mongoose, { type Document, Schema, type Types } from "mongoose";
import { BoardingStatus, BoardingType, GenderPref } from "@/types/enums.js";

export interface IBoarding extends Document {
	ownerId: Types.ObjectId;
	title: string;
	slug: string;
	description: string;
	city: string;
	district: string;
	address?: string;
	monthlyRent: number;
	boardingType: BoardingType;
	genderPref: GenderPref;
	nearUniversity?: string;
	latitude: number;
	longitude: number;
	maxOccupants: number;
	currentOccupants: number;
	status: BoardingStatus;
	rejectionReason?: string;
	isDeleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const boardingSchema = new Schema<IBoarding>(
	{
		ownerId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		title: {
			type: String,
			required: true,
		},
		slug: {
			type: String,
			required: true,
			unique: true,
		},
		description: {
			type: String,
			required: true,
		},
		city: {
			type: String,
			required: true,
		},
		district: {
			type: String,
			required: true,
		},
		address: String,
		monthlyRent: {
			type: Number,
			required: true,
		},
		boardingType: {
			type: String,
			enum: Object.values(BoardingType),
			required: true,
		},
		genderPref: {
			type: String,
			enum: Object.values(GenderPref),
			required: true,
		},
		nearUniversity: String,
		latitude: {
			type: Number,
			required: true,
		},
		longitude: {
			type: Number,
			required: true,
		},
		maxOccupants: {
			type: Number,
			required: true,
		},
		currentOccupants: {
			type: Number,
			default: 0,
		},
		status: {
			type: String,
			enum: Object.values(BoardingStatus),
			default: BoardingStatus.DRAFT,
		},
		rejectionReason: String,
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	},
);

boardingSchema.index({ slug: 1 });
boardingSchema.index({ ownerId: 1 });
boardingSchema.index({ city: 1 });
boardingSchema.index({ district: 1 });
boardingSchema.index({ status: 1 });
boardingSchema.index({ isDeleted: 1 });
boardingSchema.index({ monthlyRent: 1 });
boardingSchema.index({ boardingType: 1 });
boardingSchema.index({ genderPref: 1 });

export const Boarding = mongoose.model<IBoarding>("Boarding", boardingSchema);
