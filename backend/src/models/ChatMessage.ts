import mongoose, { type Document, Schema } from "mongoose";

export interface IChatMessage extends Document {
	roomId: mongoose.Types.ObjectId;
	senderId: mongoose.Types.ObjectId;
	content: string;
	messageType: "text" | "image" | "file";
	isRead: boolean;
	readAt?: Date;
	deletedBy?: mongoose.Types.ObjectId[];
	createdAt: Date;
	updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
	{
		roomId: {
			type: Schema.Types.ObjectId,
			ref: "ChatRoom",
			required: true,
		},
		senderId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		content: {
			type: String,
			required: true,
			trim: true,
		},
		messageType: {
			type: String,
			enum: ["text", "image", "file"],
			default: "text",
		},
		isRead: {
			type: Boolean,
			default: false,
		},
		readAt: {
			type: Date,
		},
		deletedBy: {
			type: [Schema.Types.ObjectId],
			ref: "User",
			default: [],
		},
	},
	{
		timestamps: true,
	},
);

chatMessageSchema.index({ roomId: 1, createdAt: 1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });

export const ChatMessage = mongoose.model<IChatMessage>(
	"ChatMessage",
	chatMessageSchema,
);
