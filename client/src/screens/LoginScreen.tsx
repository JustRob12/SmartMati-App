import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomInput } from '../components/CustomInput';
import { CityLogo } from '../components/CityLogo';
import { RegisterModal } from './RegisterModal';
import { ConfirmationModal, ConfirmationModalProps } from '../components/ConfirmationModal';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_HEIGHT < 700;

export const LoginScreen: React.FC = () => {
  const { signIn, demoLogin, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [dialogConfig, setDialogConfig] = useState<ConfirmationModalProps | null>(null);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errs.email = 'Please enter a valid email';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (res.error) {
        setDialogConfig({
          visible: true,
          type: 'error',
          icon: 'lock-closed-outline',
          title: 'Sign In Failed',
          subtitle: 'Authentication Error',
          message: res.error,
          confirmText: 'Try Again',
          onConfirm: () => setDialogConfig(null),
        });
      }
    } catch (e: any) {
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Sign In Error',
        message: e.message || 'Unable to connect to SmartMati services.',
        confirmText: 'Dismiss',
        onConfirm: () => setDialogConfig(null),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Top Hero Banner (Compact & Responsive) */}
          <LinearGradient
            colors={[THEME.colors.primaryDark, THEME.colors.primary, '#1D4ED8']}
            style={[styles.heroBanner, isSmallScreen && styles.heroBannerSmall]}
          >
            {/* Subtle Ambient Circles */}
            <View style={styles.glowCircle1} />
            <View style={styles.glowCircle2} />

            <View style={styles.heroContent}>
              <Text style={styles.heroWelcome}>Welcome to</Text>
              <Text style={[styles.heroBrand, isSmallScreen && styles.heroBrandSmall]}>
                <Text style={styles.heroBrandAccent}>Smart</Text>Mati
              </Text>
              <Text style={[styles.heroTagline, isSmallScreen && styles.heroTaglineSmall]}>
                Report non-emergency urban issues and help build a{' '}
                <Text style={styles.heroTaglineHighlight}>better Mati.</Text>
              </Text>
            </View>
          </LinearGradient>

          {/* Login Card (Clean, Flat, Responsive - No Heavy Shadow) */}
          <View style={[styles.loginCard, isSmallScreen && styles.loginCardSmall]}>
            {/* Card Icon Header */}
            <View style={[styles.cardHeader, isSmallScreen && styles.cardHeaderSmall]}>
              <View style={[styles.shieldBadge, isSmallScreen && styles.shieldBadgeSmall]}>
                <Ionicons
                  name="shield-checkmark"
                  size={isSmallScreen ? 22 : 24}
                  color={THEME.colors.primary}
                />
              </View>
              <Text style={[styles.cardTitle, isSmallScreen && styles.cardTitleSmall]}>
                Welcome Back
              </Text>
              <Text style={styles.cardSubtitle}>
                Sign in to report and track urban issues.
              </Text>
            </View>

            {/* Email Input */}
            <CustomInput
              label="Email Address"
              placeholder="Enter your email address"
              leadingIcon="mail-outline"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            {/* Password Input */}
            <CustomInput
              label="Password"
              placeholder="Enter your password"
              leadingIcon="lock-closed-outline"
              isPassword
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
            />

            {/* Remember Me Option (Forgot Password Removed to Save Space) */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={13} color={THEME.colors.white} />
                  )}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>
            </View>

            {/* Log In Button */}
            <TouchableOpacity
              style={[styles.loginButton, isSmallScreen && styles.loginButtonSmall, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={THEME.colors.white} />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={16} color={THEME.colors.white} />
                  <Text style={styles.loginButtonText}>Log In</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Create Account as Clean Text Link (Saves Space) */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => setRegisterVisible(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.registerLink}>Create an Account</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Footer Note */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={16} color={THEME.colors.primary} />
              <Text style={styles.trustText}>
                Your reports help keep <Text style={styles.boldText}>Mati City</Text> clean and safe.
              </Text>
            </View>

            {/* Quick Demo Login helper if offline */}
            {!isConfigured && (
              <TouchableOpacity
                style={styles.demoHelperButton}
                onPress={() => demoLogin('resident@mati.gov.ph', 'Juan Dela Cruz', 'Dahican')}
              >
                <Ionicons name="flash-outline" size={14} color={THEME.colors.accentDark} />
                <Text style={styles.demoHelperText}>
                  Quick Demo Login (Preview Resident Dashboard)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom City of Mati Emblem */}
          <View style={styles.bottomBrandSection}>
            <CityLogo size="sm" showSubtitle />
          </View>
        </ScrollView>

        {/* 3-Step Registration Stepper Modal */}
        <RegisterModal
          visible={registerVisible}
          onClose={() => setRegisterVisible(false)}
          onSuccess={() => setRegisterVisible(false)}
        />

        {/* Universal Dialog Modal */}
        {dialogConfig && <ConfirmationModal {...dialogConfig} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.primaryDark,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  heroBanner: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBannerSmall: {
    paddingTop: 16,
    paddingBottom: 22,
  },
  glowCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  glowCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroWelcome: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  heroBrand: {
    fontSize: 30,
    fontWeight: '900',
    color: THEME.colors.white,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  heroBrandSmall: {
    fontSize: 26,
  },
  heroBrandAccent: {
    color: THEME.colors.accent,
  },
  heroTagline: {
    fontSize: 12,
    color: '#E2E8F0',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
    lineHeight: 16,
  },
  heroTaglineSmall: {
    fontSize: 11,
    marginTop: 2,
  },
  heroTaglineHighlight: {
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  loginCard: {
    backgroundColor: THEME.colors.white,
    marginTop: -14,
    marginHorizontal: 16,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  loginCardSmall: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: -10,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderSmall: {
    marginBottom: 10,
  },
  shieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  shieldBadgeSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  cardTitleSmall: {
    fontSize: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: -4,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  checkboxChecked: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  rememberMeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
  },
  loginButtonSmall: {
    height: 42,
  },
  loginButtonText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
  },
  registerPrompt: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
    textDecorationLine: 'underline',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 14,
    gap: 8,
  },
  trustText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 14,
  },
  boldText: {
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  demoHelperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentLight,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.md,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  demoHelperText: {
    fontSize: 11,
    color: THEME.colors.accentDark,
    fontWeight: '700',
  },
  bottomBrandSection: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
  },
});
