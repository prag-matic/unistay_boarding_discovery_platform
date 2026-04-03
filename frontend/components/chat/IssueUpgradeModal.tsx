import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import type { IssueAnalysis } from "@/types/chat.types";
import { ISSUE_BADGE_COLORS, ISSUE_PRIORITY_COLORS } from "@/types/chat.types";

interface IssueUpgradeModalProps {
  visible: boolean;
  analysis: IssueAnalysis | null;
  onUpgrade: (title: string, description?: string) => Promise<void>;
  onDismiss: () => void;
}

export const IssueUpgradeModal: React.FC<IssueUpgradeModalProps> = ({
  visible,
  analysis,
  onUpgrade,
  onDismiss,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!analysis) return null;

  const badgeColors =
    ISSUE_BADGE_COLORS[analysis.category || "other"] ||
    ISSUE_BADGE_COLORS.other;
  const priorityColors =
    ISSUE_PRIORITY_COLORS[analysis.suggestedPriority || "MEDIUM"];

  const handleUpgrade = async () => {
    if (!title.trim()) {
      return;
    }

    setIsUpgrading(true);
    try {
      await onUpgrade(title.trim(), description.trim() || undefined);
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error(
        "Failed to create issue:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={{ flex: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.overlay}>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="warning" size={32} color={badgeColors.bg} />
                </View>
                <Text style={styles.title}>Potential Issue Detected</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              {/* Analysis Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>AI Analysis:</Text>
                <Text style={styles.reason}>{analysis.reason}</Text>

                <View style={styles.badges}>
                  {analysis.category && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: badgeColors.bg },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {analysis.category.replace("_", " ")}
                      </Text>
                    </View>
                  )}

                  {analysis.suggestedPriority && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: priorityColors.bg },
                      ]}
                    >
                      <Text style={[styles.badgeText, styles.priorityText]}>
                        {analysis.suggestedPriority}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Title Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Issue Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Noise complaint, Maintenance needed"
                  placeholderTextColor={COLORS.gray}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={200}
                />
                <Text style={styles.charCount}>{title.length}/200</Text>
              </View>

              {/* Description Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add more details..."
                  placeholderTextColor={COLORS.gray}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/2000</Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.dismissButton]}
                  onPress={handleClose}
                  disabled={isUpgrading}
                >
                  <Text style={styles.dismissButtonText}>Not an Issue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.upgradeButton,
                    !title.trim() && styles.upgradeButtonDisabled,
                  ]}
                  onPress={handleUpgrade}
                  disabled={isUpgrading || !title.trim()}
                >
                  {isUpgrading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="flag" size={18} color={COLORS.white} />
                      <Text style={styles.upgradeButtonText}>Create Issue</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: COLORS.grayLight,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  reason: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.white,
    textTransform: "capitalize",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  inputContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "right",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  dismissButton: {
    backgroundColor: COLORS.grayLight,
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
  },
  upgradeButtonDisabled: {
    opacity: 0.5,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
});
