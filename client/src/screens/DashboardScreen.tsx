import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { CityLogo } from '../components/CityLogo';

export const DashboardScreen: React.FC = () => {
  const {
    user,
    signOut,
    requestVerification,
    refreshProfile,
    isConfigured,
    setDemoVerificationStatus,
  } = useAuth();

  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const verificationStatus = user?.verificationStatus || 'unverified';
  const isApproved = verificationStatus === 'approved';
  const isPending = verificationStatus === 'pending';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of SmartMati?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleRequestVerification = async () => {
    Alert.alert(
      'Submit for Resident Verification',
      'Would you like to submit your resident profile to the City Government of Mati for review? Maximum approval time is up to 2 business days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Submit',
          onPress: async () => {
            setSubmittingVerification(true);
            try {
              const res = await requestVerification();
              if (res.error) {
                Alert.alert('Submission Failed', res.error);
              } else {
                Alert.alert(
                  'Verification Submitted',
                  'Your resident verification request has been received. Please allow up to 2 business days for review and approval.',
                  [{ text: 'OK' }]
                );
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Unable to submit verification');
            } finally {
              setSubmittingVerification(false);
            }
          },
        },
      ]
    );
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const updatedProfile = await refreshProfile();
      const currentStat = updatedProfile?.verificationStatus || 'unverified';

      if (currentStat === 'approved') {
        Alert.alert(
          'Account Approved! 🎉',
          'Your resident verification has been approved by the City Government of Mati. You now have full access to community reports and can submit new issue reports.'
        );
      } else if (currentStat === 'pending') {
        Alert.alert(
          'Verification Under Review ⏳',
          'Your resident account is currently being reviewed by City Hall administrators. The maximum waiting time is up to 2 business days. Thank you for your patience.'
        );
      } else {
        Alert.alert(
          'Account Unverified ⚠️',
          'Please tap "Submit Account for Verification" to begin the review process.'
        );
      }
    } catch (e: any) {
      Alert.alert('Notice', e.message || 'Could not fetch profile updates.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewReport = () => {
    if (!isApproved) {
      Alert.alert(
        'Verification Required',
        'Your account must be approved by the City Government of Mati before you can submit community issue reports.'
      );
      return;
    }

    Alert.alert(
      'New Report',
      'Reporting module is active. You can now capture photos, pinpoint GPS coordinates in Mati City, and track resolution status.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header App Bar */}
        <LinearGradient
          colors={[THEME.colors.primaryDark, THEME.colors.primary]}
          style={styles.headerBanner}
        >
          <View style={styles.topRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.appTitle}>
                Smart<Text style={styles.appTitleAccent}>Mati</Text>
              </Text>
              <Text style={styles.appTagline}>City Urban Services Portal</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutIconButton}
              onPress={handleLogout}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-out-outline" size={22} color={THEME.colors.white} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <View style={styles.residentCard}>
            <View style={styles.residentTop}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={24} color={THEME.colors.primary} />
              </View>
              <View style={styles.residentInfo}>
                {/* Small Status Badge on Top of Name */}
                <View style={styles.badgeTopRow}>
                  {isApproved ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={10} color="#059669" />
                      <Text style={styles.verifiedText}>Approved Resident</Text>
                    </View>
                  ) : isPending ? (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time" size={10} color="#B45309" />
                      <Text style={styles.pendingText}>Under Review</Text>
                    </View>
                  ) : (
                    <View style={styles.unverifiedBadge}>
                      <Ionicons name="alert-circle" size={10} color="#64748B" />
                      <Text style={styles.unverifiedText}>Unverified</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.residentName} numberOfLines={1}>
                  {user?.fullName || 'Mati Resident'}
                </Text>
                <Text style={styles.residentEmail}>{user?.email}</Text>
                {user?.phone ? (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call" size={11} color={THEME.colors.textMuted} />
                    <Text style={styles.residentPhone}>{user.phone}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.locationDivider} />

            <View style={styles.residentBottom}>
              <View style={styles.locationItem}>
                <Ionicons name="location-sharp" size={16} color={THEME.colors.accent} />
                <Text style={styles.locationText}>
                  {user?.purok ? `${user.purok}, ` : ''}Brgy. {user?.barangay || 'Central'}, Mati City
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.bodyContent}>
          {/* ========================================================================= */}
          {/* STATE 1: UNVERIFIED (Action Required to Post Reports) */}
          {/* ========================================================================= */}
          {verificationStatus === 'unverified' && (
            <View style={styles.verificationActionCard}>
              <View style={styles.verifyCardHeader}>
                <View style={styles.verifyIconBadge}>
                  <Ionicons name="shield-outline" size={26} color={THEME.colors.primary} />
                </View>
                <View style={styles.verifyHeaderTextCol}>
                  <Text style={styles.verifyTitle}>Verify First Before You Post</Text>
                  <Text style={styles.verifyBadgeLabel}>LGU Resident Verification</Text>
                </View>
              </View>

              <Text style={styles.verifyDescription}>
                Please verify your resident account before posting community reports. Verification ensures genuine civic feedback and helps City Hall prioritize road hazards, lighting issues, and sanitation repairs in your barangay.
              </Text>

              {/* 2-Day Waiting Notice */}
              <View style={styles.waitingNoticeBox}>
                <Ionicons name="information-circle" size={18} color={THEME.colors.accentDark} />
                <Text style={styles.waitingNoticeText}>
                  <Text style={styles.boldNotice}>Note:</Text> The maximum waiting time for account approval is <Text style={styles.boldNotice}>up to 2 business days</Text>.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.verifyButton, submittingVerification && styles.buttonDisabled]}
                onPress={handleRequestVerification}
                disabled={submittingVerification}
                activeOpacity={0.85}
              >
                {submittingVerification ? (
                  <ActivityIndicator color={THEME.colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color={THEME.colors.white} />
                    <Text style={styles.verifyButtonText}>Submit Account for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STATE 2: PENDING REVIEW (Under Review by Admin/LGU) */}
          {/* ========================================================================= */}
          {isPending && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingIconCircle}>
                <Ionicons name="hourglass-outline" size={32} color={THEME.colors.accentDark} />
              </View>
              <Text style={styles.pendingTitle}>Account Verification Under Review</Text>
              <Text style={styles.pendingSubtitle}>
                Your resident verification request has been submitted to the City Government of Mati. Our LGU administrators are currently verifying your details.
              </Text>

              {/* 2-Day Maximum Waiting Time Callout */}
              <View style={styles.pendingTimeCallout}>
                <Ionicons name="time-outline" size={18} color={THEME.colors.accentDark} />
                <Text style={styles.pendingTimeText}>
                  Maximum review time is <Text style={styles.bold}>up to 2 business days</Text>.
                </Text>
              </View>

              <Text style={styles.pendingFootnote}>
                Once your account is approved, the Community Reports section and reporting tools will be unlocked automatically.
              </Text>

              {/* Refresh Status Button */}
              <TouchableOpacity
                style={styles.refreshStatusButton}
                onPress={handleRefreshStatus}
                disabled={refreshing}
                activeOpacity={0.8}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color={THEME.colors.primary} />
                    <Text style={styles.refreshStatusButtonText}>Check / Refresh Approval Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STATE 3: APPROVED (Full Access to Community Reports & Uploads) */}
          {/* ========================================================================= */}
          {isApproved && (
            <>
              {/* Section Header: Reports Overview */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Community Reports</Text>
                <TouchableOpacity onPress={handleNewReport}>
                  <Text style={styles.sectionAction}>+ New Report</Text>
                </TouchableOpacity>
              </View>

              {/* Stats Metrics Row */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Active</Text>
                  <View style={[styles.statDot, { backgroundColor: THEME.colors.accent }]} />
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>In Review</Text>
                  <View style={[styles.statDot, { backgroundColor: THEME.colors.primaryLight }]} />
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Resolved</Text>
                  <View style={[styles.statDot, { backgroundColor: THEME.colors.success }]} />
                </View>
              </View>

              {/* Empty Dashboard Card */}
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="document-text-outline" size={36} color={THEME.colors.primaryLight} />
                </View>
                <Text style={styles.emptyTitle}>No Issues Reported Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Help build a cleaner, safer, and better Mati. Report road hazards, streetlight outages, drainage issues, or garbage collection concerns directly to City Hall.
                </Text>
                <TouchableOpacity
                  style={styles.createReportButton}
                  onPress={handleNewReport}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={18} color={THEME.colors.white} />
                  <Text style={styles.createReportButtonText}>Submit First Report</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Emergency Hotlines Quick Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="call" size={16} color={THEME.colors.primary} />
              <Text style={styles.infoCardTitle}>Mati City Emergency Hotlines</Text>
            </View>
            <Text style={styles.infoCardBody}>
              • CDRRMO Disaster Rescue: <Text style={styles.bold}>0917-814-6284</Text>{'\n'}
              • Mati City Police Station: <Text style={styles.bold}>0998-598-7254</Text>{'\n'}
              • City Health Office: <Text style={styles.bold}>(087) 388-3121</Text>
            </Text>
          </View>

          {/* Quick Status Preview Switcher (For Development & Testing) */}
          <View style={styles.devSwitcherBox}>
            <Text style={styles.devSwitcherTitle}>🛠️ Preview Verification States (Testing)</Text>
            <View style={styles.devButtonRow}>
              <TouchableOpacity
                style={[
                  styles.devTabButton,
                  verificationStatus === 'unverified' && styles.devTabButtonActive,
                ]}
                onPress={() => setDemoVerificationStatus('unverified')}
              >
                <Text
                  style={[
                    styles.devTabText,
                    verificationStatus === 'unverified' && styles.devTabTextActive,
                  ]}
                >
                  1. Unverified
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.devTabButton,
                  verificationStatus === 'pending' && styles.devTabButtonActive,
                ]}
                onPress={() => setDemoVerificationStatus('pending')}
              >
                <Text
                  style={[
                    styles.devTabText,
                    verificationStatus === 'pending' && styles.devTabTextActive,
                  ]}
                >
                  2. Under Review
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.devTabButton,
                  verificationStatus === 'approved' && styles.devTabButtonActive,
                ]}
                onPress={() => setDemoVerificationStatus('approved')}
              >
                <Text
                  style={[
                    styles.devTabText,
                    verificationStatus === 'approved' && styles.devTabTextActive,
                  ]}
                >
                  3. Approved
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Logout Action */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={16} color={THEME.colors.error} />
            <Text style={styles.logoutButtonText}>Log Out Account</Text>
          </TouchableOpacity>

          {/* Footer Seal */}
          <View style={styles.footerSeal}>
            <CityLogo size="sm" showSubtitle />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.primaryDark,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: THEME.colors.background,
    paddingBottom: 28,
  },
  headerBanner: {
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {},
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.white,
    letterSpacing: -0.5,
  },
  appTitleAccent: {
    color: THEME.colors.accent,
  },
  appTagline: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 1,
  },
  logoutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  residentTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  residentInfo: {
    flex: 1,
  },
  badgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  residentName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 3,
  },
  verifiedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 3,
  },
  pendingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.2,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 3,
  },
  unverifiedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  residentEmail: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  residentPhone: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  locationDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 10,
  },
  residentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  bodyContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  // State 1: Verification Action Card
  verificationActionCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.lg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    marginBottom: 18,
  },
  verifyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  verifyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifyHeaderTextCol: {
    flex: 1,
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  verifyBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  verifyDescription: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  waitingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  waitingNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  boldNotice: {
    fontWeight: '700',
  },
  verifyButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
  },
  verifyButtonText: {
    color: THEME.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // State 2: Pending Card
  pendingCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 18,
  },
  pendingIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  pendingSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  pendingTimeCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
    marginBottom: 10,
  },
  pendingTimeText: {
    fontSize: 12,
    color: THEME.colors.primaryDark,
    fontWeight: '500',
  },
  pendingFootnote: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  refreshStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.2,
    borderColor: THEME.colors.border,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
    width: '100%',
  },
  refreshStatusButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },

  // State 3: Approved Reports
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    position: 'relative',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  statDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.md,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  createReportButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
  },
  createReportButtonText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  infoCardBody: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  bold: {
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.65,
  },

  // Testing Switcher Box
  devSwitcherBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  devSwitcherTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  devButtonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  devTabButton: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  devTabButtonActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  devTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  devTabTextActive: {
    color: THEME.colors.white,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    gap: 6,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: THEME.colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  footerSeal: {
    alignItems: 'center',
  },
});
