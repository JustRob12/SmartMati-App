import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { pickAndCropAvatar, uploadImageToCloudinary } from '../lib/cloudinary';
import { ConfirmationModal, ConfirmationModalProps } from '../components/ConfirmationModal';

interface ProfileScreenProps {
  onClose: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onClose }) => {
  const {
    user,
    signOut,
    requestVerification,
    refreshProfile,
    updateAvatar,
  } = useAuth();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<ConfirmationModalProps | null>(null);

  const verificationStatus = user?.verificationStatus || 'unverified';
  const isApproved = verificationStatus === 'approved';
  const isPending = verificationStatus === 'pending';

  const handlePickAndUploadAvatar = async () => {
    try {
      const croppedUri = await pickAndCropAvatar();
      if (!croppedUri) return;

      setUploadingAvatar(true);
      const hostedUrl = await uploadImageToCloudinary(croppedUri, 'smartmati_avatars');
      const res = await updateAvatar(hostedUrl);

      if (res?.error) {
        throw new Error(res.error);
      }

      setDialogConfig({
        visible: true,
        type: 'success',
        title: 'Profile Photo Updated! 📸',
        message: 'Your new resident avatar has been uploaded and saved across your account.',
        confirmText: 'Awesome',
        onConfirm: () => setDialogConfig(null),
      });
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload profile picture.',
        confirmText: 'Dismiss',
        onConfirm: () => setDialogConfig(null),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRequestVerification = () => {
    setDialogConfig({
      visible: true,
      type: 'confirm',
      icon: 'shield-checkmark-outline',
      title: 'Submit for Verification',
      subtitle: 'City Government of Mati',
      message:
        'Submit your resident profile to City Hall administrators for verification? Approval enables full reporting and community advisory tools.',
      confirmText: 'Confirm & Submit',
      cancelText: 'Cancel',
      details: [
        { label: 'Resident', value: user?.fullName || 'Resident' },
        { label: 'Barangay', value: user?.barangay || 'Central' },
        { label: 'Review Time', value: 'Up to 2 Business Days' },
      ],
      onCancel: () => setDialogConfig(null),
      onConfirm: async () => {
        setDialogConfig(null);
        setSubmittingVerification(true);
        try {
          const res = await requestVerification();
          if (res.error) {
            setDialogConfig({
              visible: true,
              type: 'error',
              title: 'Submission Failed',
              message: res.error,
              confirmText: 'OK',
              onConfirm: () => setDialogConfig(null),
            });
          } else {
            setDialogConfig({
              visible: true,
              type: 'success',
              title: 'Request Submitted ✨',
              subtitle: 'Under Review',
              message:
                'Your resident verification has been submitted to Mati City Hall. Review turnaround is typically 1 to 2 business days.',
              confirmText: 'Got It',
              onConfirm: () => setDialogConfig(null),
            });
          }
        } catch (e: any) {
          setDialogConfig({
            visible: true,
            type: 'error',
            title: 'Error',
            message: e.message || 'Unable to submit verification request.',
            confirmText: 'OK',
            onConfirm: () => setDialogConfig(null),
          });
        } finally {
          setSubmittingVerification(false);
        }
      },
    });
  };

  const handleLogout = () => {
    setDialogConfig({
      visible: true,
      type: 'danger',
      icon: 'log-out-outline',
      title: 'Sign Out?',
      subtitle: 'End Resident Session',
      message: 'Are you sure you want to log out of SmartMati on this device?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onCancel: () => setDialogConfig(null),
      onConfirm: async () => {
        setDialogConfig(null);
        await signOut();
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resident Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & Hero Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={THEME.colors.primary} />
              </View>
            )}

            {/* Uploading Overlay */}
            {uploadingAvatar && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color={THEME.colors.white} />
              </View>
            )}

            {/* Camera / Edit Badge */}
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handlePickAndUploadAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={16} color={THEME.colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.fullName || 'Mati Resident'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {/* Verification Status Pill */}
          <View
            style={[
              styles.statusPill,
              isApproved
                ? styles.statusPillApproved
                : isPending
                ? styles.statusPillPending
                : styles.statusPillUnverified,
            ]}
          >
            <Ionicons
              name={
                isApproved
                  ? 'checkmark-circle'
                  : isPending
                  ? 'time'
                  : 'alert-circle'
              }
              size={14}
              color={
                isApproved ? '#059669' : isPending ? '#B45309' : '#64748B'
              }
            />
            <Text
              style={[
                styles.statusText,
                isApproved
                  ? styles.statusTextApproved
                  : isPending
                  ? styles.statusTextPending
                  : styles.statusTextUnverified,
              ]}
            >
              {isApproved
                ? 'Official Verified Resident'
                : isPending
                ? 'Verification Under Review'
                : 'Unverified Resident'}
            </Text>
          </View>
        </View>

        {/* Verification Action Banner (if not approved) */}
        {!isApproved && (
          <View style={styles.verifyBanner}>
            <View style={styles.verifyBannerLeft}>
              <Ionicons name="shield-checkmark" size={24} color={THEME.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyBannerTitle}>
                  {isPending ? 'Verification in Progress' : 'Verify Your Resident Profile'}
                </Text>
                <Text style={styles.verifyBannerDesc}>
                  {isPending
                    ? 'City Hall administrators are reviewing your submission.'
                    : 'Submit your profile for official Mati City verification.'}
                </Text>
              </View>
            </View>

            {!isPending && (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleRequestVerification}
                disabled={submittingVerification}
                activeOpacity={0.85}
              >
                {submittingVerification ? (
                  <ActivityIndicator size="small" color={THEME.colors.white} />
                ) : (
                  <Text style={styles.verifyBtnText}>Submit to City Hall</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Profile Info Details Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>Personal & Address Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="person-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user?.fullName || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="people-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{user?.gender || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="calendar-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>{user?.birthdate || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="call-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="location-outline" size={16} color={THEME.colors.accent} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Resident Barangay</Text>
              <Text style={styles.infoValue}>Brgy. {user?.barangay || 'Central'}, Mati City</Text>
            </View>
          </View>

          {user?.purok ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.iconTag}>
                <Ionicons name="home-outline" size={16} color={THEME.colors.accent} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Purok / Street</Text>
                <Text style={styles.infoValue}>{user.purok}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={THEME.colors.error} />
          <Text style={styles.logoutButtonText}>Log Out Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Dialog */}
      {dialogConfig && <ConfirmationModal {...dialogConfig} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  avatarCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: THEME.colors.primarySoft,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    marginTop: 12,
  },
  statusPillApproved: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillPending: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillUnverified: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextApproved: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextUnverified: {
    color: '#475569',
  },
  verifyBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  verifyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  verifyBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  verifyBannerDesc: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 16,
  },
  verifyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  iconTag: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    height: 48,
    gap: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: THEME.colors.error,
    fontSize: 14,
    fontWeight: '800',
  },
});
