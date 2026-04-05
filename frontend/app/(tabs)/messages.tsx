import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import logger from "@/lib/logger";
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { IssueBanner } from "@/components/chat/IssueBanner";
import { CreateChatRoomModal } from "@/components/chat/CreateChatRoomModal";
import {
  ISSUE_BACKGROUND_COLORS,
  ISSUE_BADGE_COLORS,
} from "@/types/chat.types";
import type {
  ChatRoom,
  ChatMessage,
  Issue,
  ChatUser,
} from "@/types/chat.types";
import { IssueUpgradeModal } from "@/components/chat/IssueUpgradeModal";

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const {
    currentRoom,
    messages,
    currentIssue,
    backgroundType,
    isTyping,
    typingUserId,
    isLoading,
    loadMessages,
    sendTyping,
    joinRoom,
    createRoom,
    setCurrentRoom,
    clearChat,
    connectSocket,
    disconnectSocket,
    pendingIssueAnalysis,
    setPendingIssueAnalysis,
    dismissIssueAnalysis,
    upgradeToIssue,
  } = useChatStore();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [roomIssues, setRoomIssues] = useState<Record<string, Issue>>({});
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChatInterface, setShowChatInterface] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadChatRooms();
    // Don't connect socket on mount - connect only when user starts chatting
    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const loadChatRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const { getChatRooms, getRoomIssues } = await import("@/lib/chat");
      const [roomsResponse, issuesResponse] = await Promise.all([
        getChatRooms(50),
        // Fetch all active issues
        (async () => {
          try {
            const response = await getRoomIssues("");
            return response.data.issues;
          } catch {
            return [];
          }
        })(),
      ]);

      const { rooms } = roomsResponse.data;
      const issues = issuesResponse;

      // Create a map of room issues (only active ones)
      const issueMap: Record<string, Issue> = {};
      issues.forEach((issue: Issue) => {
        if (issue.status === "OPEN" || issue.status === "IN_PROGRESS") {
          issueMap[issue.roomId] = issue;
        }
      });

      setChatRooms(rooms);
      setRoomIssues(issueMap);
    } catch (error: unknown) {
      logger.chat.error('Failed to load chat rooms', { error: error instanceof Error ? error.message : error });
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleSelectRoom = useCallback(
    async (room: ChatRoom) => {
      try {
        // Connect socket when selecting a room
        await connectSocket();
        await joinRoom(room.id);
        setCurrentRoom(room);
        await loadMessages(room.id);
        setShowChatInterface(true);
      } catch (error: unknown) {
        logger.chat.error('Failed to join room', { error: error instanceof Error ? error.message : error });
      }
    },
    [joinRoom, setCurrentRoom, loadMessages, connectSocket],
  );

  const handleTyping = (text: string) => {
    setMessageText(text);

    if (currentRoom) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sendTyping(currentRoom.id, true);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(currentRoom.id, false);
      }, 2000) as unknown as NodeJS.Timeout;
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;

    // If no room, show modal to create room first
    if (!currentRoom) {
      setShowCreateModal(true);
      return;
    }

    setIsSending(true);
    try {
      const { socketService } = await import("@/lib/socket");
      const result = await socketService.sendMessage(
        currentRoom.id,
        messageText.trim(),
        "text",
      );

      if (result.success) {
        setMessageText("");
      } else {
        Alert.alert("Error", result.error || "Failed to send message");
      }
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateRoom = async (otherUserId: string) => {
    try {
      const boardingId = undefined;
      const room = await createRoom(otherUserId, boardingId);

      // Set the room immediately to show the chat interface
      setCurrentRoom(room);

      // Join room and load messages in background
      await joinRoom(room.id);
      await loadMessages(room.id);

      // Close modal and show chat interface
      setShowCreateModal(false);
      setShowChatInterface(true);

      // Send pending message if exists
      if (messageText.trim()) {
        setTimeout(() => handleSend(), 300);
      }
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create chat",
      );
      throw error;
    }
  };

  const handleIssuePress = (issue: Issue) => {
    // Handle issue details if needed
  };

  const handleBackToHistory = () => {
    clearChat();
    setShowChatInterface(false);
    setMessageText("");
    loadChatRooms();
  };

  const filteredRooms = searchQuery
    ? chatRooms.filter((room) => {
        const otherUser =
          user?.role === "STUDENT"
            ? room.participants.owner
            : room.participants.student;
        return (
          otherUser.firstName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          otherUser.lastName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : chatRooms;

  const renderRoom = useCallback(
    ({ item }: { item: ChatRoom }) => {
      const otherUser =
        user?.role === "STUDENT"
          ? item.participants.owner
          : item.participants.student;
      const lastMessage = item.lastMessage;
      const timeAgo = lastMessage?.createdAt
        ? formatTimeAgo(lastMessage.createdAt)
        : "";

      const activeIssue = roomIssues[item.id];
      const hasIssue = !!activeIssue;

      return (
        <TouchableOpacity
          style={[
            styles.roomCard,
            hasIssue && {
              backgroundColor:
                ISSUE_BACKGROUND_COLORS[
                  `issue_${activeIssue.category}` as keyof typeof ISSUE_BACKGROUND_COLORS
                ] || ISSUE_BACKGROUND_COLORS.issue_other,
            },
          ]}
          onPress={() => handleSelectRoom(item)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherUser.firstName.charAt(0)}
              {otherUser.lastName.charAt(0)}
            </Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.userName} numberOfLines={1}>
              {otherUser.firstName} {otherUser.lastName}
            </Text>

            {hasIssue ? (
              <View style={styles.issueInfo}>
                <View style={styles.issueRow}>
                  <Ionicons name="warning" size={12} color={COLORS.primary} />
                  <Text style={styles.issueTitle} numberOfLines={1}>
                    {activeIssue.title}
                  </Text>
                </View>
                <View style={styles.issueBadges}>
                  <View
                    style={[
                      styles.issueBadge,
                      {
                        backgroundColor:
                          ISSUE_BADGE_COLORS[activeIssue.category]?.bg ||
                          COLORS.gray,
                      },
                    ]}
                  >
                    <Text style={styles.issueBadgeText}>
                      {activeIssue.category.replace("_", " ")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.issueBadge,
                      {
                        backgroundColor: COLORS.white,
                        borderColor: getIssueStatusColor(activeIssue.status),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.issueBadgeText,
                        {
                          color: getIssueStatusColor(activeIssue.status),
                        },
                      ]}
                    >
                      {activeIssue.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              lastMessage && (
                <View style={styles.lastMessageRow}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {lastMessage.content}
                  </Text>
                  <Text style={styles.time}>{timeAgo}</Text>
                </View>
              )
            )}

            {item.boardingId && !hasIssue && (
              <View style={styles.boardingTag}>
                <Ionicons name="home-outline" size={12} color={COLORS.gray} />
                <Text style={styles.boardingTagText} numberOfLines={1}>
                  {item.boardingId.title}
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      );
    },
    [user?.role, handleSelectRoom, roomIssues],
  );

  const renderItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="chatbubbles-outline"
            size={48}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptyText}>
          Start a conversation to see your chat history here
        </Text>
      </View>
    ),
    [],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      try {
        // Handle both string ID and populated object from API
        let senderId: string;
        if (typeof item.senderId === "string") {
          senderId = item.senderId;
        } else if (item.senderId && typeof item.senderId === "object") {
          // senderId is populated - could be an object with _id or id
          const senderObj = item.senderId as Record<string, unknown>;
          senderId = (senderObj._id as string) || (senderObj.id as string);
        } else {
          senderId = "";
        }

        const isOwn = senderId === user?.id;

        // Get sender info - check if message has sender object, otherwise get from room
        let sender: ChatUser | undefined;
        if (item.sender) {
          // Message includes sender object (from API)
          sender = item.sender;
        } else if (
          typeof item.senderId === "object" &&
          item.senderId !== null &&
          "firstName" in item.senderId
        ) {
          // senderId is populated with user object from API
          sender = item.senderId as ChatUser;
        } else if (isOwn) {
          // Current user's message
          sender = user;
        } else {
          // Other participant - determine which role they have
          const otherRole =
            currentRoom?.participants.student.id === senderId
              ? "student"
              : "owner";
          sender = currentRoom?.participants[otherRole];
        }

        return (
          <ChatBubble
            message={item}
            isOwn={isOwn}
            showSender={!isOwn}
            senderName={
              sender ? `${sender.firstName} ${sender.lastName}` : undefined
            }
          />
        );
      } catch (error) {
        logger.chat.error('Error rendering message', { error: error instanceof Error ? error.message : error });
        return null;
      }
    },
    [user, currentRoom],
  );

  const renderTypingIndicator = () => {
    if (!isTyping || !typingUserId) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
        </View>
      </View>
    );
  };

  // Show chat interface
  if (showChatInterface && currentRoom) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <SafeAreaView
          edges={["top"]}
          style={[
            styles.container,
            { backgroundColor: ISSUE_BACKGROUND_COLORS[backgroundType] },
          ]}
        >
          {/* Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleBackToHistory}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>
                {user?.role === "STUDENT"
                  ? currentRoom.participants.owner.firstName
                  : currentRoom.participants.student.firstName}
              </Text>
              {currentIssue ? (
                <View style={styles.headerIssueInfo}>
                  <Ionicons name="warning" size={14} color={COLORS.primary} />
                  <Text style={styles.headerIssueText} numberOfLines={1}>
                    Issue: {currentIssue.title}
                  </Text>
                  <View
                    style={[
                      styles.headerIssueBadge,
                      {
                        backgroundColor:
                          ISSUE_BADGE_COLORS[currentIssue.category]?.bg ||
                          COLORS.gray,
                      },
                    ]}
                  >
                    <Text style={styles.headerIssueBadgeText}>
                      {currentIssue.category.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              ) : currentRoom.boardingId ? (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {currentRoom.boardingId.title}
                </Text>
              ) : null}
            </View>

            {currentIssue && (
              <View style={styles.headerIssueStatusBadge}>
                <View
                  style={[
                    styles.headerIssueStatus,
                    {
                      backgroundColor: COLORS.white,
                      borderColor: getIssueStatusColor(currentIssue.status),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.headerIssueStatusText,
                      { color: getIssueStatusColor(currentIssue.status) },
                    ]}
                  >
                    {currentIssue.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={48}
                  color={COLORS.grayBorder}
                />
                <Text style={styles.emptyMessagesText}>No messages yet</Text>
                <Text style={styles.emptyMessagesSubtext}>
                  Start the conversation!
                </Text>
              </View>
            }
            ListFooterComponent={
              isLoading ? (
                <ActivityIndicator
                  color={COLORS.primary}
                  style={styles.loader}
                />
              ) : null
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          {/* Typing Indicator */}
          {renderTypingIndicator()}

          {/* Input */}
          <ChatInput
            value={messageText}
            onChangeText={handleTyping}
            onSend={handleSend}
            disabled={currentIssue?.status === "RESOLVED"}
            loading={isSending}
            placeholder={
              currentIssue?.status === "RESOLVED"
                ? "This issue is resolved (view-only)"
                : "Type a message..."
            }
          />

          {/* Create Room Modal */}
          <CreateChatRoomModal
            visible={showCreateModal}
            userType={user?.role === "STUDENT" ? "student" : "owner"}
            onSubmit={handleCreateRoom}
            onClose={() => {
              setShowCreateModal(false);
              // Only reset chat interface if no room is selected
              // and we're not in the middle of creating a room
              if (!currentRoom && !showChatInterface) {
                setMessageText("");
              }
            }}
          />

          {/* Issue Upgrade Modal */}
          <IssueUpgradeModal
            visible={!!pendingIssueAnalysis}
            analysis={pendingIssueAnalysis}
            onUpgrade={async (title, description) => {
              if (pendingIssueAnalysis) {
                await upgradeToIssue(pendingIssueAnalysis, title, description);
              }
            }}
            onDismiss={dismissIssueAnalysis}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // Show chat history list
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Info */}
      {searchQuery.length > 0 && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredRooms.length} conversation
            {filteredRooms.length !== 1 ? "s" : ""} found
          </Text>
        </View>
      )}

      {/* Chat Rooms List */}
      {isLoadingRooms ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          renderItem={renderRoom}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={renderItemSeparator}
          ListEmptyComponent={renderEmptyList}
        />
      )}

      {/* Start New Chat FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          connectSocket();
          setShowChatInterface(true);
          setShowCreateModal(true);
        }}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Create Room Modal */}
      <CreateChatRoomModal
        visible={showCreateModal}
        userType={user?.role === "STUDENT" ? "student" : "owner"}
        onSubmit={handleCreateRoom}
        onClose={() => {
          setShowCreateModal(false);
          if (!currentRoom) {
            setShowChatInterface(false);
            setMessageText("");
          }
        }}
      />

      {/* Issue Upgrade Modal */}
      <IssueUpgradeModal
        visible={!!pendingIssueAnalysis}
        analysis={pendingIssueAnalysis}
        onUpgrade={async (title, description) => {
          if (pendingIssueAnalysis) {
            await upgradeToIssue(pendingIssueAnalysis, title, description);
          }
        }}
        onDismiss={dismissIssueAnalysis}
      />
    </SafeAreaView>
  );
}

function getIssueStatusColor(status: string): string {
  switch (status) {
    case "OPEN":
      return "#F44336";
    case "IN_PROGRESS":
      return "#FF9800";
    case "RESOLVED":
      return "#4CAF50";
    case "CLOSED":
      return "#2196F3";
    default:
      return COLORS.gray;
  }
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  resultsInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  lastMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: COLORS.gray,
  },
  boardingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  boardingTagText: {
    fontSize: 11,
    color: COLORS.gray,
  },
  issueInfo: {
    gap: 4,
    marginTop: 2,
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  issueTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    flex: 1,
  },
  issueBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  issueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  issueBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.white,
    textTransform: "capitalize",
  },
  separator: {
    height: 8,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerIssueInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  headerIssueText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    flex: 1,
  },
  headerIssueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  headerIssueBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.white,
    textTransform: "capitalize",
  },
  headerIssueStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerIssueStatusBadge: {
    marginTop: 8,
  },
  headerIssueStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  emptyMessages: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: COLORS.gray,
  },
  loader: {
    paddingVertical: 16,
  },
  typingContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  typingBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 12,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    flexDirection: "row",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
  },
});
