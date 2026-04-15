import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from './Input';
import { COLORS } from '@/lib/constants';
import type { ViewStyle } from 'react-native';

interface PasswordInputProps {
  label?: string;
  error?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
}

export function PasswordInput({
  label,
  error,
  value,
  onChangeText,
  placeholder = 'Enter password',
  containerStyle,
  leftIcon,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      label={label}
      error={error}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={!visible}
      containerStyle={containerStyle}
      leftIcon={leftIcon}
      rightIcon={
        <TouchableOpacity onPress={() => setVisible((v) => !v)}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={COLORS.gray}
          />
        </TouchableOpacity>
      }
    />
  );
}
