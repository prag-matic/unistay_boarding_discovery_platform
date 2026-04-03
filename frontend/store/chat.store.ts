import { create } from "zustand";
import socketService from "@/lib/socket";
import type { ChatMessage } from "@/lib/socket";
import type {
  ChatRoom,
  Issue,
  ChatBackgroundType,
  IssueAnalysis,
} from "@/types/chat.types";

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
  pendingIssueAnalysis: IssueAnalysis | null;

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

  // Actions - Issue Analysis
  setPendingIssueAnalysis: (analysis: IssueAnalysis | null) => void;
  upgradeToIssue: (
    analysis: IssueAnalysis,
    title: string,
    description?: string,
  ) => Promise<void>;
  dismissIssueAnalysis: () => void;
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
  pendingIssueAnalysis: null,

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
    set((state) => {
      // Prevent duplicate messages by checking if message ID already exists
      const exists = state.messages.some((msg) => msg.id === message.id);
      if (exists) {
        console.log(
          "[ChatStore] Duplicate message detected, skipping:",
          message.id,
        );
        return state; // Don't add duplicate
      }
      return {
        messages: [...state.messages, message],
      };
    });
  },

  loadMessages: async (roomId, limit = 50) => {
    set({ isLoading: true, messages: [], currentIssue: null });
    try {
      const { getChatHistory, getRoomIssues } = await import("@/lib/chat");

      // Load messages and issues in parallel
      const [messagesResponse, issuesResponse] = await Promise.all([
        getChatHistory(roomId, limit),
        getRoomIssues(roomId),
      ]);

      const { messages, nextCursor } = messagesResponse.data;
      const { issues } = issuesResponse.data;

      // Get the most recent active issue (if any)
      const activeIssue =
        issues.find(
          (issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS",
        ) || null;

      // Set background type based on issue category
      let backgroundType: ChatBackgroundType = "default";
      if (activeIssue?.category) {
        backgroundType = `issue_${activeIssue.category}` as ChatBackgroundType;
      }

      // Backend already returns messages in chronological order (oldest first)
      set({
        messages: messages,
        currentIssue: activeIssue,
        backgroundType,
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

      // Backend returns messages in chronological order, prepend to existing messages
      set((state) => ({
        messages: [...messages, ...state.messages],
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
    set((state) => {
      // Update background based on issue category if currently default
      let newBackgroundType = state.backgroundType;
      if (state.backgroundType === "default" && issue.category) {
        newBackgroundType = `issue_${issue.category}` as ChatBackgroundType;
      }

      return {
        issues: [...state.issues, issue],
        currentIssue: issue,
        backgroundType: newBackgroundType,
      };
    });
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
      console.log("[ChatStore] Issue analysis received:", analysis);
      // Only show if this is for the current room and is actually an issue
      if (analysis.isIssue && analysis.roomId === get().currentRoom?.id) {
        get().setPendingIssueAnalysis(analysis);
      }
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
      pendingIssueAnalysis: null,
    });
  },

  setPendingIssueAnalysis: (analysis) => {
    set({ pendingIssueAnalysis: analysis });
  },

  dismissIssueAnalysis: () => {
    set({ pendingIssueAnalysis: null });
  },

  upgradeToIssue: async (analysis, title, description) => {
    try {
      const { createIssue } = await import("@/lib/chat");

      // Map category from frontend format to backend format
      const categoryMap: Record<string, string> = {
        rules: "rule_violation",
        maintenance: "maintenance",
        payment: "payment",
        safety: "safety",
        other: "other",
      };

      const backendCategory = analysis.category
        ? categoryMap[analysis.category] || "other"
        : "other";

      const response = await createIssue({
        roomId: analysis.roomId,
        messageId: analysis.messageId,
        title,
        description: description || analysis.reason,
        reason: analysis.reason, // Backend requires this field
        category: backendCategory,
        priority: analysis.suggestedPriority || "MEDIUM",
      });

      const newIssue = response.data;

      if (!newIssue) {
        throw new Error(
          "Failed to create issue: No issue returned from server",
        );
      }

      // Add issue to store
      get().addIssue(newIssue);

      // Clear pending analysis
      get().dismissIssueAnalysis();

      console.log("[ChatStore] Issue created successfully:", newIssue.id);
    } catch (error) {
      console.error(
        "[ChatStore] Failed to create issue:",
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  },
}));
