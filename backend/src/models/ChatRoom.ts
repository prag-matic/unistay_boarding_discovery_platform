import mongoose, { type Document, Schema } from "mongoose";

export interface IChatRoom extends Document {
	participants: {
		student: mongoose.Types.ObjectId;
		owner: mongoose.Types.ObjectId;
	};
	boardingId?: mongoose.Types.ObjectId;
	lastMessage?: mongoose.Types.ObjectId;
	lastMessageAt?: Date;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const chatRoomSchema = new Schema<IChatRoom>(
	{
		participants: {
			student: {
				type: Schema.Types.ObjectId,
				ref: "User",
				required: true,
			},
			owner: {
				type: Schema.Types.ObjectId,
				ref: "User",
				required: true,
			},
		},
		boardingId: {
			type: Schema.Types.ObjectId,
			ref: "Boarding",
		},
		lastMessage: {
			type: Schema.Types.ObjectId,
			ref: "ChatMessage",
		},
		lastMessageAt: {
			type: Date,
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

// Compound index to ensure unique room between student and owner
chatRoomSchema.index({ "participants.student": 1, "participants.owner": 1 });
chatRoomSchema.index({ "participants.owner": 1, "participants.student": 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

export const ChatRoom = mongoose.model<IChatRoom>("ChatRoom", chatRoomSchema);
