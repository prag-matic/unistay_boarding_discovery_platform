import mongoose, { type Document, Schema } from "mongoose";
import { Role } from "@/types/enums.js";

export interface IUser extends Document {
	email: string;
	passwordHash: string;
	firstName: string;
	lastName: string;
	role: Role;
	phone?: string;
	university?: string;
	nicNumber?: string;
	profileImageUrl?: string;
	isVerified: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const userSchema = new Schema<IUser>(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		passwordHash: {
			type: String,
			required: true,
		},
		firstName: {
			type: String,
			required: true,
		},
		lastName: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: Object.values(Role),
			default: Role.STUDENT,
		},
		phone: String,
		university: String,
		nicNumber: String,
		profileImageUrl: String,
		isVerified: {
			type: Boolean,
			default: false,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	},
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
