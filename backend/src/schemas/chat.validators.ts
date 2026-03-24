import { z } from "zod";

export const sendMessageSchema = z.object({
	roomId: z.string().uuid("Invalid room ID format"),
	content: z.string().min(1, "Message content is required").max(2000),
	messageType: z.enum(["text", "image", "file"]).default("text"),
});

export const getChatHistorySchema = z.object({
	roomId: z.string().uuid("Invalid room ID format"),
	limit: z.coerce.number().min(1).max(100).default(50),
	cursor: z.string().optional(),
});

export const getChatRoomsSchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
});

export const markAsReadSchema = z.object({
	roomId: z.string().uuid("Invalid room ID format"),
	messageId: z.string().uuid("Invalid message ID format"),
});

export const createChatRoomSchema = z.object({
	otherUserId: z.string().uuid("Invalid user ID format"),
	boardingId: z.string().uuid("Invalid boarding ID format").optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetChatHistoryInput = z.infer<typeof getChatHistorySchema>;
export type GetChatRoomsInput = z.infer<typeof getChatRoomsSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>;

// Socket.io event payload schemas
export const socketSendMessageSchema = z.object({
	roomId: z.string().uuid("Invalid room ID format"),
	content: z.string().min(1, "Message content is required").max(2000),
	messageType: z.enum(["text", "image", "file"]).default("text"),
});

export const socketTypingSchema = z.object({
	roomId: z.string().uuid("Invalid room ID format"),
	isTyping: z.boolean(),
});

export const socketMarkAsReadSchema = z.object({
	roomId: z.string().uuid("Invalid room ID format"),
	messageId: z.string().uuid("Invalid message ID format"),
});

export type SocketSendMessageInput = z.infer<typeof socketSendMessageSchema>;
export type SocketTypingInput = z.infer<typeof socketTypingSchema>;
export type SocketMarkAsReadInput = z.infer<typeof socketMarkAsReadSchema>;
