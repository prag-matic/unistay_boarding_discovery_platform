import mongoose, { type Document, Schema } from "mongoose";

export interface IIssue extends Document {
	roomId: mongoose.Types.ObjectId;
	boardingId?: mongoose.Types.ObjectId;
	reportedBy: mongoose.Types.ObjectId;
	assignedTo?: mongoose.Types.ObjectId;
	title: string;
	description: string;
	reason: string;
	status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
	priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
	category?: string;
	messageContext: {
		messageId: mongoose.Types.ObjectId;
		content: string;
		senderId: mongoose.Types.ObjectId;
		createdAt: Date;
	}[];
	resolvedAt?: Date;
	resolvedBy?: mongoose.Types.ObjectId;
	resolutionNotes?: string;
	createdAt: Date;
	updatedAt: Date;
}

const issueSchema = new Schema<IIssue>(
	{
		roomId: {
			type: Schema.Types.ObjectId,
			ref: "ChatRoom",
			required: true,
		},
		boardingId: {
			type: Schema.Types.ObjectId,
			ref: "Boarding",
		},
		reportedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		assignedTo: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
		},
		reason: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
			default: "OPEN",
		},
		priority: {
			type: String,
			enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
			default: "MEDIUM",
		},
		category: {
			type: String,
			trim: true,
		},
		messageContext: [
			{
				messageId: {
					type: Schema.Types.ObjectId,
					ref: "ChatMessage",
					required: true,
				},
				content: {
					type: String,
					required: true,
				},
				senderId: {
					type: Schema.Types.ObjectId,
					ref: "User",
					required: true,
				},
				createdAt: {
					type: Date,
					required: true,
				},
			},
		],
		resolvedAt: {
			type: Date,
		},
		resolvedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		resolutionNotes: {
			type: String,
			trim: true,
		},
	},
	{
		timestamps: true,
	},
);

issueSchema.index({ roomId: 1, status: 1 });
issueSchema.index({ reportedBy: 1, createdAt: -1 });
issueSchema.index({ assignedTo: 1, status: 1 });
issueSchema.index({ boardingId: 1, status: 1 });
issueSchema.index({ status: 1, priority: 1, createdAt: -1 });

export const Issue = mongoose.model<IIssue>("Issue", issueSchema);
