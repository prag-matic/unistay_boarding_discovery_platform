import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

interface CreateChatRoomModalProps {
  visible: boolean;
  userType: "student" | "owner";
  onSubmit: (otherUserId: string) => Promise<void>;
  onClose: () => void;
}

export const CreateChatRoomModal: React.FC<CreateChatRoomModalProps> = ({
  visible,
  userType,
  onSubmit,
  onClose,
}) => {
  const [otherUserId, setOtherUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!otherUserId.trim()) {
      setError("Please enter a user ID");
      return;
    }

    // Basic validation for MongoDB ObjectId format (24 characters, hex)
    if (!/^[0-9a-fA-F]{24}$/.test(otherUserId.trim())) {
      setError(
        "Invalid user ID format (must be 24 character MongoDB ObjectId)",
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onSubmit(otherUserId.trim());
      setOtherUserId("");
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create chat room",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOtherUserId("");
    setError("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="people" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>Start New Chat</Text>
                <Text style={styles.subtitle}>
                  {userType === "student"
                    ? "Enter the owner's ID to start chatting"
                    : "Enter the student's ID to start chatting"}
                </Text>
              </View>

              {/* Dev Notice */}
              <View style={styles.devNotice}>
                <View style={styles.devNoticeHeader}>
                  <Ionicons name="construct" size={18} color={COLORS.orange} />
                  <Text style={styles.devNoticeTitle}>Development Mode</Text>
                </View>
                <Text style={styles.devNoticeText}>
                  {userType === "student" ? (
                    <>
                      In production, this will automatically use the owner ID
                      from your{" "}
                      <Text style={styles.devNoticeBold}>
                        active reservation
                      </Text>
                      . For now, please manually enter the owner's user ID.
                    </>
                  ) : (
                    <>
                      In production, this will automatically use the student ID
                      from the{" "}
                      <Text style={styles.devNoticeBold}>
                        reservation or visit request
                      </Text>
                      . For now, please manually enter the student's user ID.
                    </>
                  )}
                </Text>
              </View>

              {/* Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>User ID</Text>
                <View style={[styles.inputWrapper, error && styles.inputError]}>
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color={error ? COLORS.red : COLORS.gray}
                  />
                  <TextInput
                    style={styles.input}
                    value={otherUserId}
                    onChangeText={(text) => {
                      setOtherUserId(text);
                      setError("");
                    }}
                    placeholder="e.g., 507f1f77bcf86cd799439011"
                    placeholderTextColor={COLORS.gray}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="default"
                    editable={!isLoading}
                  />
                </View>
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={COLORS.red}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={COLORS.gray}
                />
                <Text style={styles.helpText}>
                  You can find user IDs in the database or from the other user's
                  profile.
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!otherUserId.trim() || isLoading) &&
                      styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!otherUserId.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons
                        name="paper-plane"
                        size={18}
                        color={COLORS.white}
                      />
                      <Text style={styles.submitBtnText}>Start Chat</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    gap: 20,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  devNotice: {
    backgroundColor: COLORS.orange + "10",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  devNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  devNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.orange,
  },
  devNoticeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  devNoticeBold: {
    fontWeight: "600",
    color: COLORS.text,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red + "05",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.red,
    flex: 1,
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.grayLight,
    padding: 12,
    borderRadius: 12,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.gray,
    flex: 1,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
});
