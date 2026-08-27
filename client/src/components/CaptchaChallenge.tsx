import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

interface CaptchaChallengeProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  onRefresh?: () => void;
  captchaCode: string;
}

const CHAR_COLORS = ['#1E3A8A', '#2563EB', '#D97706', '#0F172A', '#1D4ED8', '#B45309'];
const ROTATIONS = ['-10deg', '8deg', '-6deg', '12deg', '-8deg', '6deg'];

export const generateCaptchaCode = (length = 5): string => {
  // Use unambiguous characters (avoid 0, O, 1, I, l)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({
  value,
  onChangeText,
  error,
  onRefresh,
  captchaCode,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Security Verification (CAPTCHA) <Text style={styles.requiredStar}>*</Text>
      </Text>
      <Text style={styles.instruction}>
        Type the characters shown in the security box below to verify you are a resident.
      </Text>

      {/* CAPTCHA Display Card */}
      <View style={styles.captchaDisplayRow}>
        <View style={styles.captchaBox}>
          {/* Background interference lines */}
          <View style={styles.line1} />
          <View style={styles.line2} />
          <View style={styles.line3} />

          {/* Rendered Distorted Characters */}
          <View style={styles.charsRow}>
            {captchaCode.split('').map((char, index) => {
              const rotation = ROTATIONS[index % ROTATIONS.length];
              const color = CHAR_COLORS[index % CHAR_COLORS.length];
              return (
                <View
                  key={index}
                  style={[
                    styles.charWrapper,
                    { transform: [{ rotate: rotation }] },
                  ]}
                >
                  <Text style={[styles.charText, { color }]}>{char}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={20} color={THEME.colors.primary} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* CAPTCHA Input Field */}
      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={error ? THEME.colors.error : THEME.colors.primaryLight}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter the code shown above"
          placeholderTextColor={THEME.colors.textMuted}
          value={value}
          onChangeText={(t) => onChangeText(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={THEME.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <Text style={styles.helperText}>Case-insensitive security verification</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  requiredStar: {
    color: THEME.colors.error,
    fontWeight: '700',
  },
  instruction: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  captchaDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  captchaBox: {
    flex: 1,
    height: 52,
    backgroundColor: '#F1F5F9',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  line1: {
    position: 'absolute',
    width: '120%',
    height: 1.5,
    backgroundColor: 'rgba(245, 158, 11, 0.4)',
    top: 18,
    left: -10,
    transform: [{ rotate: '6deg' }],
  },
  line2: {
    position: 'absolute',
    width: '120%',
    height: 1.5,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    bottom: 16,
    left: -10,
    transform: [{ rotate: '-8deg' }],
  },
  line3: {
    position: 'absolute',
    width: '120%',
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    top: 26,
    left: -10,
    transform: [{ rotate: '2deg' }],
  },
  charsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  charWrapper: {
    paddingHorizontal: 2,
  },
  charText: {
    fontFamily: 'Courier',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    height: 52,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
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
  inputWrapperError: {
    borderColor: THEME.colors.error,
    backgroundColor: '#FFFBFB',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 11,
    color: THEME.colors.error,
    marginLeft: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
