import mongoose, { type Document, Schema } from "mongoose";

export interface IRefreshToken extends Document {
	tokenHash: string;
	userId: mongoose.Types.ObjectId;
	expiresAt: Date;
	createdAt: Date;
	revokedAt?: Date;
	replacedByTokenId?: mongoose.Types.ObjectId;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
	{
		tokenHash: {
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
		revokedAt: {
			type: Date,
			default: null,
		},
		replacedByTokenId: {
			type: Schema.Types.ObjectId,
			ref: "RefreshToken",
		},
	},
	{
		timestamps: true,
	},
);

refreshTokenSchema.index({ userId: 1 });

export const RefreshToken = mongoose.model<IRefreshToken>(
	"RefreshToken",
	refreshTokenSchema,
);
