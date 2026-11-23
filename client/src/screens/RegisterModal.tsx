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
  Image,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CustomInput } from '../components/CustomInput';
import { DropdownModal } from '../components/DropdownModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { TermsModal } from '../components/TermsModal';
import { ConfirmationModal, ConfirmationModalProps } from '../components/ConfirmationModal';
import { CaptchaChallenge, generateCaptchaCode } from '../components/CaptchaChallenge';
import { StepperIndicator } from '../components/StepperIndicator';
import { CityLogo } from '../components/CityLogo';
import { GENDERS, MATI_BARANGAYS, THEME, VALID_ID_TYPES } from '../lib/constants';
import { Barangay, Gender, RegisterFormData } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { useKeyboard } from '../hooks/useKeyboard';

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

  // Smooth Step Transition Animation
  const stepFadeAnim = useRef(new Animated.Value(1)).current;
  const stepSlideAnim = useRef(new Animated.Value(0)).current;

  // Keyboard avoidance and auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const { keyboardVisible, keyboardHeight, keyboardAnim } = useKeyboard();

  // Step 4 Layout Coordinates for CAPTCHA Auto-scroll
  const [step4CardY, setStep4CardY] = useState(0);
  const [captchaRelY, setCaptchaRelY] = useState(0);
  const [captchaFocused, setCaptchaFocused] = useState(false);

  const scrollToCaptcha = (animated = true) => {
    const targetY = (step4CardY > 0 && captchaRelY > 0)
      ? (step4CardY + captchaRelY - 12)
      : 840;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY), animated });
  };

  useEffect(() => {
    if (step === 4 && captchaFocused) {
      scrollToCaptcha(true);
      const timer1 = setTimeout(() => scrollToCaptcha(true), 150);
      const timer2 = setTimeout(() => scrollToCaptcha(true), 350);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [step, captchaFocused, keyboardVisible, keyboardHeight, step4CardY, captchaRelY]);

  const animateToStep = (nextStep: number) => {
    stepFadeAnim.setValue(0);
    stepSlideAnim.setValue(18);
    setStep(nextStep);
    Animated.parallel([
      Animated.timing(stepFadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(stepSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
    agreeToDataPrivacy: false,
    idType: VALID_ID_TYPES[0],
    idPhotoUrl: '',
    residencyCertUrl: '',
  });

  // CAPTCHA State (Step 4)
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptchaCode());
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  // Email OTP State (Step 5)
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
  const [idTypeModalVisible, setIdTypeModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState<'terms' | 'privacy'>('privacy');
  const [uploadingDoc, setUploadingDoc] = useState<'idPhotoUrl' | 'residencyCertUrl' | null>(null);

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

  const handlePickDocument = async (
    field: 'idPhotoUrl' | 'residencyCertUrl',
    fromCamera: boolean
  ) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setDialogConfig({
          visible: true,
          type: 'warning',
          title: 'Permission Required',
          message: `Please allow ${fromCamera ? 'camera' : 'photo library'} access in device settings to attach verification documents.`,
          confirmText: 'OK',
          onConfirm: () => setDialogConfig(null),
        });
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        setUploadingDoc(field);
        try {
          const cloudUrl = await uploadImageToCloudinary(localUri, 'smartmati_verifications');
          updateField(field, cloudUrl);
        } catch (err: any) {
          // Local fallback
          updateField(field, localUri);
        } finally {
          setUploadingDoc(null);
        }
      }
    } catch (err: any) {
      setUploadingDoc(null);
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Upload Error',
        message: err.message || 'Could not attach document.',
        confirmText: 'OK',
        onConfirm: () => setDialogConfig(null),
      });
    }
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
    const pass = formData.password;

    if (!pass) {
      errs.password = 'Password is required';
    } else if (pass.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(pass)) {
      errs.password = 'Password must include at least one uppercase letter (A-Z)';
    } else if (!/[a-z]/.test(pass)) {
      errs.password = 'Password must include at least one lowercase letter (a-z)';
    } else if (!/[0-9]/.test(pass)) {
      errs.password = 'Password must include at least one number (0-9)';
    } else if (!/[^A-Za-z0-9]/.test(pass)) {
      errs.password = 'Password must include at least one special character (!@#$%^&*)';
    }

    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      errs.agreeToTerms = 'You must agree to the Terms of Service';
    }
    if (!formData.agreeToDataPrivacy) {
      errs.agreeToDataPrivacy = 'You must agree to the Data Privacy Notice (RA 10173)';
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
      animateToStep(2);
    } else if (step === 2 && validateStep2()) {
      animateToStep(3);
    } else if (step === 3 && validateStep3()) {
      animateToStep(4);
      refreshCaptcha();
    }
  };

  const handleBack = () => {
    if (step > 1 && step <= 4) {
      animateToStep(step - 1);
    } else if (step === 5) {
      animateToStep(4);
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
      } else {
        // ALWAYS prompt 6-digit Email OTP Verification first to prevent fake/scam accounts
        animateToStep(5);
        setResendCooldown(60);
        setOtpCode('');
        setOtpError('');
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 350);
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
        // Confirmed email! Do not auto-login or redirect straight to home screen.
        setDialogConfig({
          visible: true,
          type: 'success',
          title: 'Email Verified! ✨',
          subtitle: 'Registration Submitted to City Hall',
          message:
            'Your email address has been confirmed! Your resident account registration is now queued for administrative review by the City Government of Mati. You can now log in with your credentials.',
          confirmText: 'Proceed to Sign In',
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: keyboardVisible
                ? (step === 4 ? keyboardHeight + 260 : keyboardHeight + 80)
                : 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: 40, animated: true });
                    }}
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
                onFocus={() => {
                  scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                }}
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
                onFocus={() => {
                  scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                }}
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
                onFocus={() => {
                  scrollViewRef.current?.scrollTo({ y: 160, animated: true });
                }}
                error={errors.purok}
                helperText="Specific purok or neighborhood in your barangay"
                required
              />
            </View>
          )}

          {/* Step 3: Security, Password Requirements & Data Privacy */}
          {step === 3 && (
            <Animated.View
              style={[
                styles.stepCard,
                { opacity: stepFadeAnim, transform: [{ translateY: stepSlideAnim }] },
              ]}
            >
              <View style={styles.stepCardHeader}>
                <Ionicons name="lock-closed" size={20} color={THEME.colors.primary} />
                <Text style={styles.stepCardTitle}>Account Security & Data Privacy</Text>
              </View>

              <CustomInput
                label="Password"
                placeholder="Create a strong password (min 8 chars)"
                leadingIcon="lock-closed-outline"
                isPassword
                value={formData.password}
                onChangeText={(t) => updateField('password', t)}
                onFocus={() => {
                  scrollViewRef.current?.scrollTo({ y: 80, animated: true });
                }}
                error={errors.password}
                required
              />

              {/* Dynamic Live Password Conditions Checklist */}
              <View style={styles.passwordConditionsBox}>
                <Text style={styles.passwordConditionsTitle}>Password Requirements:</Text>
                <View style={styles.passwordConditionsGrid}>
                  {[
                    { label: 'At least 8 characters', met: formData.password.length >= 8 },
                    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(formData.password) },
                    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(formData.password) },
                    { label: 'One number (0-9)', met: /[0-9]/.test(formData.password) },
                    { label: 'One special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(formData.password) },
                  ].map((item, idx) => (
                    <View key={idx} style={styles.passwordConditionRow}>
                      <Ionicons
                        name={item.met ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={item.met ? THEME.colors.success : THEME.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.passwordConditionText,
                          item.met && styles.passwordConditionTextMet,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <CustomInput
                label="Confirm Password"
                placeholder="Re-enter your password"
                leadingIcon="lock-closed-outline"
                isPassword
                value={formData.confirmPassword}
                onChangeText={(t) => updateField('confirmPassword', t)}
                onFocus={() => {
                  scrollViewRef.current?.scrollTo({ y: 260, animated: true });
                }}
                error={errors.confirmPassword}
                required
              />

              {/* Data Privacy Notice Card (RA 10173) */}
              <View style={styles.dataPrivacyCard}>
                <View style={styles.dataPrivacyHeader}>
                  <Ionicons name="shield-checkmark" size={17} color={THEME.colors.primary} />
                  <Text style={styles.dataPrivacyTitle}>Data Privacy Agreement (RA 10173)</Text>
                </View>
                <Text style={styles.dataPrivacyText}>
                  The City Government of Mati collects and processes your personal information exclusively for resident identity verification, emergency response, and municipal service dispatch. In compliance with the Philippine Data Privacy Act of 2012, your data is securely stored and never disclosed to unauthorized parties.
                </Text>
                <TouchableOpacity
                  style={styles.dataPrivacyLinkRow}
                  onPress={() => {
                    setTermsModalTab('privacy');
                    setTermsModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={13} color={THEME.colors.primary} />
                  <Text style={styles.dataPrivacyLinkText}>
                    Read Official Data Privacy Notice & Citizen Rights
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Checkbox 1: Terms of Service */}
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
                    <Ionicons name="checkmark" size={15} color={THEME.colors.white} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxLabel}>
                    I agree to the{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => {
                        setTermsModalTab('terms');
                        setTermsModalVisible(true);
                      }}
                    >
                      Terms of Service
                    </Text>{' '}
                    of Mati City Urban Services.
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.agreeToTerms && (
                <Text style={styles.termsErrorText}>{errors.agreeToTerms}</Text>
              )}

              {/* Checkbox 2: Data Privacy Act Consent */}
              <TouchableOpacity
                style={[styles.checkboxContainer, { marginTop: 4 }]}
                activeOpacity={0.8}
                onPress={() => updateField('agreeToDataPrivacy', !formData.agreeToDataPrivacy)}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    formData.agreeToDataPrivacy && styles.checkboxBoxChecked,
                    errors.agreeToDataPrivacy ? styles.checkboxBoxError : null,
                  ]}
                >
                  {formData.agreeToDataPrivacy && (
                    <Ionicons name="checkmark" size={15} color={THEME.colors.white} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxLabel}>
                    I acknowledge and agree to the{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => {
                        setTermsModalTab('privacy');
                        setTermsModalVisible(true);
                      }}
                    >
                      Data Privacy Agreement
                    </Text>{' '}
                    in accordance with RA 10173.
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.agreeToDataPrivacy && (
                <Text style={styles.termsErrorText}>{errors.agreeToDataPrivacy}</Text>
              )}
            </Animated.View>
          )}

          {/* Step 4: Resident Verification & Review */}
          {step === 4 && (
            <Animated.View
              style={[
                styles.stepCard,
                { opacity: stepFadeAnim, transform: [{ translateY: stepSlideAnim }] },
              ]}
              onLayout={(e) => {
                setStep4CardY(e.nativeEvent.layout.y);
              }}
            >
              <View style={styles.stepCardHeader}>
                <Ionicons name="shield-checkmark" size={20} color={THEME.colors.primary} />
                <Text style={styles.stepCardTitle}>Review & Resident Verification</Text>
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

              {/* Resident Verification Document Attachments */}
              <View style={styles.docsSection}>
                <View style={styles.docsSectionHeader}>
                  <Ionicons name="id-card-outline" size={18} color={THEME.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docsSectionTitle}>Resident Credentials (For City Hall Admin)</Text>
                    <Text style={styles.docsSectionSubtitle}>
                      Official verification grants authorization to submit community incident reports.
                    </Text>
                  </View>
                </View>

                {/* ID Type Selector */}
                <CustomInput
                  label="Select Government ID Type"
                  placeholder="Choose valid ID type"
                  leadingIcon="card-outline"
                  value={formData.idType || VALID_ID_TYPES[0]}
                  onPress={() => setIdTypeModalVisible(true)}
                  helperText="Select the ID you will present to City Hall"
                />

                {/* Document 1: Government ID Photo */}
                <View style={styles.docUploadBox}>
                  <View style={styles.docUploadHeader}>
                    <Text style={styles.docUploadTitle}>1. Valid Government-Issued ID Photo</Text>
                    {Boolean(formData.idPhotoUrl) && (
                      <View style={styles.attachedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={THEME.colors.success} />
                        <Text style={styles.attachedBadgeText}>Attached</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.docUploadDesc}>
                    Photo of your PhilID, Driver's License, UMID, Passport, or Voter's ID.
                  </Text>

                  {formData.idPhotoUrl ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: formData.idPhotoUrl }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.changeDocBtn}
                        onPress={() => handlePickDocument('idPhotoUrl', false)}
                      >
                        <Ionicons name="camera-reverse" size={14} color={THEME.colors.primary} />
                        <Text style={styles.changeDocText}>Change Photo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.docActionBtnsRow}>
                      <TouchableOpacity
                        style={styles.docBtn}
                        onPress={() => handlePickDocument('idPhotoUrl', true)}
                        disabled={uploadingDoc === 'idPhotoUrl'}
                      >
                        {uploadingDoc === 'idPhotoUrl' ? (
                          <ActivityIndicator size="small" color={THEME.colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="camera" size={15} color={THEME.colors.primary} />
                            <Text style={styles.docBtnText}>Take Photo</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.docBtn, styles.docBtnSecondary]}
                        onPress={() => handlePickDocument('idPhotoUrl', false)}
                        disabled={uploadingDoc === 'idPhotoUrl'}
                      >
                        <Ionicons name="images-outline" size={15} color="#475569" />
                        <Text style={styles.docBtnSecondaryText}>Choose from Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Document 2: Barangay Certificate */}
                <View style={[styles.docUploadBox, { marginTop: 10 }]}>
                  <View style={styles.docUploadHeader}>
                    <Text style={styles.docUploadTitle}>2. Barangay Residency Certificate</Text>
                    {Boolean(formData.residencyCertUrl) && (
                      <View style={styles.attachedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={THEME.colors.success} />
                        <Text style={styles.attachedBadgeText}>Attached</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.docUploadDesc}>
                    Certificate of Residency from your Barangay Captain/Secretary.
                  </Text>

                  {formData.residencyCertUrl ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: formData.residencyCertUrl }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.changeDocBtn}
                        onPress={() => handlePickDocument('residencyCertUrl', false)}
                      >
                        <Ionicons name="camera-reverse" size={14} color={THEME.colors.primary} />
                        <Text style={styles.changeDocText}>Change Certificate</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.docActionBtnsRow}>
                      <TouchableOpacity
                        style={styles.docBtn}
                        onPress={() => handlePickDocument('residencyCertUrl', true)}
                        disabled={uploadingDoc === 'residencyCertUrl'}
                      >
                        {uploadingDoc === 'residencyCertUrl' ? (
                          <ActivityIndicator size="small" color={THEME.colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="camera" size={15} color={THEME.colors.primary} />
                            <Text style={styles.docBtnText}>Take Photo</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.docBtn, styles.docBtnSecondary]}
                        onPress={() => handlePickDocument('residencyCertUrl', false)}
                        disabled={uploadingDoc === 'residencyCertUrl'}
                      >
                        <Ionicons name="images-outline" size={15} color="#475569" />
                        <Text style={styles.docBtnSecondaryText}>Choose from Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Security CAPTCHA Challenge */}
              <View
                onLayout={(e) => {
                  setCaptchaRelY(e.nativeEvent.layout.y);
                }}
              >
                <CaptchaChallenge
                  captchaCode={captchaCode}
                  value={userCaptchaInput}
                  onChangeText={(t) => {
                    setUserCaptchaInput(t);
                    if (captchaError) setCaptchaError('');
                  }}
                  onFocus={() => {
                    setCaptchaFocused(true);
                    scrollToCaptcha(true);
                  }}
                  onBlur={() => {
                    setCaptchaFocused(false);
                  }}
                  error={captchaError}
                  onRefresh={refreshCaptcha}
                />
              </View>
            </Animated.View>
          )}

          {/* Step 5: Email 6-Digit OTP Verification */}
          {step === 5 && (
            <Animated.View
              style={[
                styles.otpCard,
                { opacity: stepFadeAnim, transform: [{ translateY: stepSlideAnim }] },
              ]}
            >
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
                onFocus={() => {
                  scrollViewRef.current?.scrollTo({ y: 100, animated: true });
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
                onPress={() => animateToStep(1)}
              >
                <Ionicons name="pencil-outline" size={14} color={THEME.colors.textSecondary} />
                <Text style={styles.changeEmailText}>Change email address</Text>
              </TouchableOpacity>
            </Animated.View>
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
                <>
                  {/* Clarification Box for 'Submit Registration for Verification' */}
                  <View style={styles.submitExplanationBox}>
                    <Ionicons name="shield-checkmark" size={16} color={THEME.colors.primary} />
                    <Text style={styles.submitExplanationText}>
                      Submitting your registration creates your account credentials and forwards your resident profile to Mati City Hall administrators for official verification. Once verified, you will be authorized to submit community incident reports.
                    </Text>
                  </View>

                  {/* Clarified Action Button */}
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
                        <Ionicons name="shield-checkmark" size={18} color={THEME.colors.white} />
                        <Text style={styles.primaryButtonText}>
                          Submit Registration for Verification
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
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

        <DropdownModal
          visible={idTypeModalVisible}
          title="Select Government ID Type"
          options={VALID_ID_TYPES}
          selectedValue={formData.idType || VALID_ID_TYPES[0]}
          onSelect={(val) => {
            updateField('idType', val);
            setIdTypeModalVisible(false);
          }}
          onClose={() => setIdTypeModalVisible(false)}
          searchable={false}
        />

        <TermsModal
          visible={termsModalVisible}
          initialTab={termsModalTab}
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
    paddingBottom: 160,
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

  // Password Requirements Styles
  passwordConditionsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordConditionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  passwordConditionsGrid: {
    gap: 4,
  },
  passwordConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passwordConditionText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  passwordConditionTextMet: {
    color: THEME.colors.success,
    fontWeight: '700',
  },

  // Data Privacy Notice Card Styles
  dataPrivacyCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dataPrivacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  dataPrivacyTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  dataPrivacyText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  dataPrivacyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  dataPrivacyLinkText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  // Document Verification Styles
  docsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  docsSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  docsSectionSubtitle: {
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  docUploadBox: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docUploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  docUploadTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  attachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  attachedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  docUploadDesc: {
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  docActionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 8,
    backgroundColor: THEME.colors.primarySoft,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 6,
  },
  docBtnSecondary: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  docBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  docBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 6,
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  changeDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeDocText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },

  // Submit Explanation Note
  submitExplanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
    marginBottom: 4,
  },
  submitExplanationText: {
    flex: 1,
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 15,
  },
});
