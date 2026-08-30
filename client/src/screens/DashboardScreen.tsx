import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Linking,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CivicReport } from '../types/report';
import { CityLogo } from '../components/CityLogo';
import { MainHeader } from '../components/MainHeader';
import { FloatingBottomNav, NavTab } from '../components/FloatingBottomNav';
import { ProfileScreen } from './ProfileScreen';
import { FeedScreen, normalizeReportStatus, parseReportImages } from './FeedScreen';
import { MapScreen } from './MapScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { CreateReportModal } from './CreateReportModal';
import { ReportDetailsModal } from '../components/ReportDetailsModal';
import { ConfirmationModal, ConfirmationModalProps } from '../components/ConfirmationModal';

const EMERGENCY_HOTLINES = [
  {
    id: 'cdrrmo',
    name: 'CDRRMO Disaster & Rescue',
    number: '0917-814-6284',
    rawPhone: '09178146284',
    icon: 'warning',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    badge: '24/7 Response',
  },
  {
    id: 'pnp',
    name: 'Mati City Police Station',
    number: '0998-598-7254',
    rawPhone: '09985987254',
    icon: 'shield',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badge: 'Law & Order',
  },
  {
    id: 'cho',
    name: 'City Health Office (CHO)',
    number: '(087) 388-3121',
    rawPhone: '0873883121',
    icon: 'medkit',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    badge: 'Medical',
  },
  {
    id: 'bfp',
    name: 'Bureau of Fire Protection',
    number: '0915-842-1290',
    rawPhone: '09158421290',
    icon: 'flame',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badge: 'Fire Rescue',
  },
];

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return 'Recently';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const DashboardScreen: React.FC = () => {
  const {
    user,
    requestVerification,
    refreshProfile,
  } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [navVisible, setNavVisible] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<ConfirmationModalProps | null>(null);

  // Database Live Data State
  const [cityStats, setCityStats] = useState({
    total: 0,
    inProgress: 0,
    resolved: 0,
    queued: 0,
    resolutionRate: 0,
  });
  const [myReportsSummary, setMyReportsSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [recentCommunityReports, setRecentCommunityReports] = useState<CivicReport[]>([]);
  const [selectedReportDetail, setSelectedReportDetail] = useState<CivicReport | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);

  const scrollOffsetRef = React.useRef(0);

  const handleScroll = (event: any) => {
    const currentOffset = event.nativeEvent?.contentOffset?.y || 0;
    const diff = currentOffset - scrollOffsetRef.current;

    if (currentOffset <= 20) {
      setNavVisible(true);
    } else if (diff > 12) {
      setNavVisible(false);
    } else if (diff < -12) {
      setNavVisible(true);
    }

    scrollOffsetRef.current = currentOffset;
  };

  // Fetch Live Database Data for Home Screen
  const fetchHomeData = useCallback(async () => {
    try {
      const { data: allReports, error: reportsErr } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsErr) {
        console.warn('Error loading home reports:', reportsErr);
      }

      if (allReports) {
        let total = 0;
        let inProgress = 0;
        let resolved = 0;
        let queued = 0;

        let myTotal = 0;
        let myPending = 0;
        let myInProgress = 0;
        let myResolved = 0;

        allReports.forEach((r) => {
          const norm = normalizeReportStatus(r.status);
          if (norm !== 'rejected') {
            total++;
            if (norm === 'in_progress') inProgress++;
            else if (norm === 'resolved') resolved++;
            else if (norm === 'approved') queued++;
          }

          if (user?.id && r.user_id === user.id) {
            myTotal++;
            if (norm === 'pending') myPending++;
            else if (norm === 'in_progress') myInProgress++;
            else if (norm === 'resolved') myResolved++;
          }
        });

        const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;

        setCityStats({
          total,
          inProgress,
          resolved,
          queued,
          resolutionRate: rate,
        });

        setMyReportsSummary({
          total: myTotal,
          pending: myPending,
          inProgress: myInProgress,
          resolved: myResolved,
        });

        // 4 Recent verified community reports for home highlight stream
        const publicRecent = allReports
          .filter((r) => {
            const s = normalizeReportStatus(r.status);
            return s === 'approved' || s === 'in_progress' || s === 'resolved';
          })
          .slice(0, 4);

        setRecentCommunityReports(publicRecent);
      }
    } catch (e) {
      console.error('Home data load error:', e);
    } finally {
      setHomeLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const onRefreshHome = () => {
    setRefreshing(true);
    fetchHomeData();
    refreshProfile();
  };

  const handleCallHotline = (phone: string, name: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      setDialogConfig({
        visible: true,
        type: 'info',
        title: name,
        message: `Direct emergency contact number: ${phone}`,
        confirmText: 'OK',
        onConfirm: () => setDialogConfig(null),
      });
    });
  };

  const verificationStatus = user?.verificationStatus || 'unverified';
  const isApproved = verificationStatus === 'approved';
  const isPending = verificationStatus === 'pending';

  const handleRequestVerification = () => {
    setDialogConfig({
      visible: true,
      type: 'confirm',
      icon: 'shield-checkmark-outline',
      title: 'Resident Verification',
      subtitle: 'City Government of Mati',
      message:
        'Submit your resident profile to the City Government of Mati for review? Maximum approval time is up to 2 business days.',
      confirmText: 'Confirm & Submit',
      cancelText: 'Cancel',
      details: [
        { label: 'Resident Name', value: user?.fullName || 'Resident' },
        { label: 'Barangay', value: user?.barangay || 'Central' },
        { label: 'Estimated Time', value: '1 to 2 Business Days' },
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
              title: 'Verification Submitted ✨',
              subtitle: 'Under City Hall Review',
              message:
                'Your resident verification request has been received. Please allow up to 2 business days for review and approval.',
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
            confirmText: 'Dismiss',
            onConfirm: () => setDialogConfig(null),
          });
        } finally {
          setSubmittingVerification(false);
        }
      },
    });
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const updatedProfile = await refreshProfile();
      const currentStat = updatedProfile?.verificationStatus || 'unverified';

      if (currentStat === 'approved') {
        setDialogConfig({
          visible: true,
          type: 'success',
          icon: 'checkmark-circle-outline',
          title: 'Account Approved! 🎉',
          subtitle: 'Verified Mati Resident',
          message:
            'Your resident verification has been approved by the City Government of Mati. You now have full access to community reports and can submit new issue reports.',
          confirmText: 'Continue',
          onConfirm: () => setDialogConfig(null),
        });
      } else if (currentStat === 'pending') {
        setDialogConfig({
          visible: true,
          type: 'info',
          icon: 'time-outline',
          title: 'Under Review ⏳',
          subtitle: 'Verification in Progress',
          message:
            'Your resident account is currently being reviewed by City Hall administrators. Maximum turnaround is up to 2 business days.',
          confirmText: 'Understood',
          onConfirm: () => setDialogConfig(null),
        });
      } else {
        setDialogConfig({
          visible: true,
          type: 'warning',
          title: 'Account Unverified',
          message:
            'Please submit your resident profile for verification to begin reporting issues.',
          confirmText: 'OK',
          onConfirm: () => setDialogConfig(null),
        });
      }
    } catch (e: any) {
      setDialogConfig({
        visible: true,
        type: 'info',
        title: 'Status Update',
        message: e.message || 'Could not fetch profile updates.',
        confirmText: 'OK',
        onConfirm: () => setDialogConfig(null),
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Main Civic Header with Profile Avatar */}
      <MainHeader
        onPressProfile={() => setProfileVisible(true)}
        title="SmartMati"
        subtitle="City Urban Services Portal"
      />

      {/* Main Tab Content */}
      <View style={styles.contentContainer}>
        {currentTab === 'home' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefreshHome}
                colors={[THEME.colors.primary]}
                tintColor={THEME.colors.primary}
              />
            }
          >
            {/* ================= HERO GREETING & PRIMARY ACTIONS ================= */}
            <View style={styles.heroCard}>
              <View style={styles.heroGreetingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroGreetingText}>
                    Mabuhay ug Madayaw, <Text style={styles.heroNameBold}>{user?.fullName?.split(' ')[0] || 'Resident'}</Text>! 👋
                  </Text>
                  <Text style={styles.heroSubGreeting}>
                    City Government of Mati • Public Services
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.heroActionBtnsRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryBtn}
                  onPress={() => setReportModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.heroPrimaryBtnText}>Report Incident</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroSecondaryBtn}
                  onPress={() => {
                    setNavVisible(true);
                    setCurrentTab('map');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map-outline" size={16} color={THEME.colors.primary} />
                  <Text style={styles.heroSecondaryBtnText}>City Map</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ================= VERIFICATION BANNER (IF UNVERIFIED OR PENDING) ================= */}
            {!isApproved && (
              <View style={styles.verificationBanner}>
                <View style={styles.verifyLeft}>
                  <Ionicons
                    name={isPending ? 'time' : 'shield-outline'}
                    size={22}
                    color={isPending ? '#B45309' : THEME.colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifyBannerTitle}>
                      {isPending
                        ? 'Resident Verification Under Review'
                        : 'Submit Resident Profile for Verification'}
                    </Text>
                    <Text style={styles.verifyBannerDesc}>
                      {isPending
                        ? 'Review takes up to 2 business days. Thank you for your patience.'
                        : 'Verification is required to submit community reports.'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.verifyBannerBtn}
                  onPress={isPending ? handleRefreshStatus : handleRequestVerification}
                  disabled={submittingVerification || refreshing}
                  activeOpacity={0.8}
                >
                  {submittingVerification || refreshing ? (
                    <ActivityIndicator size="small" color={THEME.colors.white} />
                  ) : (
                    <Text style={styles.verifyBannerBtnText}>
                      {isPending ? 'Check Status' : 'Verify Now'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= LIVE CITY RESOLUTION STATS (CONNECTED TO DB) ================= */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.sectionTitle}>CITY INCIDENT METRICS</Text>
                </View>
                <Text style={styles.sectionHeaderHint}>Live Database</Text>
              </View>

              {/* 2x2 CUBES GRID */}
              <View style={styles.statsGrid}>
                {/* Row 1 */}
                <View style={styles.statsRow}>
                  {/* Total Reports */}
                  <View style={styles.statBox}>
                    <View style={[styles.statIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="documents-outline" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.statValue}>{cityStats.total}</Text>
                    <Text style={styles.statLabel}>Total Reports</Text>
                  </View>

                  {/* In Progress */}
                  <View style={styles.statBox}>
                    <View style={[styles.statIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="time" size={18} color="#1D4ED8" />
                    </View>
                    <Text style={[styles.statValue, { color: '#1D4ED8' }]}>{cityStats.inProgress}</Text>
                    <Text style={styles.statLabel}>In Progress</Text>
                  </View>
                </View>

                {/* Row 2 */}
                <View style={styles.statsRow}>
                  {/* Resolved */}
                  <View style={styles.statBox}>
                    <View style={[styles.statIconCircle, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    </View>
                    <Text style={[styles.statValue, { color: '#059669' }]}>{cityStats.resolved}</Text>
                    <Text style={styles.statLabel}>Resolved</Text>
                  </View>

                  {/* Resolution Rate */}
                  <View style={styles.statBox}>
                    <View style={[styles.statIconCircle, { backgroundColor: '#FAF5FF' }]}>
                      <Ionicons name="trending-up" size={18} color="#7C3AED" />
                    </View>
                    <Text style={[styles.statValue, { color: '#7C3AED' }]}>{cityStats.resolutionRate}%</Text>
                    <Text style={styles.statLabel}>Fix Rate</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ================= CITIZEN PERSONAL ACTIVITY TRACKER ================= */}
            {myReportsSummary.total > 0 && (
              <View style={styles.myActivityCard}>
                <View style={styles.myActivityHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.myActivityLabel}>YOUR REPORT ACTIVITY</Text>
                    <Text style={styles.myActivityTitle}>
                      {myReportsSummary.total} Total Incident{myReportsSummary.total !== 1 ? 's' : ''} Submitted
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.viewHistoryBtn}
                    onPress={() => {
                      setNavVisible(true);
                      setCurrentTab('history');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewHistoryText}>View All</Text>
                    <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.myActivityChipsRow}>
                  {myReportsSummary.pending > 0 && (
                    <View style={[styles.myActivityChip, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <Ionicons name="time" size={12} color="#B45309" />
                      <Text style={[styles.myActivityChipText, { color: '#B45309' }]}>
                        {myReportsSummary.pending} Under Review
                      </Text>
                    </View>
                  )}

                  {myReportsSummary.inProgress > 0 && (
                    <View style={[styles.myActivityChip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      <Ionicons name="construct" size={12} color="#1D4ED8" />
                      <Text style={[styles.myActivityChipText, { color: '#1D4ED8' }]}>
                        {myReportsSummary.inProgress} In Progress
                      </Text>
                    </View>
                  )}

                  {myReportsSummary.resolved > 0 && (
                    <View style={[styles.myActivityChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                      <Text style={[styles.myActivityChipText, { color: '#059669' }]}>
                        {myReportsSummary.resolved} Resolved
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ================= RECENT COMMUNITY HIGHLIGHTS (CONNECTED TO DB) ================= */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="megaphone" size={15} color={THEME.colors.primary} />
                  <Text style={styles.sectionTitle}>RECENT COMMUNITY UPDATES</Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setNavVisible(true);
                    setCurrentTab('feed');
                  }}
                  style={styles.seeAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllBtnText}>Feed</Text>
                  <Ionicons name="arrow-forward" size={12} color={THEME.colors.primary} />
                </TouchableOpacity>
              </View>

              {homeLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                  <Text style={styles.loadingText}>Syncing live community reports...</Text>
                </View>
              ) : recentCommunityReports.length === 0 ? (
                <View style={styles.emptyRecentBox}>
                  <Ionicons name="shield-checkmark-outline" size={32} color="#94A3B8" />
                  <Text style={styles.emptyRecentTitle}>All Community Works Updated</Text>
                  <Text style={styles.emptyRecentDesc}>
                    Verified incidents and completed repairs will appear here in real-time.
                  </Text>
                </View>
              ) : (
                <View style={styles.recentReportsList}>
                  {recentCommunityReports.map((report) => {
                    const normStatus = normalizeReportStatus(report.status);
                    const isRes = normStatus === 'resolved';
                    const isInProg = normStatus === 'in_progress';
                    const images = parseReportImages(report.image_url);

                    return (
                      <TouchableOpacity
                        key={report.id}
                        style={styles.recentReportCard}
                        onPress={() => setSelectedReportDetail(report)}
                        activeOpacity={0.8}
                      >
                        {/* Thumbnail or Fallback */}
                        {images.length > 0 ? (
                          <Image source={{ uri: images[0] }} style={styles.recentThumb} />
                        ) : (
                          <View style={styles.recentThumbFallback}>
                            <Ionicons name="business" size={18} color={THEME.colors.primary} />
                          </View>
                        )}

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={styles.recentCardHeaderRow}>
                            <Text style={styles.recentReportTitle} numberOfLines={1}>
                              {report.title}
                            </Text>
                            <Text style={styles.recentReportTime}>
                              {formatTimeAgo(report.created_at)}
                            </Text>
                          </View>

                          {report.status !== 'pending' && report.office_name ? (
                            <Text style={styles.recentOfficeText} numberOfLines={1}>
                              To be worked by: <Text style={{ fontWeight: '800' }}>{report.office_name}</Text>
                            </Text>
                          ) : null}

                          <View style={styles.recentCardFooterRow}>
                            <Text style={styles.recentBrgyText} numberOfLines={1}>
                              📍 Brgy. {report.barangay}
                            </Text>

                            <View
                              style={[
                                styles.miniStatusPill,
                                isRes
                                  ? styles.miniStatusResolved
                                  : isInProg
                                  ? styles.miniStatusInProgress
                                  : styles.miniStatusQueued,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.miniStatusBaseText,
                                  isRes
                                    ? styles.miniStatusResolvedText
                                    : isInProg
                                    ? styles.miniStatusInProgressText
                                    : styles.miniStatusQueuedText,
                                ]}
                              >
                                {isRes ? 'Resolved' : isInProg ? 'In Progress' : 'Queued'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ================= 24/7 MATI CITY EMERGENCY HOTLINES ================= */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="call" size={15} color="#EF4444" />
                  <Text style={[styles.sectionTitle, { color: '#B91C1C' }]}>
                    24/7 CITY EMERGENCY HOTLINES
                  </Text>
                </View>
                <Text style={styles.sectionHeaderHint}>Tap to Call</Text>
              </View>

              {/* 2x2 HOTLINES GRID */}
              <View style={styles.hotlinesGrid}>
                {/* Row 1 */}
                <View style={styles.hotlineRow}>
                  <TouchableOpacity
                    style={[styles.hotlineCard, { backgroundColor: EMERGENCY_HOTLINES[0].bg, borderColor: EMERGENCY_HOTLINES[0].border }]}
                    onPress={() => handleCallHotline(EMERGENCY_HOTLINES[0].rawPhone, EMERGENCY_HOTLINES[0].name)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.hotlineTopRow}>
                      <View style={[styles.hotlineIconCircle, { backgroundColor: `${EMERGENCY_HOTLINES[0].color}18` }]}>
                        <Ionicons name={EMERGENCY_HOTLINES[0].icon as any} size={16} color={EMERGENCY_HOTLINES[0].color} />
                      </View>
                      <View style={[styles.hotlineBadgePill, { backgroundColor: `${EMERGENCY_HOTLINES[0].color}20` }]}>
                        <Text style={[styles.hotlineBadgeText, { color: EMERGENCY_HOTLINES[0].color }]}>
                          {EMERGENCY_HOTLINES[0].badge}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hotlineName} numberOfLines={1}>
                      {EMERGENCY_HOTLINES[0].name}
                    </Text>

                    <View style={styles.hotlineCallRow}>
                      <Ionicons name="call" size={12} color={EMERGENCY_HOTLINES[0].color} />
                      <Text style={[styles.hotlineNumber, { color: EMERGENCY_HOTLINES[0].color }]}>
                        {EMERGENCY_HOTLINES[0].number}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hotlineCard, { backgroundColor: EMERGENCY_HOTLINES[1].bg, borderColor: EMERGENCY_HOTLINES[1].border }]}
                    onPress={() => handleCallHotline(EMERGENCY_HOTLINES[1].rawPhone, EMERGENCY_HOTLINES[1].name)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.hotlineTopRow}>
                      <View style={[styles.hotlineIconCircle, { backgroundColor: `${EMERGENCY_HOTLINES[1].color}18` }]}>
                        <Ionicons name={EMERGENCY_HOTLINES[1].icon as any} size={16} color={EMERGENCY_HOTLINES[1].color} />
                      </View>
                      <View style={[styles.hotlineBadgePill, { backgroundColor: `${EMERGENCY_HOTLINES[1].color}20` }]}>
                        <Text style={[styles.hotlineBadgeText, { color: EMERGENCY_HOTLINES[1].color }]}>
                          {EMERGENCY_HOTLINES[1].badge}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hotlineName} numberOfLines={1}>
                      {EMERGENCY_HOTLINES[1].name}
                    </Text>

                    <View style={styles.hotlineCallRow}>
                      <Ionicons name="call" size={12} color={EMERGENCY_HOTLINES[1].color} />
                      <Text style={[styles.hotlineNumber, { color: EMERGENCY_HOTLINES[1].color }]}>
                        {EMERGENCY_HOTLINES[1].number}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Row 2 */}
                <View style={styles.hotlineRow}>
                  <TouchableOpacity
                    style={[styles.hotlineCard, { backgroundColor: EMERGENCY_HOTLINES[2].bg, borderColor: EMERGENCY_HOTLINES[2].border }]}
                    onPress={() => handleCallHotline(EMERGENCY_HOTLINES[2].rawPhone, EMERGENCY_HOTLINES[2].name)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.hotlineTopRow}>
                      <View style={[styles.hotlineIconCircle, { backgroundColor: `${EMERGENCY_HOTLINES[2].color}18` }]}>
                        <Ionicons name={EMERGENCY_HOTLINES[2].icon as any} size={16} color={EMERGENCY_HOTLINES[2].color} />
                      </View>
                      <View style={[styles.hotlineBadgePill, { backgroundColor: `${EMERGENCY_HOTLINES[2].color}20` }]}>
                        <Text style={[styles.hotlineBadgeText, { color: EMERGENCY_HOTLINES[2].color }]}>
                          {EMERGENCY_HOTLINES[2].badge}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hotlineName} numberOfLines={1}>
                      {EMERGENCY_HOTLINES[2].name}
                    </Text>

                    <View style={styles.hotlineCallRow}>
                      <Ionicons name="call" size={12} color={EMERGENCY_HOTLINES[2].color} />
                      <Text style={[styles.hotlineNumber, { color: EMERGENCY_HOTLINES[2].color }]}>
                        {EMERGENCY_HOTLINES[2].number}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.hotlineCard, { backgroundColor: EMERGENCY_HOTLINES[3].bg, borderColor: EMERGENCY_HOTLINES[3].border }]}
                    onPress={() => handleCallHotline(EMERGENCY_HOTLINES[3].rawPhone, EMERGENCY_HOTLINES[3].name)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.hotlineTopRow}>
                      <View style={[styles.hotlineIconCircle, { backgroundColor: `${EMERGENCY_HOTLINES[3].color}18` }]}>
                        <Ionicons name={EMERGENCY_HOTLINES[3].icon as any} size={16} color={EMERGENCY_HOTLINES[3].color} />
                      </View>
                      <View style={[styles.hotlineBadgePill, { backgroundColor: `${EMERGENCY_HOTLINES[3].color}20` }]}>
                        <Text style={[styles.hotlineBadgeText, { color: EMERGENCY_HOTLINES[3].color }]}>
                          {EMERGENCY_HOTLINES[3].badge}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hotlineName} numberOfLines={1}>
                      {EMERGENCY_HOTLINES[3].name}
                    </Text>

                    <View style={styles.hotlineCallRow}>
                      <Ionicons name="call" size={12} color={EMERGENCY_HOTLINES[3].color} />
                      <Text style={[styles.hotlineNumber, { color: EMERGENCY_HOTLINES[3].color }]}>
                        {EMERGENCY_HOTLINES[3].number}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ================= FOOTER SEAL ================= */}
            <View style={styles.footerSeal}>
              <CityLogo size="sm" showSubtitle />
              <Text style={styles.footerGovText}>
                Official Citizen Portal • City Government of Mati
              </Text>
            </View>
          </ScrollView>
        )}

        {currentTab === 'feed' && <FeedScreen onScroll={handleScroll} />}
        {currentTab === 'map' && <MapScreen />}
        {currentTab === 'history' && (
          <HistoryScreen onNavigateHome={() => { setNavVisible(true); setCurrentTab('home'); }} onScroll={handleScroll} />
        )}
        {currentTab === 'settings' && (
          <SettingsScreen onNavigateProfile={() => setProfileVisible(true)} onScroll={handleScroll} />
        )}
      </View>

      {/* Floating Bottom Navigation Bar with Scroll Animation */}
      <FloatingBottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setNavVisible(true);
          setCurrentTab(tab);
        }}
        visible={navVisible}
      />

      {/* Profile Page Modal */}
      <Modal
        visible={profileVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileVisible(false)}
      >
        <ProfileScreen onClose={() => setProfileVisible(false)} />
      </Modal>

      {/* Create Civic Report Modal */}
      <CreateReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onReportCreated={() => {
          fetchHomeData();
          setNavVisible(true);
          setCurrentTab('history');
        }}
      />

      {/* Report Details Modal from Home Highlights */}
      <ReportDetailsModal
        visible={!!selectedReportDetail}
        report={selectedReportDetail}
        onClose={() => setSelectedReportDetail(null)}
      />

      {/* Universal Confirmation & Alert Dialog */}
      {dialogConfig && <ConfirmationModal {...dialogConfig} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.primaryDark,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 96,
    gap: 12,
  },

  // HERO GREETING CARD
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  heroGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroGreetingText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#475569',
    letterSpacing: -0.1,
  },
  heroNameBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubGreeting: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400',
    marginTop: 2,
  },
  residentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 130,
  },
  statusLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  residentStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
  },
  heroActionBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    borderRadius: 14,
    paddingVertical: 11,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  heroPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  heroSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },

  // VERIFICATION BANNER
  verificationBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  verifyBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  verifyBannerDesc: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
    lineHeight: 15,
  },
  verifyBannerBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyBannerBtnText: {
    color: THEME.colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  // SECTION CARD SHELL
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHeaderHint: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  seeAllBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.primary,
  },

  // STATS 2x2 GRID
  statsGrid: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // PERSONAL ACTIVITY TRACKER CARD
  myActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  myActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myActivityLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  myActivityTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  viewHistoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  myActivityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  myActivityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  myActivityChipText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // RECENT REPORTS LIST
  loadingContainer: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loadingText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyRecentBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyRecentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  emptyRecentDesc: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
  },
  recentReportsList: {
    gap: 8,
  },
  recentReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  recentThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  recentCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  recentReportTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  recentReportTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  recentOfficeText: {
    fontSize: 11,
    color: '#475569',
  },
  recentCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  recentBrgyText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  miniStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniStatusResolved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  miniStatusResolvedText: {
    color: '#059669',
  },
  miniStatusInProgress: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  miniStatusInProgressText: {
    color: '#1D4ED8',
  },
  miniStatusQueued: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  miniStatusQueuedText: {
    color: '#B45309',
  },
  miniStatusBaseText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  // 24/7 HOTLINES GRID
  hotlinesGrid: {
    gap: 8,
  },
  hotlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hotlineCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    gap: 4,
  },
  hotlineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  hotlineIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineBadgePill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  hotlineBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  hotlineName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  hotlineCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  hotlineNumber: {
    fontSize: 10.5,
    fontWeight: '900',
  },

  // FOOTER SEAL
  footerSeal: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  footerGovText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
});
