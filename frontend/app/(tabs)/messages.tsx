import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { IssueBanner } from "@/components/chat/IssueBanner";
import { CreateChatRoomModal } from "@/components/chat/CreateChatRoomModal";
import { ISSUE_BACKGROUND_COLORS } from "@/types/chat.types";
import type { ChatMessage, Issue } from "@/types/chat.types";

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const {
    currentRoom,
    messages,
    issues,
    currentIssue,
    backgroundType,
    isTyping,
    typingUserId,
    isLoading,
    hasMoreMessages,
    loadMessages,
    loadMoreMessages,
    addMessage,
    sendTyping,
    joinRoom,
    createRoom,
    setCurrentRoom,
    clearChat,
    connectSocket,
    disconnectSocket,
  } = useChatStore();

  const [messageText, setMessageText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to socket on mount
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle typing indicator
  const handleTyping = (text: string) => {
    setMessageText(text);

    if (currentRoom) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing indicator
      sendTyping(currentRoom.id, true);

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(currentRoom.id, false);
      }, 2000) as unknown as NodeJS.Timeout;
    }
  };

  // Send message
  const handleSend = async () => {
    if (!messageText.trim() || !currentRoom || isSending) return;

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
        // Message will be added via socket event
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

  // Create chat room (from modal)
  const handleCreateRoom = async (otherUserId: string) => {
    try {
      const boardingId = undefined; // TODO: Get from active reservation/boarding
      const room = await createRoom(otherUserId, boardingId);

      // Join the room and load messages
      await joinRoom(room.id);
      setCurrentRoom(room);
      await loadMessages(room.id);
    } catch (error: unknown) {
      throw error;
    }
  };

  // Handle issue banner press
  const handleIssuePress = (issue: Issue) => {
    // For resolved issues, just show details (view-only)
    // For open issues, user can continue chatting
    // Background color already changed based on issue type
  };

  // Load more messages (pull up to refresh)
  const handleLoadMore = async () => {
    if (!currentRoom || !hasMoreMessages) return;

    // In a real implementation, we'd use the last cursor from the store
    await loadMoreMessages(currentRoom.id, "cursor_placeholder", 15);
  };

  // Render message item
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.senderId === user?.id;
    const sender = isOwn
      ? user
      : currentRoom?.participants[isOwn ? "owner" : "student"];

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
  };

  // Render typing indicator
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

  // Show create modal if no current room
  if (!currentRoom) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Messages</Text>
          </View>

          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Chat Selected</Text>
            <Text style={styles.emptyText}>
              Start a conversation with{" "}
              {user?.role === "STUDENT" ? "your boarding owner" : "a student"}
            </Text>
            <TouchableOpacity
              style={styles.startChatBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.startChatBtnText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <CreateChatRoomModal
          visible={showCreateModal}
          userType={user?.role === "STUDENT" ? "student" : "owner"}
          onSubmit={handleCreateRoom}
          onClose={() => setShowCreateModal(false)}
        />
      </>
    );
  }

  // Main chat screen with messages
  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: ISSUE_BACKGROUND_COLORS[backgroundType] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              clearChat();
              disconnectSocket();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {
                currentRoom.participants[
                  user?.role === "STUDENT" ? "owner" : "student"
                ].firstName
              }
            </Text>
            {currentRoom.boardingId && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {currentRoom.boardingId.propertyName}
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.historyBtn}>
            <Ionicons name="time-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Issue Banner (if there's an active issue) */}
        {currentIssue && (
          <IssueBanner
            issue={currentIssue}
            onPress={() => handleIssuePress(currentIssue)}
          />
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
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
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Typing Indicator */}
        {renderTypingIndicator()}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ChatInput
            value={messageText}
            onChangeText={handleTyping}
            onSend={handleSend}
            onShowHistory={() => {
              // Navigate to chat history screen
              console.log("Show history");
            }}
            disabled={currentIssue?.status === "RESOLVED"}
            loading={isSending}
            placeholder={
              currentIssue?.status === "RESOLVED"
                ? "This issue is resolved (view-only)"
                : "Type a message..."
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Create Room Modal */}
      <CreateChatRoomModal
        visible={showCreateModal}
        userType={user?.role === "STUDENT" ? "student" : "owner"}
        onSubmit={handleCreateRoom}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
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
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  startChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  startChatBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
});
