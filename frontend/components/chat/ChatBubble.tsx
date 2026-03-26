import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/lib/constants";
import type { ChatMessage } from "@/types/chat.types";

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
  senderName?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  showSender = false,
  senderName,
}) => {
  // Defensive check - ensure message has required fields
  if (!message || !message.content) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer,
      ]}
    >
      {showSender && !isOwn && senderName && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}

      <View
        style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}
      >
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
          {message.content}
        </Text>

        <View style={styles.meta}>
          <Text
            style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && message.isRead && (
            <Text style={styles.readIndicator}>✓✓</Text>
          )}
        </View>
      </View>
    </View>
  );
};

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    paddingHorizontal: 16,
    maxWidth: "80%",
  },
  ownContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  otherContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 18,
    padding: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: COLORS.white,
  },
  otherText: {
    color: COLORS.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
  },
  ownTime: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  otherTime: {
    color: COLORS.gray,
  },
  readIndicator: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  senderName: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 4,
    marginLeft: 4,
  },
});
