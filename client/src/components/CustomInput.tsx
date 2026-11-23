import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

interface CustomInputProps extends TextInputProps {
  label?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  required?: boolean;
  helperText?: string;
}

export const CustomInput = React.forwardRef<TextInput, CustomInputProps>(
  (props, ref) => {
    const {
      label,
      leadingIcon,
      error,
      isPassword = false,
      disabled = false,
      onPress,
      required = false,
      helperText,
      value,
      placeholder,
      ...restProps
    } = props;
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const isClickable = Boolean(onPress);

  const wrapperStyle = [
    styles.inputWrapper,
    isFocused && styles.inputWrapperFocused,
    error ? styles.inputWrapperError : null,
    disabled ? styles.inputWrapperDisabled : null,
  ];

  const renderInner = () => (
    <>
      {leadingIcon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={leadingIcon}
            size={18}
            color={
              error
                ? THEME.colors.error
                : isFocused
                ? THEME.colors.primaryLight
                : THEME.colors.textMuted
            }
          />
        </View>
      )}

      {isClickable ? (
        <Text
          style={[
            styles.input,
            !value ? styles.placeholderText : styles.valueText,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      ) : (
        <TextInput
          ref={ref}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          value={value}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            restProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            restProps.onBlur?.(e);
          }}
          editable={!disabled}
          {...restProps}
        />
      )}

      {isPassword && (
        <TouchableOpacity
          style={styles.rightIconButton}
          onPress={() => setShowPassword(!showPassword)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={THEME.colors.textMuted}
          />
        </TouchableOpacity>
      )}

      {isClickable && !isPassword && (
        <View style={styles.rightIconButton}>
          <Ionicons name="chevron-down" size={16} color={THEME.colors.textMuted} />
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredStar}>*</Text>}
        </View>
      )}

      {isClickable ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPress}
          style={wrapperStyle}
        >
          {renderInner()}
        </TouchableOpacity>
      ) : (
        <View style={wrapperStyle}>
          {renderInner()}
        </View>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={THEME.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

CustomInput.displayName = 'CustomInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  requiredStar: {
    color: THEME.colors.error,
    marginLeft: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    height: 46,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: THEME.colors.primaryLight,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: THEME.colors.error,
    backgroundColor: '#FFFBFB',
  },
  inputWrapperDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    paddingVertical: 0,
  },
  valueText: {
    color: THEME.colors.textPrimary,
  },
  placeholderText: {
    color: THEME.colors.textMuted,
  },
  rightIconButton: {
    padding: 4,
    marginLeft: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 11,
    color: THEME.colors.error,
    marginLeft: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 3,
    paddingHorizontal: 2,
  },
});
