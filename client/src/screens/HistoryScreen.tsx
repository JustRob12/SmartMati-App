import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CivicReport } from '../types/report';
import { CreateReportModal, parseReportImages } from './CreateReportModal';
import { ReportDetailsModal } from '../components/ReportDetailsModal';
import { ConfirmationModal, ConfirmationModalProps } from '../components/ConfirmationModal';

interface HistoryScreenProps {
  onNavigateHome: () => void;
  onScroll?: (event: any) => void;
}

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'In Progress', 'Resolved', 'Rejected'];

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigateHome,
  onScroll,
}) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [myReports, setMyReports] = useState<CivicReport[]>([]);

  // Modals state
  const [editingReport, setEditingReport] = useState<CivicReport | null>(null);
  const [viewingReport, setViewingReport] = useState<CivicReport | null>(null);
  const [dialogConfig, setDialogConfig] = useState<ConfirmationModalProps | null>(null);

  const fetchMyReports = useCallback(async () => {
    try {
      let query = supabase.from('reports').select('*');

      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else if (user?.email) {
        query = query.eq('resident_email', user.email);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching my reports from Supabase:', error);
      }

      if (data) {
        setMyReports(data);
      }
    } catch (err) {
      console.warn('History fetch failure:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyReports();

    // Realtime subscription to user reports
    const channel = supabase
      .channel('my-reports-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          fetchMyReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMyReports]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyReports();
  };

  const handleCancelPendingReport = (report: CivicReport) => {
    if (report.status !== 'pending') {
      Alert.alert('Cannot Cancel', 'Only pending reports awaiting admin review can be cancelled.');
      return;
    }

    setDialogConfig({
      visible: true,
      type: 'warning',
      icon: 'trash-outline',
      title: 'Cancel Report?',
      subtitle: report.title,
      message:
        'Are you sure you want to cancel and remove this report? This action cannot be undone.',
      confirmText: 'Yes, Cancel Report',
      cancelText: 'Keep Report',
      onCancel: () => setDialogConfig(null),
      onConfirm: async () => {
        setDialogConfig(null);
        try {
          const { error } = await supabase.from('reports').delete().eq('id', report.id);
          if (error) throw error;

          setMyReports((prev) => prev.filter((r) => r.id !== report.id));
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Could not cancel report.');
        }
      },
    });
  };

  const filteredReports = myReports.filter((r) => {
    if (selectedFilter === 'All') return true;
    return r.status.toLowerCase() === selectedFilter.toLowerCase().replace(' ', '_');
  });

  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending Review',
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          icon: 'time' as const,
        };
      case 'approved':
        return {
          label: 'Approved & Dispatched',
          bg: '#ECFDF5',
          text: '#059669',
          border: '#A7F3D0',
          icon: 'checkmark-circle' as const,
        };
      case 'in_progress':
        return {
          label: 'Work in Progress',
          bg: '#EFF6FF',
          text: '#2563EB',
          border: '#BFDBFE',
          icon: 'construct' as const,
        };
      case 'resolved':
        return {
          label: 'Resolved & Verified',
          bg: '#F0FDFA',
          text: '#0D9488',
          border: '#99F6E4',
          icon: 'shield-checkmark' as const,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          bg: '#FEF2F2',
          text: '#DC2626',
          border: '#FECACA',
          icon: 'close-circle' as const,
        };
      default:
        return {
          label: status,
          bg: '#F1F5F9',
          text: '#475569',
          border: '#E2E8F0',
          icon: 'information-circle' as const,
        };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* Header Summary Card */}
        <View style={styles.summaryBanner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="document-text" size={20} color={THEME.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>My Reported Issues</Text>
            <Text style={styles.bannerDesc}>
              You can edit pending reports before City Hall review. Once approved, reports are locked for municipal auditing.
            </Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => {
            const isSelected = f === selectedFilter;
            const count =
              f === 'All'
                ? myReports.length
                : myReports.filter(
                    (r) => r.status.toLowerCase() === f.toLowerCase().replace(' ', '_')
                  ).length;

            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                onPress={() => setSelectedFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                  {f} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Reports List / Empty State */}
        {loading && myReports.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Fetching your reports...</Text>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}>
              <Ionicons name="folder-open-outline" size={42} color={THEME.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Reports in this Tab</Text>
            <Text style={styles.emptySubtitle}>
              When you submit a report regarding public infrastructure, lighting, or sanitation in Mati, it will be cataloged here with live tracking.
            </Text>
            <TouchableOpacity
              style={styles.submitReportBtn}
              onPress={onNavigateHome}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color={THEME.colors.white} />
              <Text style={styles.submitReportBtnText}>Submit a Community Report</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {filteredReports.map((report) => {
              const badge = getStatusBadgeConfig(report.status);
              const isPending = report.status === 'pending';
              const reportImages = parseReportImages(report.image_url);

              return (
                <View key={report.id} style={styles.reportCard}>
                  {/* Top: Status Badge + Priority + Locked Tag */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardBadgesLeft}>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Ionicons name={badge.icon} size={11} color={badge.text} />
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>

                      {report.priority && report.priority !== 'medium' && (
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                report.priority === 'high' || (report.priority as any) === 'urgent'
                                  ? '#FEF2F2'
                                  : '#F7FEE7',
                              borderColor:
                                report.priority === 'high' || (report.priority as any) === 'urgent'
                                  ? '#FECACA'
                                  : '#D9F99D',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color:
                                  report.priority === 'high' || (report.priority as any) === 'urgent'
                                    ? '#DC2626'
                                    : '#4D7C0F',
                                fontWeight: '800',
                              },
                            ]}
                          >
                            {report.priority === 'high' || (report.priority as any) === 'urgent'
                              ? '🔴 High'
                              : '🟢 Minimal'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardHeaderRight}>
                      {!isPending && (
                        <View style={styles.lockedTag}>
                          <Ionicons name="lock-closed" size={10} color="#64748B" />
                          <Text style={styles.lockedTagText}>Locked</Text>
                        </View>
                      )}
                      <Text style={styles.cardDate}>
                        {report.created_at
                          ? new Date(report.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recently'}
                      </Text>
                    </View>
                  </View>

                  {/* Image + Title Row */}
                  <TouchableOpacity
                    style={styles.cardBodyRow}
                    onPress={() => setViewingReport(report)}
                    activeOpacity={0.8}
                  >
                    {reportImages.length > 0 ? (
                      <View style={styles.thumbWrapper}>
                        <Image source={{ uri: reportImages[0] }} style={styles.reportThumb} />
                        {reportImages.length > 1 && (
                          <View style={styles.multiPhotoBadge}>
                            <Ionicons name="images" size={9} color="#FFFFFF" />
                            <Text style={styles.multiPhotoText}>{reportImages.length}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.reportNoThumb}>
                        <Ionicons name="document-text-outline" size={22} color={THEME.colors.primary} />
                      </View>
                    )}

                    <View style={styles.cardTextContainer}>
                      <Text style={styles.reportTitle} numberOfLines={2}>{report.title}</Text>
                      <Text style={styles.reportCategory} numberOfLines={1}>{report.category}</Text>
                      <Text style={styles.cardLocationText} numberOfLines={1}>
                        📍 Brgy. {report.barangay}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Description Snippet */}
                  <Text style={styles.reportDesc} numberOfLines={2}>
                    {report.description}
                  </Text>

                  {/* Target Office - only when verified/approved, not pending review */}
                  {report.status !== 'pending' && report.office_name && (
                    <View style={styles.officeBox}>
                      <Ionicons name="business-outline" size={14} color={THEME.colors.primary} style={{ marginTop: 1 }} />
                      <Text style={styles.officeText}>
                        To be worked by: <Text style={{ fontWeight: '800' }}>{report.office_name}</Text>
                      </Text>
                    </View>
                  )}

                  {/* Admin Feedback */}
                  {report.admin_notes && (
                    <View style={styles.adminNoteBox}>
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color="#B45309" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adminNoteLabel}>City Hall Note:</Text>
                        <Text style={styles.adminNoteText} numberOfLines={2}>{report.admin_notes}</Text>
                      </View>
                    </View>
                  )}

                  {/* CARD FOOTER ACTIONS */}
                  <View style={styles.cardFooterActionRow}>
                    {isPending ? (
                      // Action buttons for Pending Report (Author can Edit or Cancel)
                      <View style={styles.pendingActionButtons}>
                        <TouchableOpacity
                          style={styles.editReportBtn}
                          onPress={() => setEditingReport(report)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                          <Text style={styles.editReportBtnText}>Edit Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cancelReportBtn}
                          onPress={() => handleCancelPendingReport(report)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
                          <Text style={styles.cancelReportBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // Read-only indicator for Approved/In-Progress/Resolved
                      <View style={styles.approvedLockedRow}>
                        <View style={styles.approvedLockedLeft}>
                          <Ionicons name="shield-checkmark" size={13} color="#059669" />
                          <Text style={styles.approvedLockedText} numberOfLines={1} ellipsizeMode="tail">
                            Verified by City Hall
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.viewDetailsBtn}
                          onPress={() => setViewingReport(report)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewDetailsBtnText}>Details</Text>
                          <Ionicons name="chevron-forward" size={12} color={THEME.colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Pending Report Modal */}
      {editingReport && (
        <CreateReportModal
          visible={!!editingReport}
          editReport={editingReport}
          onClose={() => setEditingReport(null)}
          onReportCreated={() => {
            setEditingReport(null);
            fetchMyReports();
          }}
        />
      )}

      {/* View Full Report Details Modal */}
      {viewingReport && (
        <ReportDetailsModal
          visible={!!viewingReport}
          report={viewingReport}
          onClose={() => setViewingReport(null)}
          onEditPending={(rep) => {
            setViewingReport(null);
            setEditingReport(rep);
          }}
        />
      )}

      {/* Universal Confirmation Modal */}
      {dialogConfig && <ConfirmationModal {...dialogConfig} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 14,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  bannerDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  filterScroll: {
    paddingBottom: 14,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  filterTabTextActive: {
    color: THEME.colors.white,
    fontWeight: '800',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  emptyContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 300,
  },
  submitReportBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitReportBtnText: {
    color: THEME.colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardBadgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  cardDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbWrapper: {
    position: 'relative',
    width: 62,
    height: 62,
    borderRadius: 12,
    overflow: 'hidden',
  },
  reportThumb: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  multiPhotoBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  multiPhotoText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  reportNoThumb: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  cardTextContainer: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  reportCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    flexWrap: 'wrap',
  },
  cardLocationText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  reportDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    flexWrap: 'wrap',
  },
  officeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  officeText: {
    fontSize: 11,
    color: THEME.colors.primary,
    flex: 1,
    flexShrink: 1,
    lineHeight: 16,
    flexWrap: 'wrap',
  },
  adminNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminNoteLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
  },
  adminNoteText: {
    fontSize: 11.5,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 16,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  cardFooterActionRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 2,
  },
  pendingActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  editReportBtn: {
    flex: 1,
    minWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editReportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelReportBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  approvedLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  approvedLockedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    flexShrink: 1,
  },
  approvedLockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    flexShrink: 1,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    flexShrink: 0,
  },
  viewDetailsBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
