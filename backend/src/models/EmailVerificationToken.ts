import mongoose, { type Document, Schema } from "mongoose";

export interface IEmailVerificationToken extends Document {
	token: string;
	userId: mongoose.Types.ObjectId;
	expiresAt: Date;
	createdAt: Date;
}

const emailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
	{
		token: {
			type: String,
			required: true,
			unique: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		expiresAt: {
			type: Date,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

emailVerificationTokenSchema.index({ token: 1 });
emailVerificationTokenSchema.index({ userId: 1 });

export const EmailVerificationToken = mongoose.model<IEmailVerificationToken>(
	"EmailVerificationToken",
	emailVerificationTokenSchema,
);
