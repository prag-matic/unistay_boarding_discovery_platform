import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Input } from '../ui/Input';
import { PasswordInput } from '../ui/PasswordInput';

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  secureTextEntry,
  leftIcon,
  keyboardType = 'default',
  autoCapitalize,
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) =>
        secureTextEntry ? (
          <PasswordInput
            label={label}
            value={value as string}
            onChangeText={onChange}
            placeholder={placeholder}
            error={error?.message}
            leftIcon={leftIcon}
          />
        ) : (
          <Input
            label={label}
            value={value as string}
            onChangeText={onChange}
            placeholder={placeholder}
            error={error?.message}
            leftIcon={leftIcon}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
          />
        )
      }
    />
  );
}
