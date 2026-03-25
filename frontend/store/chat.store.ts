import { create } from "zustand";
import socketService, {
  type ChatMessage,
  type IssueAnalysis,
} from "@/lib/socket";
import type { ChatRoom, Issue, ChatBackgroundType } from "@/types/chat.types";

interface ChatState {
  // State
  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  issues: Issue[];
  currentIssue: Issue | null;
  backgroundType: ChatBackgroundType;
  isTyping: boolean;
  typingUserId?: string;
  isLoading: boolean;
  isLoadingHistory: boolean;
  hasMoreMessages: boolean;
  lastCursor?: string;

  // Actions - Room management
  setCurrentRoom: (room: ChatRoom | null) => void;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<void>;
  createRoom: (otherUserId: string, boardingId?: string) => Promise<ChatRoom>;

  // Actions - Messages
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  loadMessages: (roomId: string, limit?: number) => Promise<void>;
  loadMoreMessages: (
    roomId: string,
    cursor: string,
    limit?: number,
  ) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;

  // Actions - Issues
  setIssues: (issues: Issue[]) => void;
  addIssue: (issue: Issue) => void;
  updateIssue: (issueId: string, updates: Partial<Issue>) => void;
  setCurrentIssue: (issue: Issue | null) => void;
  setBackgroundType: (type: ChatBackgroundType) => void;

  // Actions - Typing
  setIsTyping: (isTyping: boolean) => void;
  setTypingUserId: (userId?: string) => void;
  sendTyping: (roomId: string, isTyping: boolean) => Promise<void>;

  // Actions - Socket
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setLoadingHistory: (loading: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  currentRoom: null,
  messages: [],
  issues: [],
  currentIssue: null,
  backgroundType: "default",
  isTyping: false,
  typingUserId: undefined,
  isLoading: false,
  isLoadingHistory: false,
  hasMoreMessages: true,
  lastCursor: undefined,

  setCurrentRoom: (room) => {
    set({ currentRoom: room });
  },

  joinRoom: async (roomId) => {
    const result = await socketService.joinRoom(roomId);
    return result.success;
  },

  leaveRoom: async (roomId) => {
    await socketService.leaveRoom(roomId);
  },

  createRoom: async (otherUserId, boardingId) => {
    const { createChatRoom } = await import("@/lib/chat");
    const response = await createChatRoom({ otherUserId, boardingId });
    return response.data;
  },

  setMessages: (messages) => {
    set({ messages });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  loadMessages: async (roomId, limit = 50) => {
    set({ isLoading: true, messages: [] });
    try {
      const { getChatHistory } = await import("@/lib/chat");
      const response = await getChatHistory(roomId, limit);
      const { messages, nextCursor } = response.data;

      set({
        messages: messages.reverse(), // Reverse to show newest last
        lastCursor: nextCursor,
        hasMoreMessages: !!nextCursor,
      });
    } catch (error) {
      console.error("Failed to load messages:", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadMoreMessages: async (roomId, cursor, limit = 50) => {
    if (get().isLoadingHistory) return;

    set({ isLoadingHistory: true });
    try {
      const { getChatHistory } = await import("@/lib/chat");
      const response = await getChatHistory(roomId, limit, cursor);
      const { messages, nextCursor } = response.data;

      set((state) => ({
        messages: [...messages.reverse(), ...state.messages],
        lastCursor: nextCursor,
        hasMoreMessages: !!nextCursor,
      }));
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  markMessageAsRead: async (messageId) => {
    const roomId = get().currentRoom?.id;
    if (!roomId) return;

    await socketService.markAsRead(roomId, messageId);
  },

  setIssues: (issues) => {
    set({ issues });
  },

  addIssue: (issue) => {
    set((state) => ({
      issues: [...state.issues, issue],
      currentIssue: issue,
      backgroundType:
        get().backgroundType === "default"
          ? (`issue_${issue.category}` as ChatBackgroundType)
          : get().backgroundType,
    }));
  },

  updateIssue: (issueId, updates) => {
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === issueId ? { ...issue, ...updates } : issue,
      ),
      currentIssue:
        state.currentIssue?.id === issueId
          ? { ...state.currentIssue, ...updates }
          : state.currentIssue,
    }));
  },

  setCurrentIssue: (issue) => {
    set({ currentIssue: issue });
  },

  setBackgroundType: (type) => {
    set({ backgroundType: type });
  },

  setIsTyping: (isTyping) => {
    set({ isTyping });
  },

  setTypingUserId: (userId) => {
    set({ typingUserId: userId });
  },

  sendTyping: async (roomId, isTyping) => {
    await socketService.sendTyping(roomId, isTyping);
  },

  connectSocket: async () => {
    await socketService.connect();

    // Set up event listeners
    socketService.onMessage((message) => {
      get().addMessage(message);
    });

    socketService.onTyping((data) => {
      if (data.roomId === get().currentRoom?.id) {
        get().setTypingUserId(data.isTyping ? data.userId : undefined);
      }
    });

    socketService.onIssueAnalysis((analysis) => {
      console.log("Issue analysis received:", analysis);
      // Handle issue analysis - could create issue or show alert
    });

    socketService.onError((error) => {
      console.error("Socket error:", error);
    });
  },

  disconnectSocket: () => {
    socketService.disconnect();
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setLoadingHistory: (loading) => {
    set({ isLoadingHistory: loading });
  },

  clearChat: () => {
    set({
      currentRoom: null,
      messages: [],
      issues: [],
      currentIssue: null,
      backgroundType: "default",
      isTyping: false,
      typingUserId: undefined,
      lastCursor: undefined,
      hasMoreMessages: true,
    });
  },
}));
