import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../components/CustomInput';
import { DropdownModal } from '../components/DropdownModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { TermsModal } from '../components/TermsModal';
import { ConfirmationModal, ConfirmationModalProps } from '../components/ConfirmationModal';
import { CaptchaChallenge, generateCaptchaCode } from '../components/CaptchaChallenge';
import { StepperIndicator } from '../components/StepperIndicator';
import { CityLogo } from '../components/CityLogo';
import { GENDERS, MATI_BARANGAYS, THEME } from '../lib/constants';
import { Barangay, Gender, RegisterFormData } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';

interface RegisterModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { signUp, verifyOtp, resendOtp } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    gender: '',
    birthdate: '',
    phone: '',
    email: '',
    city: 'Mati City',
    barangay: '',
    purok: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  // CAPTCHA State (Step 4)
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptchaCode());
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  // Email OTP State (Step 5 if email confirmation required)
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sub-Modals
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [barangayModalVisible, setBarangayModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Custom Alert / Confirmation Dialog
  const [dialogConfig, setDialogConfig] = useState<ConfirmationModalProps | null>(null);

  // Refresh CAPTCHA code
  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptchaCode());
    setUserCaptchaInput('');
    setCaptchaError('');
  };

  // Reset or refresh when modal opens or step changes to 4
  useEffect(() => {
    if (visible && step === 4) {
      refreshCaptcha();
    }
  }, [visible, step]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 5 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCooldown]);

  const updateField = (field: keyof RegisterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    updateField('phone', cleaned);
  };

  // Step Validations
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      errs.fullName = 'Full name is required';
    }
    if (!formData.gender) {
      errs.gender = 'Please select your gender';
    }
    if (!formData.birthdate.trim()) {
      errs.birthdate = 'Please select your birthdate';
    }
    if (!formData.phone.trim()) {
      errs.phone = 'Mobile number is required';
    } else if (formData.phone.length < 10) {
      errs.phone = 'Enter a valid 10 or 11-digit mobile number';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!formData.barangay) {
      errs.barangay = 'Please select your Barangay in Mati City';
    }
    if (!formData.purok.trim()) {
      errs.purok = 'Purok or street name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!formData.agreeToTerms) {
      errs.agreeToTerms = 'You must agree to the Terms and Privacy Policy';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep4Captcha = () => {
    if (!userCaptchaInput.trim()) {
      setCaptchaError('Please enter the CAPTCHA code shown above');
      return false;
    }
    if (userCaptchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setCaptchaError('Incorrect code. A new code has been generated.');
      refreshCaptcha();
      return false;
    }
    setCaptchaError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
      refreshCaptcha();
    }
  };

  const handleBack = () => {
    if (step > 1 && step <= 4) {
      setStep(step - 1);
    } else if (step === 5) {
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep4Captcha()) return;

    setLoading(true);
    try {
      const res = await signUp(formData);
      if (res.error) {
        setDialogConfig({
          visible: true,
          type: 'error',
          title: 'Registration Failed',
          message: res.error,
          confirmText: 'Try Again',
          onConfirm: () => setDialogConfig(null),
        });
      } else if (res.requiresEmailConfirmation) {
        // Transition to 6-digit Email OTP Verification
        setStep(5);
        setResendCooldown(60);
        setOtpCode('');
        setOtpError('');
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 350);
      } else {
        setDialogConfig({
          visible: true,
          type: 'success',
          title: 'Account Created! 🎉',
          subtitle: 'Welcome to SmartMati',
          message: 'Your resident account is ready. You can now log in and report community issues.',
          confirmText: 'Get Started',
          onConfirm: () => {
            setDialogConfig(null);
            handleResetAndClose();
            onSuccess();
          },
        });
      }
    } catch (e: any) {
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Registration Error',
        message: e.message || 'Unable to complete account registration.',
        confirmText: 'Dismiss',
        onConfirm: () => setDialogConfig(null),
      });
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Submission
  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setOtpError('Please enter all 6 digits of the confirmation code.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await verifyOtp(formData.email, otpCode);
      if (res.error) {
        setOtpError(res.error || 'Invalid code. Please check the 6-digit code sent to your email.');
      } else {
        setDialogConfig({
          visible: true,
          type: 'success',
          title: 'Email Verified! ✨',
          subtitle: 'Account Activated',
          message: 'Your SmartMati resident account is now verified and active.',
          confirmText: 'Go to Dashboard',
          onConfirm: () => {
            setDialogConfig(null);
            handleResetAndClose();
            onSuccess();
          },
        });
      }
    } catch (e: any) {
      setOtpError(e.message || 'Error during email verification.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setOtpError('');
    try {
      const res = await resendOtp(formData.email);
      if (res.error) {
        setDialogConfig({
          visible: true,
          type: 'warning',
          title: 'Unable to Resend',
          message: res.error,
          confirmText: 'OK',
          onConfirm: () => setDialogConfig(null),
        });
      } else {
        setDialogConfig({
          visible: true,
          type: 'info',
          title: 'New Code Sent',
          message: `A fresh 6-digit confirmation code was sent to ${formData.email}.`,
          confirmText: 'Got It',
          onConfirm: () => setDialogConfig(null),
        });
        setResendCooldown(60);
      }
    } catch (e: any) {
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: e.message || 'Could not resend email code',
        confirmText: 'OK',
        onConfirm: () => setDialogConfig(null),
      });
    } finally {
      setResending(false);
    }
  };

  const handleResetAndClose = () => {
    setStep(1);
    setOtpCode('');
    setOtpError('');
    setUserCaptchaInput('');
    setCaptchaError('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleResetAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={step > 1 && step <= 4 ? handleBack : handleResetAndClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={step > 1 && step <= 4 ? 'arrow-back' : 'close'}
              size={22}
              color={THEME.colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>
            {step === 1
              ? 'Step 1 of 4: Personal Details'
              : step === 2
              ? 'Step 2 of 4: Mati Address'
              : step === 3
              ? 'Step 3 of 4: Account Security'
              : step === 4
              ? 'Step 4 of 4: Verification'
              : 'Email Confirmation'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Seal Header (Steps 1 to 4) */}
          {step <= 4 && (
            <>
              <View style={styles.headerHero}>
                <CityLogo size="sm" />
                <Text style={styles.mainTitle}>Create Account</Text>
                <Text style={styles.subTitle}>
                  Join <Text style={styles.brandName}><Text style={styles.brandAccent}>Smart</Text>Mati</Text> to report and monitor urban issues.
                </Text>
              </View>

              {/* Stepper Indicator */}
              <StepperIndicator currentStep={step} totalSteps={4} />
            </>
          )}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <View style={styles.stepCard}>
              <View style={styles.stepCardHeader}>
                <Ionicons name="person-circle-outline" size={20} color={THEME.colors.primary} />
                <Text style={styles.stepCardTitle}>Personal Information</Text>
              </View>

              <CustomInput
                label="Full Name"
                placeholder="e.g. Juan P. Dela Cruz"
                leadingIcon="person-outline"
                value={formData.fullName}
                onChangeText={(t) => updateField('fullName', t)}
                error={errors.fullName}
                required
              />

              <CustomInput
                label="Gender"
                placeholder="Select your gender"
                leadingIcon="people-outline"
                value={formData.gender}
                onPress={() => setGenderModalVisible(true)}
                error={errors.gender}
                required
              />

              <CustomInput
                label="Birthdate"
                placeholder="Select your date of birth"
                leadingIcon="calendar-outline"
                value={formData.birthdate}
                onPress={() => setDatePickerVisible(true)}
                error={errors.birthdate}
                helperText="Tap to choose date from calendar"
                required
              />

              <CustomInput
                label="Mobile Phone Number"
                placeholder="e.g. 09171234567"
                leadingIcon="call-outline"
                value={formData.phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={11}
                error={errors.phone}
                helperText="10 or 11-digit mobile number for resident updates"
                required
              />

              <CustomInput
                label="Email Address"
                placeholder="e.g. juan@example.com"
                leadingIcon="mail-outline"
                value={formData.email}
                onChangeText={(t) => updateField('email', t)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                required
              />
            </View>
          )}

          {/* Step 2: Address Info */}
          {step === 2 && (
            <View style={styles.stepCard}>
              <View style={styles.stepCardHeader}>
                <Ionicons name="location" size={20} color={THEME.colors.accent} />
                <Text style={styles.stepCardTitle}>Mati Residence Location</Text>
              </View>

              {/* City (Auto locked to Mati City) */}
              <View style={styles.fixedCityContainer}>
                <Text style={styles.fieldLabel}>City / Municipality</Text>
                <View style={styles.fixedCityBox}>
                  <View style={styles.cityLeft}>
                    <Ionicons name="business-outline" size={20} color={THEME.colors.primary} />
                    <Text style={styles.fixedCityText}>Mati City</Text>
                  </View>
                  <View style={styles.matiBadge}>
                    <Ionicons name="shield-checkmark" size={13} color={THEME.colors.primary} />
                    <Text style={styles.matiBadgeText}>Official LGU</Text>
                  </View>
                </View>
                <Text style={styles.cityHelperText}>
                  This portal is dedicated for residents and constituents of the City of Mati.
                </Text>
              </View>

              {/* Barangay Dropdown */}
              <CustomInput
                label="Barangay"
                placeholder="Select your barangay"
                leadingIcon="location-outline"
                value={formData.barangay}
                onPress={() => setBarangayModalVisible(true)}
                error={errors.barangay}
                helperText="Choose from the 26 official barangays of Mati"
                required
              />

              {/* Purok Text Field */}
              <CustomInput
                label="Purok / Street / Zone"
                placeholder="e.g. Purok 4, Mangga Street"
                leadingIcon="home-outline"
                value={formData.purok}
                onChangeText={(t) => updateField('purok', t)}
                error={errors.purok}
                helperText="Specific purok or neighborhood in your barangay"
                required
              />
            </View>
          )}

          {/* Step 3: Security & Terms */}
          {step === 3 && (
            <View style={styles.stepCard}>
              <View style={styles.stepCardHeader}>
                <Ionicons name="lock-closed" size={20} color={THEME.colors.primary} />
                <Text style={styles.stepCardTitle}>Account Security</Text>
              </View>

              <CustomInput
                label="Password"
                placeholder="Create a strong password (min 6 chars)"
                leadingIcon="lock-closed-outline"
                isPassword
                value={formData.password}
                onChangeText={(t) => updateField('password', t)}
                error={errors.password}
                required
              />

              <CustomInput
                label="Confirm Password"
                placeholder="Re-enter your password"
                leadingIcon="lock-closed-outline"
                isPassword
                value={formData.confirmPassword}
                onChangeText={(t) => updateField('confirmPassword', t)}
                error={errors.confirmPassword}
                required
              />

              {/* Terms & Conditions */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.8}
                onPress={() => updateField('agreeToTerms', !formData.agreeToTerms)}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    formData.agreeToTerms && styles.checkboxBoxChecked,
                    errors.agreeToTerms ? styles.checkboxBoxError : null,
                  ]}
                >
                  {formData.agreeToTerms && (
                    <Ionicons name="checkmark" size={16} color={THEME.colors.white} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxLabel}>
                    I agree to the{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => setTermsModalVisible(true)}
                    >
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => setTermsModalVisible(true)}
                    >
                      Privacy Policy
                    </Text>{' '}
                    of Mati City.
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.agreeToTerms && (
                <Text style={styles.termsErrorText}>{errors.agreeToTerms}</Text>
              )}
            </View>
          )}

          {/* Step 4: Resident Verification & Review */}
          {step === 4 && (
            <View style={styles.stepCard}>
              <View style={styles.stepCardHeader}>
                <Ionicons name="shield-checkmark" size={20} color={THEME.colors.primary} />
                <Text style={styles.stepCardTitle}>Review & Verification</Text>
              </View>

              {/* Resident Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Resident Profile Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Name:</Text>
                  <Text style={styles.summaryValue}>{formData.fullName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Location:</Text>
                  <Text style={styles.summaryValue}>
                    {formData.purok}, Brgy. {formData.barangay}, Mati
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Email:</Text>
                  <Text style={styles.summaryValue}>{formData.email}</Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryLabel}>Phone:</Text>
                  <Text style={styles.summaryValue}>{formData.phone}</Text>
                </View>
              </View>

              {/* Security CAPTCHA Challenge */}
              <CaptchaChallenge
                captchaCode={captchaCode}
                value={userCaptchaInput}
                onChangeText={(t) => {
                  setUserCaptchaInput(t);
                  if (captchaError) setCaptchaError('');
                }}
                error={captchaError}
                onRefresh={refreshCaptcha}
              />
            </View>
          )}

          {/* Step 5: Email 6-Digit OTP Verification (if required) */}
          {step === 5 && (
            <View style={styles.otpCard}>
              <View style={styles.otpIconBadge}>
                <Ionicons name="mail-unread-outline" size={40} color={THEME.colors.primary} />
                <View style={styles.otpKeyDot}>
                  <Ionicons name="key" size={12} color={THEME.colors.white} />
                </View>
              </View>

              <Text style={styles.otpTitle}>Verify Your Email</Text>
              <Text style={styles.otpSubtitle}>
                We sent a 6-digit confirmation code to:
              </Text>

              {/* Email Pill */}
              <View style={styles.emailPill}>
                <Ionicons name="mail" size={14} color={THEME.colors.primary} />
                <Text style={styles.emailPillText}>{formData.email}</Text>
              </View>

              {/* 6-Digit Code Visual Boxes */}
              <TouchableOpacity
                style={styles.otpBoxesRow}
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = otpCode[index] || '';
                  const isCurrent = index === otpCode.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        isCurrent && styles.otpBoxActive,
                        digit ? styles.otpBoxFilled : null,
                        otpError ? styles.otpBoxError : null,
                      ]}
                    >
                      <Text style={styles.otpDigitText}>{digit}</Text>
                    </View>
                  );
                })}
              </TouchableOpacity>

              {/* Hidden Real TextInput */}
              <TextInput
                ref={otpInputRef}
                style={styles.hiddenOtpInput}
                value={otpCode}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtpCode(cleaned);
                  if (otpError) setOtpError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              {/* Error Alert */}
              {Boolean(otpError) && (
                <View style={styles.otpErrorRow}>
                  <Ionicons name="alert-circle" size={16} color={THEME.colors.error} />
                  <Text style={styles.otpErrorText}>{otpError}</Text>
                </View>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.otpVerifyButton,
                  (otpCode.length !== 6 || otpLoading) && styles.buttonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={otpCode.length !== 6 || otpLoading}
                activeOpacity={0.85}
              >
                {otpLoading ? (
                  <ActivityIndicator color={THEME.colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color={THEME.colors.white} />
                    <Text style={styles.primaryButtonText}>Verify & Complete</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Resend Code Section */}
              <View style={styles.resendSection}>
                <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
                {resendCooldown > 0 ? (
                  <Text style={styles.resendTimerText}>Resend in {resendCooldown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} disabled={resending}>
                    <Text style={styles.resendLinkText}>
                      {resending ? 'Sending...' : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Change Email Button */}
              <TouchableOpacity
                style={styles.changeEmailButton}
                onPress={() => setStep(1)}
              >
                <Ionicons name="pencil-outline" size={14} color={THEME.colors.textSecondary} />
                <Text style={styles.changeEmailText}>Change email address</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons for Steps 1 to 4 */}
          {step <= 4 && (
            <View style={styles.footerActions}>
              {step < 4 ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleNext}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>
                    {step === 3 ? 'Proceed to Verification' : `Continue to Step ${step + 1}`}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={THEME.colors.white} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={THEME.colors.white} />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={18} color={THEME.colors.white} />
                      <Text style={styles.primaryButtonText}>Create & Submit Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {step > 1 && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleBack}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Back to Previous Step</Text>
                </TouchableOpacity>
              )}

              {/* Login Link */}
              <View style={styles.loginRow}>
                <Text style={styles.loginPrompt}>Already have an account? </Text>
                <TouchableOpacity onPress={handleResetAndClose}>
                  <Text style={styles.loginLink}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sub-Modals */}
        <DatePickerModal
          visible={datePickerVisible}
          selectedDate={formData.birthdate}
          onSelect={(date) => updateField('birthdate', date)}
          onClose={() => setDatePickerVisible(false)}
        />

        <DropdownModal
          visible={genderModalVisible}
          title="Select Gender"
          options={GENDERS}
          selectedValue={formData.gender}
          onSelect={(val) => updateField('gender', val as Gender)}
          onClose={() => setGenderModalVisible(false)}
          searchable={false}
        />

        <DropdownModal
          visible={barangayModalVisible}
          title="Select Barangay in Mati City"
          options={MATI_BARANGAYS}
          selectedValue={formData.barangay}
          onSelect={(val) => updateField('barangay', val as Barangay)}
          onClose={() => setBarangayModalVisible(false)}
          searchable={true}
        />

        <TermsModal
          visible={termsModalVisible}
          onClose={() => setTermsModalVisible(false)}
        />

        {/* Universal Dialog Modal */}
        {dialogConfig && <ConfirmationModal {...dialogConfig} />}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: THEME.colors.white,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerHero: {
    alignItems: 'center',
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
  brandName: {
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  brandAccent: {
    color: THEME.colors.accent,
  },
  stepCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    maxWidth: '65%',
  },
  fixedCityContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 5,
  },
  fixedCityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    height: 46,
    paddingHorizontal: 12,
  },
  cityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fixedCityText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  matiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.sm,
    gap: 4,
  },
  matiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  cityHelperText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 6,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.6,
    borderColor: THEME.colors.textMuted,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  checkboxBoxChecked: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  checkboxBoxError: {
    borderColor: THEME.colors.error,
  },
  checkboxLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  linkText: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsErrorText: {
    fontSize: 11,
    color: THEME.colors.error,
    marginBottom: 6,
    paddingHorizontal: 2,
    fontWeight: '500',
  },
  footerActions: {
    marginTop: 16,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginPrompt: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
  },

  // OTP Step Styles (Step 5)
  otpCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  otpIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    position: 'relative',
  },
  otpKeyDot: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    backgroundColor: THEME.colors.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.white,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  otpSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: THEME.borderRadius.full,
    gap: 6,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emailPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    width: '100%',
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: THEME.colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  otpBoxFilled: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: THEME.colors.primarySoft,
  },
  otpBoxError: {
    borderColor: THEME.colors.error,
    backgroundColor: '#FFFBFB',
  },
  otpDigitText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  otpErrorText: {
    fontSize: 12,
    color: THEME.colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpVerifyButton: {
    width: '100%',
    marginTop: 6,
    marginBottom: 14,
  },
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resendPrompt: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  resendTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  resendLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  changeEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  changeEmailText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
});
