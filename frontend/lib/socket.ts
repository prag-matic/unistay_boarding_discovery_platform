import { io, type Socket } from "socket.io-client";
import { API_URL } from "./constants";
import { storage } from "./storage";
import type { IssueAnalysis } from "@/types/chat.types";

// Convert HTTP URL to WebSocket URL
const getSocketUrl = (httpUrl: string) => {
  try {
    const url = new URL(httpUrl.replace("/api", ""));
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  } catch {
    return "ws://localhost:3000";
  }
};

const SOCKET_URL = getSocketUrl(API_URL);

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: "text" | "image" | "file";
  createdAt: string;
  isRead?: boolean;
  readAt?: string;
}

export interface ChatRoom {
  id: string;
  participants: {
    student: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      profileImageUrl?: string;
    };
    owner: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      profileImageUrl?: string;
    };
  };
  boardingId?: {
    id: string;
    propertyName: string;
    address: string;
    city: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    messageType: string;
    createdAt: string;
  };
  lastMessageAt?: string;
  isActive: boolean;
}

export type SocketEvent = {
  type:
    | "message"
    | "typing"
    | "read"
    | "join"
    | "leave"
    | "error"
    | "issueAnalysis";
  data:
    | ChatMessage
    | { roomId: string; userId: string; isTyping: boolean }
    | { roomId: string; messageId: string; readAt: Date }
    | { message: string; code: string }
    | IssueAnalysis;
};

class SocketService {
  private socket: Socket | null = null;
  private messageListeners: Set<(data: ChatMessage) => void> = new Set();
  private typingListeners: Set<
    (data: { roomId: string; userId: string; isTyping: boolean }) => void
  > = new Set();
  private readListeners: Set<
    (data: { roomId: string; messageId: string; readAt: Date }) => void
  > = new Set();
  private issueAnalysisListeners: Set<(data: IssueAnalysis) => void> =
    new Set();
  private errorListeners: Set<
    (data: { message: string; code: string }) => void
  > = new Set();

  async connect() {
    if (this.socket?.connected) {
      console.log("[Socket] Already connected");
      return;
    }

    try {
      const token = await storage.getToken();
      if (!token) {
        console.warn("[Socket] No token available");
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        console.log("[Socket] Connected:", this.socket?.id);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("[Socket] Disconnected:", reason);
      });

      this.socket.on("connect_error", (error) => {
        console.error("[Socket] Connection error:", error.message);
      });

      // Message event
      this.socket.on("message", (data) => {
        console.log("[Socket] New message:", data);
        try {
          this.messageListeners.forEach((listener) =>
            listener(data as ChatMessage),
          );
        } catch (error) {
          console.error(
            "[Socket] Error processing message:",
            error instanceof Error ? error.message : error,
          );
        }
      });

      // Typing event
      this.socket.on("typing", (data) => {
        this.typingListeners.forEach((listener) => listener(data));
      });

      // Read event
      this.socket.on("read", (data) => {
        this.readListeners.forEach((listener) => listener(data));
      });

      // Issue analysis event
      this.socket.on("issueAnalysis", (data) => {
        console.log("[Socket] Issue analysis:", data);
        this.issueAnalysisListeners.forEach((listener) =>
          listener(data as IssueAnalysis),
        );
      });

      // Error event
      this.socket.on("error", (data) => {
        console.error("[Socket] Error:", data);
        this.errorListeners.forEach((listener) => listener(data));
      });
    } catch (error) {
      console.error("[Socket] Failed to connect:", error);
      throw error;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("[Socket] Disconnected by client");
    }
  }

  joinRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      this.socket.emit(
        "joinRoom",
        { roomId },
        (response: { success: boolean; error?: string }) => {
          resolve(response);
        },
      );
    });
  }

  leaveRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      this.socket.emit(
        "leaveRoom",
        { roomId },
        (response: { success: boolean; error?: string }) => {
          resolve(response);
        },
      );
    });
  }

  sendMessage(
    roomId: string,
    content: string,
    messageType: "text" | "image" | "file" = "text",
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      this.socket.emit(
        "sendMessage",
        { roomId, content, messageType },
        (response: { success: boolean; error?: string }) => {
          resolve(response);
        },
      );
    });
  }

  sendTyping(
    roomId: string,
    isTyping: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      this.socket.emit(
        "typing",
        { roomId, isTyping },
        (response: { success: boolean; error?: string }) => {
          resolve(response);
        },
      );
    });
  }

  markAsRead(
    roomId: string,
    messageId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      this.socket.emit(
        "markAsRead",
        { roomId, messageId },
        (response: { success: boolean; error?: string }) => {
          resolve(response);
        },
      );
    });
  }

  // Event listeners
  onMessage(listener: (data: ChatMessage) => void) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onTyping(
    listener: (data: {
      roomId: string;
      userId: string;
      isTyping: boolean;
    }) => void,
  ) {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  }

  onRead(
    listener: (data: {
      roomId: string;
      messageId: string;
      readAt: Date;
    }) => void,
  ) {
    this.readListeners.add(listener);
    return () => this.readListeners.delete(listener);
  }

  onIssueAnalysis(listener: (data: IssueAnalysis) => void) {
    this.issueAnalysisListeners.add(listener);
    return () => this.issueAnalysisListeners.delete(listener);
  }

  onError(listener: (data: { message: string; code: string }) => void) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
