import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import { ChatMessage } from "@/models/ChatMessage.js";
import { ChatRoom } from "@/models/ChatRoom.js";
import { Issue } from "@/models/Issue.js";
import { User } from "@/models/User.js";
import { chatAnalysisService } from "@/services/chatAnalysis.service.js";

// POST /api/issues - Create an issue from a chat message
export async function createIssue(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const {
			roomId,
			messageId,
			reason,
			title,
			description,
			priority,
			category,
		} = req.body;

		if (
			!roomId ||
			!messageId ||
			!reason ||
			Array.isArray(roomId) ||
			Array.isArray(messageId) ||
			!Types.ObjectId.isValid(roomId) ||
			!Types.ObjectId.isValid(messageId)
		) {
			throw new BadRequestError("Invalid room or message ID format");
		}

		// Verify the chat room exists and user is a participant
		const chatRoom = await ChatRoom.findById(roomId).lean();
		if (!chatRoom) {
			throw new NotFoundError("Chat room not found");
		}

		const isStudent =
			chatRoom.participants.student.toString() === req.user.userId;
		const isOwner = chatRoom.participants.owner.toString() === req.user.userId;

		if (!isStudent && !isOwner) {
			throw new ForbiddenError("You are not a participant in this chat room");
		}

		// Verify the message exists and belongs to the room
		const message = await ChatMessage.findOne({
			_id: new Types.ObjectId(messageId),
			roomId: new Types.ObjectId(roomId),
		}).lean();

		if (!message) {
			throw new NotFoundError("Message not found in this chat room");
		}

		// Get recent message context (last 10 messages)
		const recentMessages = await ChatMessage.find({
			roomId: new Types.ObjectId(roomId),
			createdAt: { $lte: message.createdAt },
		})
			.sort({ createdAt: -1 })
			.limit(10)
			.populate("senderId", "role")
			.lean();

		const messageContext = recentMessages.map((msg) => ({
			content: msg.content,
			senderRole: (msg.senderId as unknown as { role: string }).role,
			createdAt: msg.createdAt,
		}));

		// Analyze the message with AI (if not already analyzed)
		let analysisResult = null;
		if (!reason) {
			analysisResult = await chatAnalysisService.analyzeMessage(
				message.content,
				messageContext,
			);

			if (!analysisResult.isIssue) {
				throw new BadRequestError(
					"The message does not appear to contain an issue. AI analysis: " +
						analysisResult.reason,
				);
			}
		}

		// Generate a title if not provided
		let issueTitle = title;
		if (!issueTitle) {
			issueTitle = await chatAnalysisService.generateIssueTitle(
				message.content,
			);
		}

		// Create the issue
		const issue = await Issue.create({
			roomId: new Types.ObjectId(roomId),
			boardingId: chatRoom.boardingId,
			reportedBy: new Types.ObjectId(req.user.userId),
			title: issueTitle,
			description: description || message.content,
			reason: reason || analysisResult?.reason || "Issue reported from chat",
			status: "OPEN",
			priority: priority || analysisResult?.suggestedPriority || "MEDIUM",
			category: category || analysisResult?.category,
			messageContext: [
				{
					messageId: message._id,
					content: message.content,
					senderId: message.senderId,
					createdAt: message.createdAt,
				},
			],
		});

		const populatedIssue = await Issue.findById(issue._id)
			.populate("reportedBy", "firstName lastName email role")
			.populate("assignedTo", "firstName lastName email role")
			.populate("roomId", "participants")
			.lean();

		sendSuccess(res, populatedIssue, "Issue created successfully");
	} catch (error) {
		next(error);
	}
}

// GET /api/issues - Get all issues for the authenticated user
export async function getIssues(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const { status, priority, roomId, cursor, limit = 20 } = req.query;

		const userId = new Types.ObjectId(req.user.userId);
		const userRole = req.user.role;

		// Build query based on user role
		const query: Record<string, unknown> = {};

		if (userRole === "STUDENT") {
			// Students can only see issues they reported or were assigned to them
			query.$or = [{ reportedBy: userId }, { assignedTo: userId }];
		} else if (userRole === "OWNER") {
			// Owners can see all issues for their boarding houses
			// Get all chat rooms where the user is an owner
			const ownerChatRooms = await ChatRoom.find({
				"participants.owner": userId,
			}).distinct("roomId");

			query.roomId = { $in: ownerChatRooms };
		} else if (userRole === "ADMIN") {
			// Admins can see all issues
		} else {
			throw new ForbiddenError("Invalid user role");
		}

		// Apply filters
		if (status && typeof status === "string") {
			query.status = status;
		}
		if (priority && typeof priority === "string") {
			query.priority = priority;
		}
		if (
			roomId &&
			typeof roomId === "string" &&
			!Array.isArray(roomId) &&
			Types.ObjectId.isValid(roomId)
		) {
			query.roomId = new Types.ObjectId(roomId);
		}

		// Build query with pagination
		const issuesQuery = Issue.find(query)
			.populate("reportedBy", "firstName lastName email role profileImageUrl")
			.populate("assignedTo", "firstName lastName email role profileImageUrl")
			.populate("roomId", "participants boardingId")
			.populate("boardingId", "propertyName address city")
			.sort({ createdAt: -1 })
			.limit(Number(limit) + 1);

		if (cursor) {
			const lastIssue = await Issue.findById(cursor);
			if (lastIssue?.createdAt) {
				issuesQuery.where("createdAt").lt(lastIssue.createdAt.getTime());
			}
		}

		const issues = await issuesQuery.lean();

		const hasMore = issues.length > Number(limit);
		const result = hasMore ? issues.slice(0, Number(limit)) : issues;

		const nextCursor =
			hasMore && result.length > 0
				? (result[result.length - 1] as { _id: Types.ObjectId })._id.toString()
				: undefined;

		sendSuccess(res, {
			issues: result,
			nextCursor,
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/issues/:id - Get a specific issue
export async function getIssue(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const { id } = req.params;

		if (Array.isArray(id) || !Types.ObjectId.isValid(id)) {
			throw new BadRequestError("Invalid issue ID format");
		}

		const issue = await Issue.findById(id)
			.populate("reportedBy", "firstName lastName email role profileImageUrl")
			.populate("assignedTo", "firstName lastName email role profileImageUrl")
			.populate("roomId", "participants boardingId")
			.populate("boardingId", "propertyName address city")
			.populate("messageContext.messageId", "content messageType createdAt")
			.populate("messageContext.senderId", "firstName lastName role")
			.lean();

		if (!issue) {
			throw new NotFoundError("Issue not found");
		}

		// Verify user has access to this issue
		const userRole = req.user.role;
		const isReporter = issue.reportedBy._id.toString() === req.user.userId;
		const isAssignee = issue.assignedTo?._id.toString() === req.user.userId;

		if (userRole === "STUDENT" && !isReporter && !isAssignee) {
			throw new ForbiddenError("You don't have access to this issue");
		}

		if (userRole === "OWNER") {
			// Verify owner is part of the chat room
			const chatRoom = await ChatRoom.findById(issue.roomId._id);
			if (!chatRoom) {
				throw new NotFoundError("Chat room not found");
			}

			const isOwner =
				chatRoom.participants.owner.toString() === req.user.userId;
			if (!isOwner) {
				throw new ForbiddenError("You don't have access to this issue");
			}
		}

		sendSuccess(res, issue);
	} catch (error) {
		next(error);
	}
}

// PUT /api/issues/:id - Update an issue (status, priority, assignment, etc.)
export async function updateIssue(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const { id } = req.params;
		const { status, priority, assignedTo, resolutionNotes } = req.body;

		if (Array.isArray(id) || !Types.ObjectId.isValid(id)) {
			throw new BadRequestError("Invalid issue ID format");
		}

		const issue = await Issue.findById(id).lean();
		if (!issue) {
			throw new NotFoundError("Issue not found");
		}

		// Verify user has permission to update this issue
		const userRole = req.user.role;
		const isReporter = issue.reportedBy.toString() === req.user.userId;
		const isAssignee = issue.assignedTo?.toString() === req.user.userId;

		// Only owners, admins, or assigned users can update issues
		if (userRole === "STUDENT" && !isReporter && !isAssignee) {
			throw new ForbiddenError(
				"You don't have permission to update this issue",
			);
		}

		// Build update object
		const update: Record<string, unknown> = {};

		if (status) {
			if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) {
				throw new BadRequestError("Invalid status value");
			}
			update.status = status;

			if (status === "RESOLVED" || status === "CLOSED") {
				update.resolvedAt = new Date();
				update.resolvedBy = new Types.ObjectId(req.user.userId);
			}
		}

		if (priority) {
			if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
				throw new BadRequestError("Invalid priority value");
			}
			update.priority = priority;
		}

		if (assignedTo) {
			if (!Types.ObjectId.isValid(assignedTo)) {
				throw new BadRequestError("Invalid assigned user ID");
			}

			// Verify the assigned user exists and is an owner or admin
			const assignedUser = await User.findById(assignedTo);
			if (!assignedUser) {
				throw new NotFoundError("User not found");
			}

			if (assignedUser.role !== "OWNER" && assignedUser.role !== "ADMIN") {
				throw new ForbiddenError("Can only assign issues to owners or admins");
			}

			update.assignedTo = new Types.ObjectId(assignedTo);
		}

		if (resolutionNotes) {
			update.resolutionNotes = resolutionNotes;
		}

		const updatedIssue = await Issue.findByIdAndUpdate(id, update, {
			new: true,
		})
			.populate("reportedBy", "firstName lastName email role profileImageUrl")
			.populate("assignedTo", "firstName lastName email role profileImageUrl")
			.populate("roomId", "participants boardingId")
			.populate("boardingId", "propertyName address city")
			.lean();

		sendSuccess(res, updatedIssue, "Issue updated successfully");
	} catch (error) {
		next(error);
	}
}

// DELETE /api/issues/:id - Delete an issue (soft delete or hard delete based on requirements)
export async function deleteIssue(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const { id } = req.params;

		if (Array.isArray(id) || !Types.ObjectId.isValid(id)) {
			throw new BadRequestError("Invalid issue ID format");
		}

		const issue = await Issue.findById(id).lean();
		if (!issue) {
			throw new NotFoundError("Issue not found");
		}

		// Only admins or the reporter can delete issues
		if (
			req.user.role !== "ADMIN" &&
			issue.reportedBy.toString() !== req.user.userId
		) {
			throw new ForbiddenError(
				"You don't have permission to delete this issue",
			);
		}

		await Issue.findByIdAndDelete(id);

		sendSuccess(res, null, "Issue deleted successfully");
	} catch (error) {
		next(error);
	}
}

// POST /api/issues/analyze - Analyze a message without creating an issue
export async function analyzeMessage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		const { roomId, messageId } = req.body;

		if (
			!roomId ||
			!messageId ||
			Array.isArray(roomId) ||
			Array.isArray(messageId) ||
			!Types.ObjectId.isValid(roomId) ||
			!Types.ObjectId.isValid(messageId)
		) {
			throw new BadRequestError("Invalid room or message ID format");
		}

		// Verify the chat room exists and user is a participant
		const chatRoom = await ChatRoom.findById(roomId).lean();
		if (!chatRoom) {
			throw new NotFoundError("Chat room not found");
		}

		const isStudent =
			chatRoom.participants.student.toString() === req.user.userId;
		const isOwner = chatRoom.participants.owner.toString() === req.user.userId;

		if (!isStudent && !isOwner) {
			throw new ForbiddenError("You are not a participant in this chat room");
		}

		// Get the message
		const message = await ChatMessage.findOne({
			_id: new Types.ObjectId(messageId),
			roomId: new Types.ObjectId(roomId),
		}).lean();

		if (!message) {
			throw new NotFoundError("Message not found in this chat room");
		}

		// Get recent message context
		const recentMessages = await ChatMessage.find({
			roomId: new Types.ObjectId(roomId),
			createdAt: { $lte: message.createdAt },
		})
			.sort({ createdAt: -1 })
			.limit(10)
			.populate("senderId", "role")
			.lean();

		const messageContext = recentMessages.map((msg) => ({
			content: msg.content,
			senderRole: (msg.senderId as unknown as { role: string }).role,
			createdAt: msg.createdAt,
		}));

		// Analyze the message
		const analysisResult = await chatAnalysisService.analyzeMessage(
			message.content,
			messageContext,
		);

		sendSuccess(res, {
			messageId: message._id,
			roomId,
			analysis: analysisResult,
		});
	} catch (error) {
		next(error);
	}
}
