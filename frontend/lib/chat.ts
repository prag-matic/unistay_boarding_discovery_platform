import api from "./api";
import type { UniStayApiResponse } from "@/types/api.types";
import type {
  ChatMessage,
  ChatRoom,
  ChatUser,
  Issue,
} from "@/types/chat.types";

export interface CreateChatRoomPayload {
  otherUserId: string;
  boardingId?: string;
}

export interface CreateIssuePayload {
  roomId: string;
  messageId: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  reason?: string;
}

export interface GetChatRoomsResponse {
  rooms: ChatRoom[];
  nextCursor?: string;
}

export interface GetChatHistoryResponse {
  messages: ChatMessage[];
  nextCursor?: string;
}

/**
 * Chat API functions
 *
 * Note: For development purposes, we ask users to input owner/student ID manually.
 * TODO: In production, this should automatically use the boarding owner ID from
 * the user's active reservation (for students) or boarding listing (for owners).
 */

/**
 * Create or get existing chat room
 * POST /api/chat/rooms
 *
 * DEV NOTE: Currently requires manual input of otherUserId for development.
 * In production, this should be automatically determined from:
 * - Students: boarding owner ID from active reservation
 * - Owners: student ID from reservation/visit request
 */
export async function createChatRoom(payload: CreateChatRoomPayload) {
  const response = await api.post<UniStayApiResponse<ChatRoom>>(
    "/chat/rooms",
    payload,
  );
  return response.data;
}

/**
 * Get all chat rooms for current user
 * GET /api/chat/rooms
 */
export async function getChatRooms(limit: number = 20, cursor?: string) {
  const params: Record<string, string> = { limit: String(limit) };
  if (cursor) params.cursor = cursor;

  const response = await api.get<UniStayApiResponse<GetChatRoomsResponse>>(
    "/chat/rooms",
    { params },
  );
  return response.data;
}

/**
 * Get a specific chat room by ID
 * GET /api/chat/rooms/:roomId
 */
export async function getChatRoom(roomId: string) {
  const response = await api.get<UniStayApiResponse<ChatRoom>>(
    `/chat/rooms/${roomId}`,
  );
  return response.data;
}

/**
 * Get chat history for a room
 * GET /api/chat/rooms/:roomId/messages
 *
 * Messages are returned in chronological order (oldest first)
 * Supports cursor-based pagination for infinite scroll
 */
export async function getChatHistory(
  roomId: string,
  limit: number = 50,
  cursor?: string,
) {
  const params: Record<string, string> = { limit: String(limit) };
  if (cursor) params.cursor = cursor;

  const response = await api.get<UniStayApiResponse<GetChatHistoryResponse>>(
    `/chat/rooms/${roomId}/messages`,
    { params },
  );
  return response.data;
}

/**
 * Mark all messages in a room as read
 * PUT /api/chat/rooms/:roomId/read-all
 */
export async function markAllAsRead(roomId: string) {
  const response = await api.put<UniStayApiResponse<{ modifiedCount: number }>>(
    `/chat/rooms/${roomId}/read-all`,
  );
  return response.data;
}

/**
 * Search for users to chat with
 * GET /api/chat/users?q=...&role=...
 *
 * For students: searches for owners
 * For owners: searches for students
 */
export async function searchUsers(query: string, role?: "STUDENT" | "OWNER") {
  const params: Record<string, string> = { q: query };
  if (role) params.role = role;

  const response = await api.get<UniStayApiResponse<ChatUser[]>>(
    "/chat/users",
    { params },
  );
  return response.data;
}

/**
 * Create an issue from a chat message
 * POST /api/issues
 */
export async function createIssue(payload: CreateIssuePayload) {
  const response = await api.post<UniStayApiResponse<Issue>>(
    "/issues",
    payload,
  );
  return response.data;
}

/**
 * Get issues for a chat room
 * GET /api/issues?roomId=...
 */
export async function getRoomIssues(roomId: string) {
  const response = await api.get<UniStayApiResponse<{ issues: Issue[] }>>(
    "/issues",
    { params: { roomId, limit: 1 } },
  );
  return response.data;
}
