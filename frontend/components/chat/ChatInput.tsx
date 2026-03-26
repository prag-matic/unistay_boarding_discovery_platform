import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  disabled = false,
  loading = false,
  placeholder = "Type a message...",
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (value.trim() && !loading && !disabled) {
      onSend();
    }
  };

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray}
          multiline
          maxLength={1000}
          editable={!disabled && !loading}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />

        {loading && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.loader}
          />
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.sendBtn,
          (!value.trim() || loading || disabled) && styles.sendBtnDisabled,
        ]}
        onPress={handleSend}
        disabled={!value.trim() || loading || disabled}
      >
        <Ionicons
          name="send"
          size={20}
          color={
            !value.trim() || loading || disabled ? COLORS.gray : COLORS.white
          }
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  containerFocused: {
    backgroundColor: COLORS.white,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 120,
  },
  inputFocused: {
    backgroundColor: COLORS.grayLight,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    padding: 0,
    margin: 0,
  },
  inputDisabled: {
    color: COLORS.gray,
  },
  loader: {
    marginLeft: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.grayLight,
    shadowOpacity: 0,
    elevation: 0,
  },
});
