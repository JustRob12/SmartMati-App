import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

export type ConfirmationType =
  | 'confirm'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'danger';

export interface ConfirmationModalProps {
  visible: boolean;
  type?: ConfirmationType;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  dismissable?: boolean;
  details?: { label: string; value: string }[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  type = 'confirm',
  icon,
  title,
  subtitle,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
  loading = false,
  dismissable = true,
  details,
}) => {
  const getThemeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: icon || 'checkmark-circle',
          iconColor: '#059669',
          iconBg: '#ECFDF5',
          iconBorder: '#A7F3D0',
          btnBg: '#059669',
          btnText: '#FFFFFF',
        };
      case 'danger':
      case 'error':
        return {
          icon: icon || (type === 'danger' ? 'trash-outline' : 'alert-circle'),
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
          iconBorder: '#FECACA',
          btnBg: '#DC2626',
          btnText: '#FFFFFF',
        };
      case 'warning':
        return {
          icon: icon || 'warning-outline',
          iconColor: '#D97706',
          iconBg: '#FFFBEB',
          iconBorder: '#FDE68A',
          btnBg: '#D97706',
          btnText: '#FFFFFF',
        };
      case 'info':
        return {
          icon: icon || 'information-circle-outline',
          iconColor: THEME.colors.primaryLight,
          iconBg: '#EFF6FF',
          iconBorder: '#BFDBFE',
          btnBg: THEME.colors.primary,
          btnText: '#FFFFFF',
        };
      case 'confirm':
      default:
        return {
          icon: icon || 'help-circle-outline',
          iconColor: THEME.colors.primary,
          iconBg: '#EEF2FF',
          iconBorder: '#C7D2FE',
          btnBg: THEME.colors.primary,
          btnText: '#FFFFFF',
        };
    }
  };

  const theme = getThemeConfig();

  const handleBackdropPress = () => {
    if (dismissable && !loading) {
      if (onCancel) onCancel();
      else if (onConfirm) onConfirm();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.cardContainer}>
              {/* Decorative Ambient Bar */}
              <View
                style={[
                  styles.topAccentBar,
                  { backgroundColor: theme.btnBg },
                ]}
              />

              {/* Icon Circle Badge */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: theme.iconBg,
                    borderColor: theme.iconBorder,
                  },
                ]}
              >
                <Ionicons
                  name={theme.icon as any}
                  size={32}
                  color={theme.iconColor}
                />
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.titleText}>{title}</Text>
              {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}

              {/* Main Message */}
              {message ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{message}</Text>
                </View>
              ) : null}

              {/* Optional Key-Value Details */}
              {details && details.length > 0 ? (
                <View style={styles.detailsContainer}>
                  {details.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.detailRow,
                        idx < details.length - 1 && styles.detailRowBorder,
                      ]}
                    >
                      <Text style={styles.detailLabel}>{item.label}</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {cancelText ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={onCancel}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.confirmButton,
                    { backgroundColor: theme.btnBg },
                    !cancelText && styles.confirmButtonFull,
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.btnText} />
                  ) : (
                    <Text
                      style={[
                        styles.confirmButtonText,
                        { color: theme.btnText },
                      ]}
                    >
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 14,
    marginTop: 4,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
  },
  detailsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: '100%',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    maxWidth: '60%',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmButton: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonFull: {
    flex: 1,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
