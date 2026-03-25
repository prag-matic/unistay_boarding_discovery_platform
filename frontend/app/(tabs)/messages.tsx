import React, { useState, useEffect, useRef } from "react";
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
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { IssueBanner } from "@/components/chat/IssueBanner";
import { CreateChatRoomModal } from "@/components/chat/CreateChatRoomModal";
import { ISSUE_BACKGROUND_COLORS } from "@/types/chat.types";
import type { ChatRoom, ChatMessage, Issue } from "@/types/chat.types";

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
  } = useChatStore();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
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
    connectSocket();
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
      const { getChatRooms } = await import("@/lib/chat");
      const response = await getChatRooms(50);
      const { rooms } = response.data;
      setChatRooms(rooms);
    } catch (error: unknown) {
      console.error(
        "Failed to load chat rooms:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleSelectRoom = async (room: ChatRoom) => {
    try {
      await joinRoom(room.id);
      setCurrentRoom(room);
      await loadMessages(room.id);
      setShowChatInterface(true);
    } catch (error: unknown) {
      console.error(
        "Failed to join room:",
        error instanceof Error ? error.message : error,
      );
      Alert.alert("Error", "Failed to load chat. Please try again.");
    }
  };

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

      await joinRoom(room.id);
      setCurrentRoom(room);
      await loadMessages(room.id);
      setShowCreateModal(false);

      // Send pending message if exists
      if (messageText.trim()) {
        setTimeout(() => handleSend(), 500);
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

  const renderRoom = ({ item }: { item: ChatRoom }) => {
    const otherUser =
      user?.role === "STUDENT"
        ? item.participants.owner
        : item.participants.student;
    const lastMessage = item.lastMessage;
    const timeAgo = lastMessage?.createdAt
      ? formatTimeAgo(lastMessage.createdAt)
      : "";

    return (
      <TouchableOpacity
        style={styles.roomCard}
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
          {lastMessage && (
            <View style={styles.lastMessageRow}>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {lastMessage.content}
              </Text>
              <Text style={styles.time}>{timeAgo}</Text>
            </View>
          )}
          {item.boardingId && (
            <View style={styles.boardingTag}>
              <Ionicons name="home-outline" size={12} color={COLORS.gray} />
              <Text style={styles.boardingTagText} numberOfLines={1}>
                {item.boardingId.propertyName}
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
      </TouchableOpacity>
    );
  };

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
      <SafeAreaView
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
            {currentRoom.boardingId && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {currentRoom.boardingId.propertyName}
              </Text>
            )}
          </View>
        </View>

        {/* Issue Banner */}
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
            disabled={currentIssue?.status === "RESOLVED"}
            loading={isSending}
            placeholder={
              currentIssue?.status === "RESOLVED"
                ? "This issue is resolved (view-only)"
                : "Type a message..."
            }
          />
        </KeyboardAvoidingView>

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
      </SafeAreaView>
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
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
          }
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
    </SafeAreaView>
  );
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
