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
import { ChatRoom, type IChatRoom } from "@/models/ChatRoom.js";
import { User } from "@/models/User.js";
import type {
	CreateChatRoomInput,
	GetChatHistoryInput,
	GetChatRoomsInput,
} from "@/schemas/chat.validators.js";

// Helper function to check if user is a student or owner
function validateUserRole(role: string): void {
	if (role !== "STUDENT" && role !== "OWNER") {
		throw new ForbiddenError("Chat is only available for students and owners");
	}
}

// Helper function to check if user is a participant in the chat room
function isParticipant(
	chatRoom: IChatRoom,
	userId: string,
): { isStudent: boolean; isOwner: boolean } {
	const isStudent = chatRoom.participants.student.toString() === userId;
	const isOwner = chatRoom.participants.owner.toString() === userId;
	return { isStudent, isOwner };
}

// GET /api/chat/rooms - Get all chat rooms for the authenticated user
export async function getChatRooms(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const query = req.query as unknown as GetChatRoomsInput;
		const limit = query.limit || 20;
		const cursor = query.cursor;

		const userId = new Types.ObjectId(req.user.userId);

		// Find all chat rooms where the user is a participant
		const matchCondition =
			req.user.role === "STUDENT"
				? { "participants.student": userId }
				: { "participants.owner": userId };

		const chatRoomsQuery = ChatRoom.find(matchCondition)
			.populate(
				"participants.student",
				"firstName lastName profileImageUrl email",
			)
			.populate(
				"participants.owner",
				"firstName lastName profileImageUrl email",
			)
			.populate("lastMessage", "content messageType createdAt")
			.populate("boardingId", "propertyName address city")
			.sort({ lastMessageAt: -1 })
			.limit(limit + 1);

		if (cursor) {
			const lastRoom = await ChatRoom.findById(cursor);
			if (lastRoom?.lastMessageAt) {
				chatRoomsQuery
					.where("lastMessageAt")
					.lt(lastRoom.lastMessageAt.getTime());
			}
		}

		const chatRooms = await chatRoomsQuery.lean();

		const hasMore = chatRooms.length > limit;
		const rawResult = hasMore ? chatRooms.slice(0, limit) : chatRooms;

		const result = rawResult.map((room) => ({
			...room,
			id: room._id.toString(),
		}));

		const nextCursor =
			hasMore && rawResult.length > 0
				? (
						rawResult[rawResult.length - 1] as { _id: Types.ObjectId }
					)._id.toString()
				: undefined;

		sendSuccess(res, {
			rooms: result,
			nextCursor,
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/chat/rooms/:roomId - Get a specific chat room
export async function getChatRoom(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const { roomId } = req.params;

		if (Array.isArray(roomId) || !Types.ObjectId.isValid(roomId)) {
			throw new BadRequestError("Invalid room ID format");
		}

		const chatRoom = await ChatRoom.findById(roomId)
			.populate(
				"participants.student",
				"firstName lastName profileImageUrl email",
			)
			.populate(
				"participants.owner",
				"firstName lastName profileImageUrl email",
			)
			.populate("lastMessage", "content messageType createdAt")
			.populate("boardingId", "propertyName address city")
			.lean();

		if (!chatRoom) {
			throw new NotFoundError("Chat room not found");
		}

		// Verify user is a participant
		const { isStudent, isOwner } = isParticipant(
			chatRoom as unknown as IChatRoom,
			req.user.userId,
		);

		if (!isStudent && !isOwner) {
			throw new ForbiddenError("You are not a participant in this chat room");
		}

		sendSuccess(res, { ...chatRoom, id: chatRoom._id.toString() });
	} catch (error) {
		next(error);
	}
}

// POST /api/chat/rooms - Create or get existing chat room between two users
export async function createChatRoom(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const body = req.body as CreateChatRoomInput;

		if (!Types.ObjectId.isValid(body.otherUserId)) {
			throw new BadRequestError("Invalid user ID format");
		}

		const otherUser = await User.findById(body.otherUserId).lean();

		if (!otherUser) {
			throw new NotFoundError("User not found");
		}

		// Validate that the other user is either a student or owner
		if (otherUser.role !== "STUDENT" && otherUser.role !== "OWNER") {
			throw new ForbiddenError("Can only chat with students or owners");
		}

		// Validate that users have different roles (student <-> owner)
		if (req.user.role === otherUser.role) {
			throw new ForbiddenError(
				"Chat is only available between students and owners",
			);
		}

		// Determine who is the student and who is the owner
		const studentId =
			req.user.role === "STUDENT" ? req.user.userId : body.otherUserId;
		const ownerId =
			req.user.role === "OWNER" ? req.user.userId : body.otherUserId;

		// Check if a room already exists
		const existingRoom = await ChatRoom.findOne({
			"participants.student": new Types.ObjectId(studentId),
			"participants.owner": new Types.ObjectId(ownerId),
		}).lean();

		if (existingRoom) {
			const populatedExisting = await ChatRoom.findById(existingRoom._id)
				.populate(
					"participants.student",
					"firstName lastName profileImageUrl email",
				)
				.populate(
					"participants.owner",
					"firstName lastName profileImageUrl email",
				)
				.lean();

			if (!populatedExisting) {
				throw new NotFoundError(
					"Chat room found but failed to retrieve details",
				);
			}

			sendSuccess(
				res,
				{ ...populatedExisting, id: populatedExisting._id.toString() },
				"Chat room retrieved successfully",
			);
			return;
		}

		// Create new chat room
		const boardingId = body.boardingId
			? new Types.ObjectId(body.boardingId)
			: undefined;

		const chatRoom = await ChatRoom.create({
			participants: {
				student: new Types.ObjectId(studentId),
				owner: new Types.ObjectId(ownerId),
			},
			boardingId,
			isActive: true,
		});

		const populatedRoom = await ChatRoom.findById(chatRoom._id)
			.populate(
				"participants.student",
				"firstName lastName profileImageUrl email",
			)
			.populate(
				"participants.owner",
				"firstName lastName profileImageUrl email",
			)
			.lean();

		if (!populatedRoom) {
			throw new NotFoundError("Failed to retrieve created room");
		}

		sendSuccess(
			res,
			{ ...populatedRoom, id: populatedRoom._id.toString() },
			"Chat room created successfully",
		);
	} catch (error) {
		next(error);
	}
}

// GET /api/chat/rooms/:roomId/messages - Get chat history for a room
export async function getChatHistory(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const { roomId } = req.params;
		const query = req.query as unknown as GetChatHistoryInput;

		if (Array.isArray(roomId) || !Types.ObjectId.isValid(roomId)) {
			throw new BadRequestError("Invalid room ID format");
		}

		const limit = query.limit || 50;
		const cursor = query.cursor;

		const chatRoom = await ChatRoom.findById(roomId).lean();

		if (!chatRoom) {
			throw new NotFoundError("Chat room not found");
		}

		// Verify user is a participant
		const { isStudent, isOwner } = isParticipant(
			chatRoom as unknown as IChatRoom,
			req.user.userId,
		);

		if (!isStudent && !isOwner) {
			throw new ForbiddenError("You are not a participant in this chat room");
		}

		// Get messages for the room
		const messagesQuery = ChatMessage.find({
			roomId: new Types.ObjectId(roomId),
			deletedBy: { $ne: new Types.ObjectId(req.user.userId) },
		})
			.populate("senderId", "firstName lastName profileImageUrl role")
			.sort({ createdAt: -1 })
			.limit(limit + 1);

		if (cursor) {
			const lastMessage = await ChatMessage.findById(cursor);
			if (lastMessage?.createdAt) {
				messagesQuery.where("createdAt").lt(lastMessage.createdAt.getTime());
			}
		}

		const messages = await messagesQuery.lean();

		const hasMore = messages.length > limit;
		const rawResult = hasMore ? messages.slice(0, limit) : messages;

		const result = rawResult.map((msg) => ({
			...msg,
			id: msg._id.toString(),
		}));

		const nextCursor =
			hasMore && rawResult.length > 0
				? (
						rawResult[rawResult.length - 1] as { _id: Types.ObjectId }
					)._id.toString()
				: undefined;

		sendSuccess(res, {
			messages: result.reverse(), // Return in chronological order
			nextCursor,
		});
	} catch (error) {
		next(error);
	}
}

// PUT /api/chat/rooms/:roomId/messages/:messageId/read - Mark message as read
export async function markMessageAsRead(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const { roomId, messageId } = req.params;

		if (
			Array.isArray(roomId) ||
			!Types.ObjectId.isValid(roomId) ||
			Array.isArray(messageId) ||
			!Types.ObjectId.isValid(messageId)
		) {
			throw new BadRequestError("Invalid room or message ID format");
		}

		const chatRoom = await ChatRoom.findById(roomId).lean();

		if (!chatRoom) {
			throw new NotFoundError("Chat room not found");
		}

		// Verify user is a participant
		const { isStudent, isOwner } = isParticipant(
			chatRoom as unknown as IChatRoom,
			req.user.userId,
		);

		if (!isStudent && !isOwner) {
			throw new ForbiddenError("You are not a participant in this chat room");
		}

		const message = await ChatMessage.findOneAndUpdate(
			{
				_id: new Types.ObjectId(messageId),
				roomId: new Types.ObjectId(roomId),
				senderId: { $ne: new Types.ObjectId(req.user.userId) }, // Can't mark own messages as read
			},
			{
				isRead: true,
				readAt: new Date(),
			},
			{ new: true },
		).lean();

		if (!message) {
			throw new NotFoundError("Message not found or already marked as read");
		}

		sendSuccess(res, message, "Message marked as read");
	} catch (error) {
		next(error);
	}
}

// PUT /api/chat/rooms/:roomId/read-all - Mark all messages as read
export async function markAllAsRead(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const { roomId } = req.params;

		if (Array.isArray(roomId) || !Types.ObjectId.isValid(roomId)) {
			throw new BadRequestError("Invalid room ID format");
		}

		const chatRoom = await ChatRoom.findById(roomId).lean();

		if (!chatRoom) {
			throw new NotFoundError("Chat room not found");
		}

		// Verify user is a participant
		const { isStudent, isOwner } = isParticipant(
			chatRoom as unknown as IChatRoom,
			req.user.userId,
		);

		if (!isStudent && !isOwner) {
			throw new ForbiddenError("You are not a participant in this chat room");
		}

		// Mark all unread messages from the other participant as read
		const result = await ChatMessage.updateMany(
			{
				roomId: new Types.ObjectId(roomId),
				isRead: false,
				senderId: { $ne: new Types.ObjectId(req.user.userId) },
			},
			{
				isRead: true,
				readAt: new Date(),
			},
		);

		sendSuccess(
			res,
			{ modifiedCount: result.modifiedCount },
			`Marked ${result.modifiedCount} messages as read`,
		);
	} catch (error) {
		next(error);
	}
}

// DELETE /api/chat/rooms/:roomId/messages/:messageId - Delete a message
export async function deleteMessage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const { roomId, messageId } = req.params;

		if (
			Array.isArray(roomId) ||
			!Types.ObjectId.isValid(roomId) ||
			Array.isArray(messageId) ||
			!Types.ObjectId.isValid(messageId)
		) {
			throw new BadRequestError("Invalid room or message ID format");
		}

		const chatRoom = await ChatRoom.findById(roomId).lean();

		if (!chatRoom) {
			throw new NotFoundError("Chat room not found");
		}

		// Verify user is a participant
		const { isStudent, isOwner } = isParticipant(
			chatRoom as unknown as IChatRoom,
			req.user.userId,
		);

		if (!isStudent && !isOwner) {
			throw new ForbiddenError("You are not a participant in this chat room");
		}

		const message = await ChatMessage.findOne({
			_id: new Types.ObjectId(messageId),
			roomId: new Types.ObjectId(roomId),
		}).lean();

		if (!message) {
			throw new NotFoundError("Message not found");
		}

		// Only the sender can delete their own message
		if (message.senderId.toString() !== req.user.userId) {
			throw new ForbiddenError("You can only delete your own messages");
		}

		// Soft delete by adding user to deletedBy array
		await ChatMessage.findByIdAndUpdate(messageId, {
			$addToSet: { deletedBy: new Types.ObjectId(req.user.userId) },
		});

		sendSuccess(res, null, "Message deleted successfully");
	} catch (error) {
		next(error);
	}
}

// GET /api/chat/users - Search for users to chat with (for students to find owners)
export async function searchUsers(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user) throw new UnauthorizedError();

		validateUserRole(req.user.role);

		const { q, role } = req.query;

		// Students can search for owners, owners can search for students
		const targetRole =
			role || (req.user.role === "STUDENT" ? "OWNER" : "STUDENT");

		if (targetRole !== "STUDENT" && targetRole !== "OWNER") {
			throw new BadRequestError(
				"Invalid role. Can only search for students or owners",
			);
		}

		const searchQuery: Record<string, unknown> = {
			role: targetRole,
			isActive: true,
			isVerified: true,
		};

		if (q && typeof q === "string") {
			searchQuery.$or = [
				{ firstName: { $regex: q, $options: "i" } },
				{ lastName: { $regex: q, $options: "i" } },
				{ email: { $regex: q, $options: "i" } },
			];
		}

		const users = await User.find(searchQuery)
			.select("firstName lastName email profileImageUrl university")
			.limit(20)
			.lean();

		sendSuccess(res, users);
	} catch (error) {
		next(error);
	}
}
