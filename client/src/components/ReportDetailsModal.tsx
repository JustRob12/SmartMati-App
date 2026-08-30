import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME, getDefaultCitizenAvatar } from '../lib/constants';
import { CivicReport } from '../types/report';
import { parseReportImages } from '../screens/CreateReportModal';

interface ReportDetailsModalProps {
  visible: boolean;
  report: CivicReport | null;
  onClose: () => void;
  onEditPending?: (report: CivicReport) => void;
}

export const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({
  visible,
  report,
  onClose,
  onEditPending,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!report) return null;

  const isPending = report.status === 'pending';
  const isApproved = report.status === 'approved';
  const isInProgress = report.status === 'in_progress';
  const isResolved = report.status === 'resolved';
  const isRejected = report.status === 'rejected';

  const reportImages = parseReportImages(report.image_url);

  const getStatusBadgeConfig = () => {
    switch (report.status) {
      case 'pending':
        return {
          label: 'Pending Review',
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          icon: 'time' as const,
          desc: 'Awaiting review and dispatch by Mati City Hall administrators.',
        };
      case 'approved':
        return {
          label: 'Approved & Dispatched',
          bg: '#ECFDF5',
          text: '#059669',
          border: '#A7F3D0',
          icon: 'checkmark-circle' as const,
          desc: 'Verified by City Hall. Assigned to responsible municipal team for action.',
        };
      case 'in_progress':
        return {
          label: 'Work in Progress',
          bg: '#EFF6FF',
          text: '#2563EB',
          border: '#BFDBFE',
          icon: 'construct' as const,
          desc: 'Municipal engineers and field workers are currently on-site fixing the issue.',
        };
      case 'resolved':
        return {
          label: 'Resolved & Verified',
          bg: '#F0FDFA',
          text: '#0D9488',
          border: '#99F6E4',
          icon: 'shield-checkmark' as const,
          desc: 'Issue has been fully resolved and inspected by city authorities.',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          bg: '#FEF2F2',
          text: '#DC2626',
          border: '#FECACA',
          icon: 'close-circle' as const,
          desc: 'Report could not be processed. See administrator feedback below.',
        };
      default:
        return {
          label: report.status,
          bg: '#F1F5F9',
          text: '#475569',
          border: '#E2E8F0',
          icon: 'information-circle' as const,
          desc: '',
        };
    }
  };

  const getPriorityBadgeConfig = () => {
    switch (report.priority) {
      case 'high':
      case 'urgent' as any:
        return { label: '🔴 High Priority', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'low':
        return { label: '🟢 Minimal', bg: '#F7FEE7', text: '#4D7C0F', border: '#D9F99D' };
      case 'medium':
      default:
        return { label: '🟡 Normal Priority', bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A' };
    }
  };

  const badge = getStatusBadgeConfig();
  const priorityBadge = getPriorityBadgeConfig();

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Report Details</Text>
            <Text style={styles.headerSubtitle}>Mati Urban Services</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Alert Banner */}
          <View style={[styles.statusBanner, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Ionicons name={badge.icon} size={22} color={badge.text} />
            <View style={{ flex: 1 }}>
              <View style={styles.statusTitleRow}>
                <Text style={[styles.statusBannerTitle, { color: badge.text }]}>{badge.label}</Text>
                {!isPending && (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={10} color="#475569" />
                    <Text style={styles.lockedBadgeText}>Locked</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.statusBannerDesc, { color: badge.text }]}>
                {badge.desc}
              </Text>
            </View>
          </View>

          {/* If Locked Warning */}
          {!isPending && (
            <View style={styles.lockedNoticeCard}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#0284C7" />
              <Text style={styles.lockedNoticeText}>
                This report has been reviewed by the City Government of Mati. To preserve municipal auditing records, verified reports cannot be edited.
              </Text>
            </View>
          )}

          {/* Photo Preview Gallery if available */}
          {reportImages.length > 0 && (
            <View style={styles.galleryContainer}>
              <View style={styles.imageCard}>
                <Image
                  source={{ uri: reportImages[activeImageIdx] || reportImages[0] }}
                  style={styles.reportImage}
                />
                <View style={styles.imageOverlayBadge}>
                  <Text style={styles.imageOverlayBadgeText}>{report.category}</Text>
                </View>

                {reportImages.length > 1 && (
                  <View style={styles.imageCounterBadge}>
                    <Text style={styles.imageCounterText}>
                      {activeImageIdx + 1} / {reportImages.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Multi-photo thumbnail selector */}
              {reportImages.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbScroll}>
                  {reportImages.map((img, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setActiveImageIdx(idx)}
                      style={[styles.thumbBtn, activeImageIdx === idx && styles.thumbBtnActive]}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img }} style={styles.thumbImg} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Main Info Card */}
          <View style={styles.card}>
            <Text style={styles.reportTitle}>{report.title}</Text>

            <View style={styles.metaRow}>
              {/* Priority Pill */}
              <View style={[styles.metaChip, { backgroundColor: priorityBadge.bg, borderColor: priorityBadge.border }]}>
                <Text style={[styles.metaChipText, { color: priorityBadge.text, fontWeight: '800' }]}>
                  {priorityBadge.label}
                </Text>
              </View>

              <View style={styles.metaChip}>
                <Ionicons name="folder-outline" size={12} color={THEME.colors.primary} />
                <Text style={styles.metaChipText}>{report.category}</Text>
              </View>

              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={12} color={THEME.colors.textSecondary} />
                <Text style={styles.metaChipText}>
                  {report.created_at
                    ? new Date(report.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recent'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Description */}
            <Text style={styles.sectionHeading}>ISSUE DESCRIPTION</Text>
            <Text style={styles.descriptionText}>{report.description}</Text>

            {/* Target Office - only when verified and approved by admin, not when pending */}
            {!isPending && report.office_name && (
              <View style={styles.officeCard}>
                <Ionicons name="business" size={20} color={THEME.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.officeLabel}>TO BE WORKED BY</Text>
                  <Text style={styles.officeName}>{report.office_name}</Text>
                </View>
              </View>
            )}

            {/* Citizen Reporter Profile */}
            <View style={styles.divider} />
            <Text style={styles.sectionHeading}>REPORTED BY CITIZEN</Text>
            <View style={styles.reporterCard}>
              <View style={styles.reporterAvatarBox}>
                {report.resident_avatar || report.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: report.resident_avatar || report.profiles?.avatar_url }}
                    style={styles.reporterAvatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={22} color={THEME.colors.primary} />
                )}
              </View>
              <View style={styles.reporterInfoCol}>
                <View style={styles.reporterNameRow}>
                  <Text style={styles.reporterNameText} numberOfLines={1}>
                    {report.profiles?.full_name || report.resident_name || 'Verified Resident'}
                  </Text>
                  <View style={styles.residentVerifiedPill}>
                    <Ionicons name="shield-checkmark" size={10} color="#059669" />
                    <Text style={styles.residentVerifiedPillText}>Citizen</Text>
                  </View>
                </View>
                <Text style={styles.reporterBarangayText}>
                  Brgy. {report.barangay} • Mati City
                </Text>
              </View>
            </View>

            {/* Location Details */}
            <View style={styles.divider} />
            <Text style={styles.sectionHeading}>LOCATION & MAPPING</Text>
            <View style={styles.locationDetailsBox}>
              <View style={styles.locationDetailItem}>
                <Ionicons name="location" size={16} color="#EF4444" />
                <Text style={styles.locationDetailText}>
                  Brgy. {report.barangay}
                </Text>
              </View>

              {report.address && (
                <View style={styles.locationDetailItem}>
                  <Ionicons name="navigate-outline" size={15} color={THEME.colors.primary} />
                  <Text style={styles.locationDetailText}>{report.address}</Text>
                </View>
              )}

              {report.latitude && report.longitude && (
                <View style={styles.coordsPill}>
                  <Ionicons name="pin" size={12} color={THEME.colors.primary} />
                  <Text style={styles.coordsText}>
                    GPS: {report.latitude.toFixed(5)}°N, {report.longitude.toFixed(5)}°E
                  </Text>
                </View>
              )}
            </View>

            {/* Admin Feedback Notes */}
            {report.admin_notes && (
              <>
                <View style={styles.divider} />
                <View style={styles.adminFeedbackBox}>
                  <View style={styles.adminFeedbackHeader}>
                    <Ionicons name="chatbubble-ellipses" size={16} color="#B45309" />
                    <Text style={styles.adminFeedbackTitle}>City Hall Administrator Feedback</Text>
                  </View>
                  <Text style={styles.adminFeedbackBody}>{report.admin_notes}</Text>
                </View>
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionFooter}>
            {isPending && onEditPending && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  onClose();
                  onEditPending(report);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={styles.editBtnText}>Edit Pending Report</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lockedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#334155',
  },
  statusBannerDesc: {
    fontSize: 11.5,
    marginTop: 3,
    lineHeight: 16,
  },
  lockedNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  lockedNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 15,
  },
  galleryContainer: {
    gap: 8,
  },
  imageCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  imageOverlayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  imageCounterBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  thumbScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  thumbBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#0F172A',
  },
  thumbBtnActive: {
    borderColor: THEME.colors.primary,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  officeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
  },
  officeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  officeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 1,
    flexWrap: 'wrap',
  },
  reporterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reporterAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  reporterAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  reporterAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reporterAvatarInitials: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  reporterInfoCol: {
    flex: 1,
    gap: 2,
  },
  reporterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reporterNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flexShrink: 1,
  },
  residentVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  residentVerifiedPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#047857',
  },
  reporterBarangayText: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  locationDetailsBox: {
    gap: 6,
  },
  locationDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  locationDetailText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  coordsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  coordsText: {
    fontSize: 10.5,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  adminFeedbackBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  adminFeedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminFeedbackTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  adminFeedbackBody: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  actionFooter: {
    gap: 10,
    marginTop: 6,
  },
  editBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  doneBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
