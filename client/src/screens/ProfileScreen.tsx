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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { THEME, VALID_ID_TYPES } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { DropdownModal } from '../components/DropdownModal';
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

  // Verification Documents Modal State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [idType, setIdType] = useState(user?.idType || VALID_ID_TYPES[0]);
  const [idTypeDropdownOpen, setIdTypeDropdownOpen] = useState(false);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(user?.idPhotoUrl || null);
  const [residencyCertUri, setResidencyCertUri] = useState<string | null>(user?.residencyCertUrl || null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

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

  const handlePickDocument = async (target: 'id' | 'residency', source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Required', 'Camera permission is required to capture your document.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          if (target === 'id') setIdPhotoUri(result.assets[0].uri);
          else setResidencyCertUri(result.assets[0].uri);
        }
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Required', 'Photo library permission is required to select your document.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          if (target === 'id') setIdPhotoUri(result.assets[0].uri);
          else setResidencyCertUri(result.assets[0].uri);
        }
      }
    } catch (err: any) {
      console.warn('Doc picker error:', err);
    }
  };

  const handleSubmitDocuments = async () => {
    if (!idPhotoUri) {
      Alert.alert('Document Required', 'Please attach a photo of your Valid Government ID.');
      return;
    }
    if (!residencyCertUri) {
      Alert.alert('Document Required', 'Please attach a photo of your Barangay Certificate of Residency.');
      return;
    }

    setUploadingDocs(true);
    try {
      let finalIdPhotoUrl = idPhotoUri;
      if (idPhotoUri.startsWith('file:') || idPhotoUri.startsWith('content:') || idPhotoUri.startsWith('ph:')) {
        finalIdPhotoUrl = await uploadImageToCloudinary(idPhotoUri, 'smartmati_docs');
      }

      let finalResidencyCertUrl = residencyCertUri;
      if (residencyCertUri.startsWith('file:') || residencyCertUri.startsWith('content:') || residencyCertUri.startsWith('ph:')) {
        finalResidencyCertUrl = await uploadImageToCloudinary(residencyCertUri, 'smartmati_docs');
      }

      const res = await requestVerification({
        idType,
        idPhotoUrl: finalIdPhotoUrl,
        residencyCertUrl: finalResidencyCertUrl,
      });

      if (res.error) throw new Error(res.error);

      setUploadModalVisible(false);
      setDialogConfig({
        visible: true,
        type: 'success',
        icon: 'checkmark-circle',
        title: 'Documents Submitted ✨',
        subtitle: 'Under City Hall Admin Review',
        message:
          'Your Government ID and Barangay Certificate have been uploaded to Mati City Hall. Once reviewed and verified, civic report submissions and full services will be unlocked.',
        details: [
          { label: 'ID Type', value: idType },
          { label: 'Barangay Certificate', value: 'Attached' },
          { label: 'Turnaround', value: '1 to 2 Business Days' },
          { label: 'Status', value: 'Pending Review' },
        ],
        confirmText: 'Got It',
        onConfirm: () => setDialogConfig(null),
      });
    } catch (err: any) {
      console.error('Document submission error:', err);
      Alert.alert('Submission Error', err.message || 'Could not upload verification documents.');
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleRequestVerification = () => {
    setUploadModalVisible(true);
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

        {/* Verification Credentials Card */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={styles.cardHeaderTitle}>Verification Credentials</Text>
            <View
              style={[
                styles.statusBadgeSmall,
                isApproved
                  ? styles.statusBadgeApproved
                  : isPending
                  ? styles.statusBadgePending
                  : styles.statusBadgeUnverified,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeSmallText,
                  isApproved
                    ? { color: '#059669' }
                    : isPending
                    ? { color: '#D97706' }
                    : { color: '#DC2626' },
                ]}
              >
                {isApproved ? 'Verified' : isPending ? 'Pending Review' : 'Not Submitted'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="card-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Government ID Type</Text>
              <Text style={styles.infoValue}>{user?.idType || 'PhilID / Driver\'s License / UMID'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconTag}>
              <Ionicons name="document-text-outline" size={16} color={THEME.colors.primary} />
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Barangay Certificate</Text>
              <Text style={styles.infoValue}>
                {user?.residencyCertUrl ? 'Certificate Attached' : 'Certificate of Residency Required'}
              </Text>
            </View>
          </View>

          {!isApproved && (
            <TouchableOpacity
              style={styles.reUploadBtn}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.reUploadBtnText}>
                {user?.idPhotoUrl ? 'Update Verification Documents' : 'Upload Verification Documents'}
              </Text>
            </TouchableOpacity>
          )}
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

      {/* VERIFICATION DOCUMENTS UPLOAD MODAL */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.docModalHeader}>
            <TouchableOpacity
              onPress={() => setUploadModalVisible(false)}
              style={styles.docModalCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.docModalTitle}>Resident Verification</Text>
              <Text style={styles.docModalSubtitle}>City Government of Mati</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.docModalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Guidance Banner */}
            <View style={styles.docNoticeBox}>
              <Ionicons name="shield-checkmark" size={20} color={THEME.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docNoticeTitle}>Official Verification Documents</Text>
                <Text style={styles.docNoticeDesc}>
                  Please provide a valid Government ID and your Barangay Certificate of Residency. These documents confirm genuine citizen identity to prevent fake accounts and maintain civic trust under RA 10173.
                </Text>
              </View>
            </View>

            {/* 1. ID Type Selection */}
            <View style={styles.docCard}>
              <Text style={styles.docLabel}>1. SELECT GOVERNMENT ID TYPE *</Text>
              <TouchableOpacity
                style={styles.idDropdownTrigger}
                onPress={() => setIdTypeDropdownOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="card-outline" size={18} color={THEME.colors.primary} />
                <Text style={styles.idDropdownText}>{idType}</Text>
                <Ionicons name="chevron-down" size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>

              <DropdownModal
                visible={idTypeDropdownOpen}
                title="Select Valid Government ID"
                options={VALID_ID_TYPES}
                selectedValue={idType}
                onSelect={(val) => {
                  setIdType(val);
                  setIdTypeDropdownOpen(false);
                }}
                onClose={() => setIdTypeDropdownOpen(false)}
                searchable={false}
              />
            </View>

            {/* 2. Government ID Photo Upload */}
            <View style={styles.docCard}>
              <Text style={styles.docLabel}>2. VALID GOVERNMENT ID PHOTO *</Text>
              <Text style={styles.docSubLabel}>Clear front photo showing full name, photo, and signature</Text>

              {idPhotoUri ? (
                <View style={styles.docPreviewCard}>
                  <Image source={{ uri: idPhotoUri }} style={styles.docPreviewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeDocBtn}
                    onPress={() => setIdPhotoUri(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                  <View style={styles.docAttachedTag}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.docAttachedText}>ID Photo Attached</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.docActionRow}>
                  <TouchableOpacity
                    style={styles.docActionBtn}
                    onPress={() => handlePickDocument('id', 'camera')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={20} color={THEME.colors.primary} />
                    <Text style={styles.docActionBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.docActionBtn}
                    onPress={() => handlePickDocument('id', 'gallery')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images" size={20} color={THEME.colors.primary} />
                    <Text style={styles.docActionBtnText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 3. Barangay Residency Certificate Upload */}
            <View style={styles.docCard}>
              <Text style={styles.docLabel}>3. BARANGAY RESIDENCY CERTIFICATE *</Text>
              <Text style={styles.docSubLabel}>Official certificate issued by your barangay hall</Text>

              {residencyCertUri ? (
                <View style={styles.docPreviewCard}>
                  <Image source={{ uri: residencyCertUri }} style={styles.docPreviewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeDocBtn}
                    onPress={() => setResidencyCertUri(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                  <View style={styles.docAttachedTag}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.docAttachedText}>Barangay Certificate Attached</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.docActionRow}>
                  <TouchableOpacity
                    style={styles.docActionBtn}
                    onPress={() => handlePickDocument('residency', 'camera')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={20} color={THEME.colors.primary} />
                    <Text style={styles.docActionBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.docActionBtn}
                    onPress={() => handlePickDocument('residency', 'gallery')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images" size={20} color={THEME.colors.primary} />
                    <Text style={styles.docActionBtnText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitDocBtn,
                (!idPhotoUri || !residencyCertUri || uploadingDocs) && styles.submitDocBtnDisabled,
              ]}
              onPress={handleSubmitDocuments}
              disabled={!idPhotoUri || !residencyCertUri || uploadingDocs}
              activeOpacity={0.85}
            >
              {uploadingDocs ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitDocBtnText}>Uploading Documents...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.submitDocBtnText}>Submit Documents for Verification</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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

  // Document Verification Credentials & Modal Styles
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusBadgeUnverified: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  reUploadBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },

  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  docModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  docModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  docModalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  docModalContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 14,
  },
  docNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 12,
  },
  docNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E40AF',
  },
  docNoticeDesc: {
    fontSize: 11,
    color: '#1E3A8A',
    marginTop: 2,
    lineHeight: 15,
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  docLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  docSubLabel: {
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  idDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  idDropdownText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
    marginLeft: 8,
  },
  docActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  docActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
  },
  docActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  docPreviewCard: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  docPreviewImage: {
    width: '100%',
    height: 160,
  },
  removeDocBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  docAttachedTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  docAttachedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  submitDocBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitDocBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitDocBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
