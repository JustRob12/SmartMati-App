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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import {
  pickAvatarFromGallery,
  takeAvatarWithCamera,
  uploadImageToCloudinary,
} from '../lib/cloudinary';
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
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<ConfirmationModalProps | null>(null);

  const verificationStatus = user?.verificationStatus || 'unverified';
  const isApproved = verificationStatus === 'approved';
  const isPending = verificationStatus === 'pending';

  const processAvatarUpload = async (imageUri: string) => {
    setPhotoOptionsVisible(false);
    setUploadingAvatar(true);
    try {
      const hostedUrl = await uploadImageToCloudinary(imageUri, 'smartmati_avatars');
      const res = await updateAvatar(hostedUrl);

      if (res?.error) {
        throw new Error(res.error);
      }

      setDialogConfig({
        visible: true,
        type: 'success',
        title: 'Profile Photo Updated! 📸',
        message: 'Your new resident avatar has been uploaded to Cloudinary and saved across your account.',
        confirmText: 'Awesome',
        onConfirm: () => setDialogConfig(null),
      });
    } catch (err: any) {
      console.error('Avatar upload failure:', err);
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload profile picture. Please check your internet connection and try again.',
        confirmText: 'Dismiss',
        onConfirm: () => setDialogConfig(null),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChooseFromGallery = async () => {
    setPhotoOptionsVisible(false);
    try {
      const uri = await pickAvatarFromGallery();
      if (uri) {
        await processAvatarUpload(uri);
      }
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Gallery Access',
        message: err.message || 'Could not select photo from gallery.',
        confirmText: 'OK',
        onConfirm: () => setDialogConfig(null),
      });
    }
  };

  const handleTakePhotoWithCamera = async () => {
    setPhotoOptionsVisible(false);
    try {
      const uri = await takeAvatarWithCamera();
      if (uri) {
        await processAvatarUpload(uri);
      }
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        type: 'error',
        title: 'Camera Access',
        message: err.message || 'Could not open camera.',
        confirmText: 'OK',
        onConfirm: () => setDialogConfig(null),
      });
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
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setPhotoOptionsVisible(true)}
            activeOpacity={0.85}
            disabled={uploadingAvatar}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
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
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color={THEME.colors.white} />
            </View>
          </TouchableOpacity>

          {/* Change Photo Button */}
          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={() => setPhotoOptionsVisible(true)}
            disabled={uploadingAvatar}
            activeOpacity={0.75}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={THEME.colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={15} color={THEME.colors.primary} />
                <Text style={styles.changePhotoBtnText}>
                  {user?.avatarUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}
                </Text>
              </>
            )}
          </TouchableOpacity>

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
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="mail-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="location-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>City / Municipality</Text>
              <Text style={styles.infoValue}>{user?.city || 'Mati City'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="navigate-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Barangay</Text>
              <Text style={styles.infoValue}>
                {user?.barangay ? `Brgy. ${user.barangay}` : 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.iconTag}>
              <Ionicons name="home-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Purok / Street / Sitio</Text>
              <Text style={styles.infoValue}>{user?.purok || 'Not specified'}</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={THEME.colors.error} />
          <Text style={styles.logoutButtonText}>Log Out Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PHOTO PICKER OPTIONS MODAL */}
      <Modal
        visible={photoOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhotoOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPhotoOptionsVisible(false)}
        >
          <View style={styles.photoOptionsSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Profile Photo</Text>
            <Text style={styles.modalSubtitle}>Choose an option to update your picture</Text>

            <TouchableOpacity
              style={styles.optionBtn}
              onPress={handleTakePhotoWithCamera}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconCircle}>
                <Ionicons name="camera" size={20} color={THEME.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionBtnTitle}>Take Photo</Text>
                <Text style={styles.optionBtnDesc}>Use camera to take a new portrait</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionBtn}
              onPress={handleChooseFromGallery}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconCircle}>
                <Ionicons name="images" size={20} color={THEME.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionBtnTitle}>Choose from Gallery</Text>
                <Text style={styles.optionBtnDesc}>Select an existing photo from library</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelOptionBtn}
              onPress={() => setPhotoOptionsVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelOptionBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation & Alert Modals */}
      {dialogConfig && (
        <ConfirmationModal
          {...dialogConfig}
          onConfirm={() => {
            if (dialogConfig.onConfirm) dialogConfig.onConfirm();
          }}
          onCancel={() => {
            if (dialogConfig.onCancel) dialogConfig.onCancel();
            else setDialogConfig(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
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
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
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
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: 8,
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: THEME.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: THEME.colors.white,
    elevation: 3,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  changePhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  userName: {
    fontSize: 19,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusPillApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusPillUnverified: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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

  // PHOTO OPTIONS MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  photoOptionsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionBtnDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cancelOptionBtn: {
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOptionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
});
