import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "@/lib/constants";
import { useChatStore } from "@/store/chat.store";
import type { ChatRoom } from "@/types/chat.types";

export default function ChatHistoryScreen() {
  const { setCurrentRoom, joinRoom } = useChatStore();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async (cursor?: string) => {
    try {
      const { getChatRooms } = await import("@/lib/chat");
      const response = await getChatRooms(15, cursor);
      const { rooms, nextCursor: cursorResp } = response.data;

      if (cursor) {
        setChatRooms((prev) => [...prev, ...rooms]);
      } else {
        setChatRooms(rooms);
      }

      setNextCursor(cursorResp);
      setHasMore(!!cursorResp);
    } catch (error: unknown) {
      console.error(
        "Failed to load chat rooms:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadChatRooms();
  };

  const handleLoadMore = async () => {
    if (!hasMore || isRefreshing) return;
    await loadChatRooms(nextCursor);
  };

  const handleSelectRoom = async (room: ChatRoom) => {
    try {
      await joinRoom(room.id);
      setCurrentRoom(room);
      router.back(); // Go back to messages screen
    } catch (error: unknown) {
      console.error(
        "Failed to join room:",
        error instanceof Error ? error.message : error,
      );
    }
  };

  const renderRoom = ({ item }: { item: ChatRoom }) => {
    const otherUser = item.participants.student;
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
          <View style={styles.infoHeader}>
            <Text style={styles.userName} numberOfLines={1}>
              {otherUser.firstName} {otherUser.lastName}
            </Text>
            {timeAgo && <Text style={styles.time}>{timeAgo}</Text>}
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage?.content || "No messages yet"}
          </Text>

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Chat History</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Chat History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Chat Rooms List */}
      <FlatList
        data={chatRooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Chat History</Text>
            <Text style={styles.emptyText}>
              Start a conversation to see your chat history here
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore && !isRefreshing ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : null
        }
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
    gap: 8,
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
    gap: 4,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    flex: 1,
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
