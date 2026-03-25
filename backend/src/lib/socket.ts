import type { Server as HTTPServer } from "node:http";
import { Types } from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import type { JwtPayload } from "@/lib/jwt.js";
import { verifyAccessToken } from "@/lib/jwt.js";
import { ChatMessage } from "@/models/ChatMessage.js";
import { ChatRoom } from "@/models/ChatRoom.js";
import {
  type SocketMarkAsReadInput,
  type SocketSendMessageInput,
  type SocketTypingInput,
  socketMarkAsReadSchema,
  socketSendMessageSchema,
  socketTypingSchema,
} from "@/schemas/chat.validators.js";

interface SocketData {
  user: JwtPayload;
}

interface ServerToClientEvents {
  message: (data: {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    messageType: "text" | "image" | "file";
    createdAt: Date;
  }) => void;
  typing: (data: { roomId: string; userId: string; isTyping: boolean }) => void;
  read: (data: { roomId: string; messageId: string; readAt: Date }) => void;
  join: (data: { roomId: string; userId: string }) => void;
  leave: (data: { roomId: string; userId: string }) => void;
  error: (data: { message: string; code: string }) => void;
}

interface ClientToServerEvents {
  sendMessage: (
    data: SocketSendMessageInput,
    callback: (response: { success: boolean; error?: string }) => void,
  ) => void;
  typing: (
    data: SocketTypingInput,
    callback: (response: { success: boolean; error?: string }) => void,
  ) => void;
  markAsRead: (
    data: SocketMarkAsReadInput,
    callback: (response: { success: boolean; error?: string }) => void,
  ) => void;
  joinRoom: (
    data: { roomId: string },
    callback: (response: { success: boolean; error?: string }) => void,
  ) => void;
  leaveRoom: (
    data: { roomId: string },
    callback: (response: { success: boolean; error?: string }) => void,
  ) => void;
}

export interface SocketIOType {
  server: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
}

function normalizeSocketPayload<T>(data: unknown): T | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  if (data && typeof data === "object") {
    return data as T;
  }

  return null;
}

export function setupSocketIO(httpServer: HTTPServer): SocketIOType {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    },
  );

  // Socket.io middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const user = verifyAccessToken(token);
      (socket.data as SocketData).user = user;
      next();
    } catch {
      next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const socketData = socket.data as SocketData;
    const userId = socketData.user.userId;
    const userRole = socketData.user.role;

    console.log(`[Socket.io] User ${userId} (${userRole}) connected`);

    // Validate that user is either STUDENT or OWNER
    if (userRole !== "STUDENT" && userRole !== "OWNER") {
      socket.emit("error", {
        message: "Chat is only available for students and owners",
        code: "INVALID_ROLE",
      });
      socket.disconnect();
      return;
    }

    // Join a chat room
    socket.on("joinRoom", async (data, callback) => {
      try {
        const payload = normalizeSocketPayload<{ roomId?: string }>(data);

        if (!payload) {
          callback({
            success: false,
            error: "Invalid payload",
          });
          return;
        }

        const result = socketTypingSchema.safeParse({
          roomId: payload.roomId,
          isTyping: true,
        });

        if (!result.success) {
          const roomId = payload?.roomId;
          const roomIdType = typeof roomId;
          const roomIdLength = roomIdType === "string" ? roomId.length : null;
          const roomIdMatchesObjectId =
            roomIdType === "string" ? /^[0-9a-fA-F]{24}$/.test(roomId) : false;

          console.error("[Socket.io] joinRoom validation failed", {
            roomId,
            roomIdType,
            roomIdLength,
            roomIdMatchesObjectId,
            issues: result.error.issues,
          });

          callback({
            success: false,
            error: "Invalid room ID format",
          });
          return;
        }

        const roomId = result.data.roomId;

        // Verify user is a participant in the room
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          callback({
            success: false,
            error: "Chat room not found",
          });
          return;
        }

        const isParticipant =
          chatRoom.participants.student.toString() === userId ||
          chatRoom.participants.owner.toString() === userId;

        if (!isParticipant) {
          callback({
            success: false,
            error: "You are not a participant in this chat room",
          });
          return;
        }

        socket.join(roomId);
        socket.to(roomId).emit("join", { roomId, userId });

        callback({ success: true });
      } catch (error) {
        console.error("[Socket.io] Error joining room:", error);
        callback({
          success: false,
          error: "Failed to join room",
        });
      }
    });

    // Leave a chat room
    socket.on("leaveRoom", async (data, callback) => {
      try {
        const payload = normalizeSocketPayload<{ roomId?: string }>(data);

        if (!payload) {
          callback({
            success: false,
            error: "Invalid payload",
          });
          return;
        }

        const result = socketTypingSchema.safeParse({
          roomId: payload.roomId,
          isTyping: true,
        });

        if (!result.success) {
          callback({
            success: false,
            error: "Invalid room ID format",
          });
          return;
        }

        const roomId = result.data.roomId;
        socket.leave(roomId);
        socket.to(roomId).emit("leave", { roomId, userId });

        callback({ success: true });
      } catch (error) {
        console.error("[Socket.io] Error leaving room:", error);
        callback({
          success: false,
          error: "Failed to leave room",
        });
      }
    });

    // Send a message
    socket.on("sendMessage", async (data, callback) => {
      try {
        const payload = normalizeSocketPayload<SocketSendMessageInput>(data);

        if (!payload) {
          callback({
            success: false,
            error: "Invalid payload",
          });
          return;
        }

        const result = socketSendMessageSchema.safeParse(payload);

        if (!result.success) {
          callback({
            success: false,
            error: result.error.issues[0]?.message || "Invalid message data",
          });
          return;
        }

        const { roomId, content, messageType } = result.data;

        // Verify user is a participant in the room
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          callback({
            success: false,
            error: "Chat room not found",
          });
          return;
        }

        const isParticipant =
          chatRoom.participants.student.toString() === userId ||
          chatRoom.participants.owner.toString() === userId;

        if (!isParticipant) {
          callback({
            success: false,
            error: "You are not a participant in this chat room",
          });
          return;
        }

        // Create and save the message
        const message = await ChatMessage.create({
          roomId: new Types.ObjectId(roomId),
          senderId: new Types.ObjectId(userId),
          content,
          messageType,
        });

        // Update the chat room with last message info
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        // Emit the message to all participants in the room
        const messageData = {
          id: message._id.toString(),
          roomId,
          senderId: userId,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
        };

        io.to(roomId).emit("message", messageData);

        callback({ success: true });
      } catch (error) {
        console.error("[Socket.io] Error sending message:", error);
        callback({
          success: false,
          error: "Failed to send message",
        });
      }
    });

    // Typing indicator
    socket.on("typing", async (data, callback) => {
      try {
        const payload = normalizeSocketPayload<SocketTypingInput>(data);

        if (!payload) {
          callback({
            success: false,
            error: "Invalid payload",
          });
          return;
        }

        const result = socketTypingSchema.safeParse(payload);

        if (!result.success) {
          callback({
            success: false,
            error: result.error.issues[0]?.message || "Invalid typing data",
          });
          return;
        }

        const { roomId, isTyping } = result.data;

        // Verify user is a participant in the room
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          callback({
            success: false,
            error: "Chat room not found",
          });
          return;
        }

        const isParticipant =
          chatRoom.participants.student.toString() === userId ||
          chatRoom.participants.owner.toString() === userId;

        if (!isParticipant) {
          callback({
            success: false,
            error: "You are not a participant in this chat room",
          });
          return;
        }

        socket.to(roomId).emit("typing", { roomId, userId, isTyping });
        callback({ success: true });
      } catch (error) {
        console.error("[Socket.io] Error sending typing indicator:", error);
        callback({
          success: false,
          error: "Failed to send typing indicator",
        });
      }
    });

    // Mark message as read
    socket.on("markAsRead", async (data, callback) => {
      try {
        const payload = normalizeSocketPayload<SocketMarkAsReadInput>(data);

        if (!payload) {
          callback({
            success: false,
            error: "Invalid payload",
          });
          return;
        }

        const result = socketMarkAsReadSchema.safeParse(payload);

        if (!result.success) {
          callback({
            success: false,
            error: result.error.issues[0]?.message || "Invalid message data",
          });
          return;
        }

        const { roomId, messageId } = result.data;

        // Verify user is a participant in the room
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          callback({
            success: false,
            error: "Chat room not found",
          });
          return;
        }

        const isParticipant =
          chatRoom.participants.student.toString() === userId ||
          chatRoom.participants.owner.toString() === userId;

        if (!isParticipant) {
          callback({
            success: false,
            error: "You are not a participant in this chat room",
          });
          return;
        }

        // Mark the message as read
        const message = await ChatMessage.findOneAndUpdate(
          { _id: messageId, roomId },
          { isRead: true, readAt: new Date() },
          { new: true },
        );

        if (!message) {
          callback({
            success: false,
            error: "Message not found",
          });
          return;
        }

        // Emit read status to all participants
        const readAt = message.readAt ?? new Date();
        io.to(roomId).emit("read", {
          roomId,
          messageId,
          readAt,
        });

        callback({ success: true });
      } catch (error) {
        console.error("[Socket.io] Error marking message as read:", error);
        callback({
          success: false,
          error: "Failed to mark message as read",
        });
      }
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`[Socket.io] User ${userId} disconnected`);
    });
  });

  return { server: io };
}
