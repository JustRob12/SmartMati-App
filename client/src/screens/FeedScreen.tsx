import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CivicReport, ReportPriority, ReportStatus } from '../types/report';

export type StatusFilterType = 'all' | 'in_progress' | 'resolved' | 'not_yet_in_progress';

const STATUS_FILTERS: { id: StatusFilterType; label: string; icon: string; subtitle: string }[] = [
  {
    id: 'all',
    label: 'All Reports',
    icon: 'apps-outline',
    subtitle: 'Show all public civic submissions',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: 'time-outline',
    subtitle: 'Field team deployed and actively fixing',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    icon: 'checkmark-circle-outline',
    subtitle: 'Completed & verified by City Hall',
  },
  {
    id: 'not_yet_in_progress',
    label: 'Not Yet in Progress',
    icon: 'hourglass-outline',
    subtitle: 'Approved & queued for field dispatch',
  },
];

const FEED_CATEGORIES: { name: string; icon: string }[] = [
  { name: 'All Categories', icon: 'grid-outline' },
  { name: 'Infrastructure, Roads, & Utilities', icon: 'construct-outline' },
  { name: 'Environment, Trash, & Sanitation', icon: 'trash-outline' },
  { name: 'Emergencies, Disasters, & Safety', icon: 'shield-alert-outline' },
  { name: 'Animal Welfare & Health', icon: 'paw-outline' },
  { name: 'Centralized & Public Order', icon: 'business-outline' },
];

// Robust normalizer for report status regardless of spaces, underscores, or casing
export const normalizeReportStatus = (
  rawStatus?: string
): 'pending' | 'approved' | 'in_progress' | 'resolved' | 'rejected' => {
  if (!rawStatus) return 'pending';
  const clean = rawStatus.toLowerCase().trim().replace(/[\s-]/g, '_');
  if (clean === 'in_progress' || clean === 'inprogress' || clean === 'in_work' || clean === 'ongoing') {
    return 'in_progress';
  }
  if (clean === 'resolved' || clean === 'completed' || clean === 'fixed' || clean === 'done') {
    return 'resolved';
  }
  if (clean === 'approved' || clean === 'verified' || clean === 'queued' || clean === 'dispatched') {
    return 'approved';
  }
  if (clean === 'rejected' || clean === 'declined' || clean === 'dismissed') {
    return 'rejected';
  }
  return 'pending';
};

export const parseReportImages = (imageUrl?: string | null): string[] => {
  if (!imageUrl) return [];
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((u) => typeof u === 'string' && u.length > 0);
    } catch {}
  }
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((u) => u.trim()).filter((u) => u.length > 0);
  }
  return [trimmed];
};

interface FeedScreenProps {
  onScroll?: (event: any) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ onScroll }) => {
  const { user: currentUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [posts, setPosts] = useState<CivicReport[]>([]);
  const [lightboxState, setLightboxState] = useState<{ images: string[]; index: number } | null>(null);

  // Dropdown Modals State
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      // 1. Fetch all reports from Supabase
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.warn('Error fetching feed reports:', reportsError);
      }

      // 2. Fetch all profiles to map the latest avatar and name for each author
      let profilesMap: Record<string, { avatar_url?: string; full_name?: string }> = {};
      try {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url');

        if (profilesData) {
          profilesData.forEach((p) => {
            if (p.id) {
              profilesMap[p.id] = {
                avatar_url: p.avatar_url,
                full_name: p.full_name,
              };
            }
            if (p.email) {
              profilesMap[p.email.toLowerCase().trim()] = {
                avatar_url: p.avatar_url,
                full_name: p.full_name,
              };
            }
            if (p.full_name) {
              profilesMap[p.full_name.toLowerCase().trim()] = {
                avatar_url: p.avatar_url,
                full_name: p.full_name,
              };
            }
          });
        }
      } catch (pErr) {
        console.warn('Profiles lookup warning in feed:', pErr);
      }

      if (reportsData && reportsData.length > 0) {
        const enriched = reportsData.map((r: any) => {
          const profile =
            (r.user_id && profilesMap[r.user_id]) ||
            (r.resident_email && profilesMap[r.resident_email.toLowerCase().trim()]) ||
            (r.resident_name && profilesMap[r.resident_name.toLowerCase().trim()]) ||
            null;

          const isCurrentAuthor =
            currentUser &&
            (r.user_id === currentUser.id ||
              (r.resident_email &&
                currentUser.email &&
                r.resident_email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()));

          const resolvedAvatar =
            (isCurrentAuthor && currentUser.avatarUrl) ||
            profile?.avatar_url ||
            r.resident_avatar ||
            undefined;

          return {
            ...r,
            resident_avatar: resolvedAvatar,
            resident_name: profile?.full_name || r.resident_name,
          };
        });
        setPosts(enriched);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.warn('Feed fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchReports();

    // Subscribe to realtime reports AND profiles updates (so avatar changes immediately reflect)
    const channel = supabase
      .channel('feed-reports-and-profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          fetchReports();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
  };

  // Helper for relative time (Facebook style)
  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Only approved, in-progress, and resolved reports for public feed (excludes 'pending' / under review and 'rejected')
  const publicPosts = useMemo(() => {
    return posts.filter((p) => {
      const s = normalizeReportStatus(p.status);
      return s === 'approved' || s === 'in_progress' || s === 'resolved';
    });
  }, [posts]);

  // Filtered posts based on Status and Category
  const filteredPosts = useMemo(() => {
    return publicPosts.filter((post) => {
      const normalizedStatus = normalizeReportStatus(post.status);

      // 1. Status Filter
      if (selectedStatusFilter === 'in_progress') {
        if (normalizedStatus !== 'in_progress') return false;
      } else if (selectedStatusFilter === 'resolved') {
        if (normalizedStatus !== 'resolved') return false;
      } else if (selectedStatusFilter === 'not_yet_in_progress') {
        if (normalizedStatus !== 'approved') return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'All Categories') {
        const cat = post.category || '';
        if (
          !cat.toLowerCase().includes(selectedCategory.toLowerCase()) &&
          !selectedCategory.toLowerCase().includes(cat.toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    });
  }, [publicPosts, selectedStatusFilter, selectedCategory]);

  // Counts for dropdown tabs
  const countInProgress = useMemo(
    () => publicPosts.filter((p) => normalizeReportStatus(p.status) === 'in_progress').length,
    [publicPosts]
  );
  const countResolved = useMemo(
    () => publicPosts.filter((p) => normalizeReportStatus(p.status) === 'resolved').length,
    [publicPosts]
  );
  const countNotYet = useMemo(
    () =>
      publicPosts.filter((p) => normalizeReportStatus(p.status) === 'approved').length,
    [publicPosts]
  );

  const activeStatusLabel =
    STATUS_FILTERS.find((s) => s.id === selectedStatusFilter)?.label || 'All Reports';

  const isFiltered = selectedStatusFilter !== 'all' || selectedCategory !== 'All Categories';

  const handleResetFilters = () => {
    setSelectedStatusFilter('all');
    setSelectedCategory('All Categories');
  };

  const renderFacebookImageGrid = (rawImageUrl?: string | null) => {
    const images = parseReportImages(rawImageUrl);
    if (images.length === 0) return null;

    if (images.length === 1) {
      return (
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={() => setLightboxState({ images, index: 0 })}
          style={styles.singleImageContainer}
        >
          <Image source={{ uri: images[0] }} style={styles.singleImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }

    if (images.length === 2) {
      return (
        <View style={styles.twoImageGrid}>
          {images.map((uri, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.92}
              onPress={() => setLightboxState({ images, index: idx })}
              style={styles.twoImageItem}
            >
              <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (images.length === 3) {
      return (
        <View style={styles.threeImageGrid}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => setLightboxState({ images, index: 0 })}
            style={styles.threeImageLarge}
          >
            <Image source={{ uri: images[0] }} style={styles.gridImage} resizeMode="cover" />
          </TouchableOpacity>
          <View style={styles.threeImageStackedCol}>
            {images.slice(1, 3).map((uri, idx) => (
              <TouchableOpacity
                key={idx + 1}
                activeOpacity={0.92}
                onPress={() => setLightboxState({ images, index: idx + 1 })}
                style={styles.threeImageStackedItem}
              >
                <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    // 4 Images (2 x 2 Facebook Grid)
    return (
      <View style={styles.fourImageGrid}>
        {images.slice(0, 4).map((uri, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.92}
            onPress={() => setLightboxState({ images, index: idx })}
            style={styles.fourImageItem}
          >
            <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      {/* =========================================================================
          FIXED STICKY FILTER BAR (Positioned directly under MainHeader, does NOT scroll)
          ========================================================================= */}
      <View style={styles.fixedFilterBar}>
        <View style={styles.dropdownsRow}>
          {/* Status Dropdown Trigger Button */}
          <TouchableOpacity
            style={[
              styles.dropdownTriggerBtn,
              selectedStatusFilter !== 'all' && styles.dropdownTriggerBtnActive,
            ]}
            onPress={() => setStatusDropdownVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownBtnInner}>
              <View
                style={[
                  styles.dropdownIconCircle,
                  selectedStatusFilter !== 'all' && styles.dropdownIconCircleActive,
                ]}
              >
                <Ionicons
                  name={
                    selectedStatusFilter === 'in_progress'
                      ? 'time'
                      : selectedStatusFilter === 'resolved'
                      ? 'checkmark-circle'
                      : selectedStatusFilter === 'not_yet_in_progress'
                      ? 'hourglass'
                      : 'apps'
                  }
                  size={14}
                  color={selectedStatusFilter !== 'all' ? THEME.colors.primary : '#475569'}
                />
              </View>
              <View style={styles.dropdownTextCol}>
                <Text style={styles.dropdownLabel}>Reports Status</Text>
                <Text
                  style={[
                    styles.dropdownValue,
                    selectedStatusFilter !== 'all' && styles.dropdownValueActive,
                  ]}
                  numberOfLines={1}
                >
                  {activeStatusLabel}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={14}
                color={selectedStatusFilter !== 'all' ? THEME.colors.primary : '#64748B'}
              />
            </View>
          </TouchableOpacity>

          {/* Category Dropdown Trigger Button */}
          <TouchableOpacity
            style={[
              styles.dropdownTriggerBtn,
              selectedCategory !== 'All Categories' && styles.dropdownTriggerBtnActive,
            ]}
            onPress={() => setCategoryDropdownVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownBtnInner}>
              <View
                style={[
                  styles.dropdownIconCircle,
                  selectedCategory !== 'All Categories' && styles.dropdownIconCircleActive,
                ]}
              >
                <Ionicons
                  name="pricetags"
                  size={14}
                  color={selectedCategory !== 'All Categories' ? THEME.colors.primary : '#475569'}
                />
              </View>
              <View style={styles.dropdownTextCol}>
                <Text style={styles.dropdownLabel}>Category</Text>
                <Text
                  style={[
                    styles.dropdownValue,
                    selectedCategory !== 'All Categories' && styles.dropdownValueActive,
                  ]}
                  numberOfLines={1}
                >
                  {selectedCategory}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={14}
                color={selectedCategory !== 'All Categories' ? THEME.colors.primary : '#64748B'}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Filter Quick Badges & Reset Strip (if filter applied) */}
        {isFiltered && (
          <View style={styles.activeFiltersStrip}>
            <View style={styles.activeFilterTags}>
              {selectedStatusFilter !== 'all' && (
                <View style={styles.activeTagBadge}>
                  <Text style={styles.activeTagText}>{activeStatusLabel}</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedStatusFilter('all')}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close-circle" size={13} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              )}

              {selectedCategory !== 'All Categories' && (
                <View style={styles.activeTagBadge}>
                  <Text style={styles.activeTagText} numberOfLines={1}>
                    {selectedCategory}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedCategory('All Categories')}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close-circle" size={13} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleResetFilters}
              style={styles.clearAllBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllBtnText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* =========================================================================
          SCROLLABLE FEED OF POSTS (Scrolls smoothly underneath the fixed filters)
          ========================================================================= */}
      <ScrollView
        style={styles.container}
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
        {/* FEED POSTS LIST */}
        {loading && posts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading civic posts...</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyBadgeCircle}>
              <Ionicons name="newspaper-outline" size={40} color={THEME.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Posts in this Filter</Text>
            <Text style={styles.emptySubtitle}>
              {selectedStatusFilter === 'in_progress'
                ? 'There are currently no reports with field personnel deployed.'
                : selectedStatusFilter === 'resolved'
                ? 'No reports have been marked resolved yet.'
                : selectedStatusFilter === 'not_yet_in_progress'
                ? 'No reports are currently waiting for field dispatch.'
                : 'No reports match your active category filter.'}
            </Text>
            {isFiltered && (
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={handleResetFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.postsList}>
            {filteredPosts.map((post) => {
              const normStatus = normalizeReportStatus(post.status);
              const isResolved = normStatus === 'resolved';
              const isInProgress = normStatus === 'in_progress';
              const isApproved = normStatus === 'approved';

              const isCurrentAuthor =
                currentUser &&
                (post.user_id === currentUser.id ||
                  (post.resident_email &&
                    currentUser.email &&
                    post.resident_email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()));

              // Author Avatar (Live from current session, profiles map, or reports table)
              const authorAvatar =
                (isCurrentAuthor && currentUser.avatarUrl) ||
                post.resident_avatar ||
                post.profiles?.avatar_url ||
                undefined;

              const authorName =
                (isCurrentAuthor && currentUser.fullName) ||
                post.profiles?.full_name ||
                post.resident_name ||
                'Mati Resident';

              // Priority pill config
              const priority = (post.priority as any) === 'urgent' ? 'high' : post.priority || 'medium';
              const priorityConfig = {
                high: { label: '🔴 High', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
                medium: { label: '🟡 Normal', bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A' },
                low: { label: '🟢 Minimal', bg: '#F7FEE7', text: '#4D7C0F', border: '#D9F99D' },
              }[priority];

              return (
                <View key={post.id} style={styles.facebookPostCard}>
                  {/* POST HEADER: Avatar, Author Name, Timestamp, Location & Status */}
                  <View style={styles.postHeader}>
                    <View style={styles.authorAvatarWrapper}>
                      {authorAvatar ? (
                        <Image
                          source={{ uri: authorAvatar }}
                          style={styles.authorAvatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.authorAvatarFallback}>
                          <Text style={styles.authorInitial}>
                            {authorName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.headerInfoCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.authorName} numberOfLines={1}>
                          {authorName}
                        </Text>
                      </View>

                      {/* Subtitle Line 1: Time and Global Icon on the same line */}
                      <View style={styles.timeGlobeRow}>
                        <Text style={styles.timeText}>
                          {formatTimeAgo(post.created_at)}
                        </Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Ionicons name="earth" size={11} color="#64748B" />
                      </View>

                      {/* Subtitle Line 2: Barangay Placement on the bottom of the global icon */}
                      {post.barangay ? (
                        <View style={styles.headerBarangayRow}>
                          <Ionicons name="location-sharp" size={11} color="#EF4444" />
                          <Text style={styles.headerBarangayText} numberOfLines={1}>
                            Brgy. {post.barangay}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Status Pill on Top Right */}
                    <View style={styles.statusPillsWrapper}>
                      {isResolved ? (
                        <View style={[styles.statusPill, styles.statusResolvedPill]}>
                          <Ionicons name="checkmark-circle" size={11} color="#047857" />
                          <Text style={styles.statusResolvedText}>Resolved</Text>
                        </View>
                      ) : isInProgress ? (
                        <View style={[styles.statusPill, styles.statusInProgressPill]}>
                          <Ionicons name="time" size={11} color="#1D4ED8" />
                          <Text style={styles.statusInProgressText}>In Progress</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, styles.statusQueuedPill]}>
                          <Ionicons name="hourglass" size={11} color="#B45309" />
                          <Text style={styles.statusQueuedText}>
                            {isApproved ? 'Queued' : 'Under Review'}
                          </Text>
                        </View>
                      )}

                      {/* Priority Tag */}
                      {priority !== 'medium' && (
                        <View
                          style={[
                            styles.priorityPill,
                            {
                              backgroundColor: priorityConfig.bg,
                              borderColor: priorityConfig.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityPillText,
                              { color: priorityConfig.text },
                            ]}
                          >
                            {priorityConfig.label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* POST CONTENT: Title & Description */}
                  <View style={styles.postContentSection}>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postDescription}>{post.description}</Text>

                    {/* Metadata Row: GPS Coordinates, Exact Address & Category Badges */}
                    <View style={styles.metaDetailsRow}>
                      {/* GPS Coordinates Badge */}
                      {post.latitude != null && post.longitude != null && (
                        <View style={styles.coordsBadge}>
                          <Ionicons name="navigate-circle" size={12} color="#0284C7" />
                          <Text style={styles.coordsBadgeText}>
                            {post.latitude.toFixed(4)}°N, {post.longitude.toFixed(4)}°E
                          </Text>
                        </View>
                      )}

                      {/* Exact Street Address if available */}
                      {post.address && (
                        <View style={styles.addressBadge}>
                          <Ionicons name="location-outline" size={11} color="#475569" />
                          <Text style={styles.addressBadgeText} numberOfLines={1}>
                            {post.address}
                          </Text>
                        </View>
                      )}

                      {/* Category Chip */}
                      {post.category && (
                        <View style={styles.categoryChipSmall}>
                          <Ionicons name="pricetag-outline" size={11} color={THEME.colors.primary} />
                          <Text style={styles.categoryChipSmallText}>{post.category}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* POST PHOTO(S) (Facebook-style 1, 2, 3, or 2x2 Grid with tap-to-zoom & arrows) */}
                  {renderFacebookImageGrid(post.image_url)}

                  {/* POST FOOTER: Department Routing & City Feedback Note (NO like or comment buttons) */}
                  {(post.office_name || post.admin_notes) && (
                    <View style={styles.postFooterSection}>
                      {post.office_name && (
                        <View style={styles.officeDispatchTag}>
                          <Ionicons name="business" size={13} color={THEME.colors.primary} />
                          <Text style={styles.officeDispatchText} numberOfLines={1}>
                            To be worked by: <Text style={{ fontWeight: '800' }}>{post.office_name}</Text>
                          </Text>
                        </View>
                      )}

                      {post.admin_notes && (
                        <View style={styles.adminFeedbackBox}>
                          <Text style={styles.adminFeedbackLabel}>City Hall Note:</Text>
                          <Text style={styles.adminFeedbackText}>{post.admin_notes}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* =========================================================================
          REPORTS STATUS DROPDOWN MODAL
          ========================================================================= */}
      <Modal
        visible={statusDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStatusDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setStatusDropdownVisible(false)}
        >
          <View style={styles.dropdownModalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleCol}>
                <Text style={styles.modalTitle}>Filter by Reports Status</Text>
                <Text style={styles.modalSubtitle}>Select issue resolution status</Text>
              </View>
              <TouchableOpacity
                onPress={() => setStatusDropdownVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {STATUS_FILTERS.map((item) => {
                const isSelected = item.id === selectedStatusFilter;
                const count =
                  item.id === 'all'
                    ? publicPosts.length
                    : item.id === 'in_progress'
                    ? countInProgress
                    : item.id === 'resolved'
                    ? countResolved
                    : countNotYet;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedStatusFilter(item.id);
                      setStatusDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.optionIconBox,
                        isSelected && styles.optionIconBoxSelected,
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={isSelected ? THEME.colors.primary : '#64748B'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          isSelected && styles.optionTitleSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                    </View>

                    <View
                      style={[
                        styles.optionCountBadge,
                        isSelected && styles.optionCountBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionCountText,
                          isSelected && styles.optionCountTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={THEME.colors.primary}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================================
          CATEGORY DROPDOWN MODAL
          ========================================================================= */}
      <Modal
        visible={categoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCategoryDropdownVisible(false)}
        >
          <View style={styles.dropdownModalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleCol}>
                <Text style={styles.modalTitle}>Filter by Category</Text>
                <Text style={styles.modalSubtitle}>Select municipal service category</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCategoryDropdownVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {FEED_CATEGORIES.map((item) => {
                const isSelected = item.name === selectedCategory;
                const count =
                  item.name === 'All Categories'
                    ? publicPosts.length
                    : publicPosts.filter(
                        (p) =>
                          (p.category || '').toLowerCase().includes(item.name.toLowerCase()) ||
                          item.name.toLowerCase().includes((p.category || '').toLowerCase())
                      ).length;

                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(item.name);
                      setCategoryDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.optionIconBox,
                        isSelected && styles.optionIconBoxSelected,
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={isSelected ? THEME.colors.primary : '#64748B'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          isSelected && styles.optionTitleSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.optionCountBadge,
                        isSelected && styles.optionCountBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionCountText,
                          isSelected && styles.optionCountTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={THEME.colors.primary}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL WITH ZOOM & PREV/NEXT ARROWS */}
      {lightboxState && (
        <Modal
          visible={!!lightboxState}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setLightboxState(null)}
        >
          <View style={styles.lightboxBackdrop}>
            {/* Top Navigation Bar: Counter & Close */}
            <View style={styles.lightboxTopBar}>
              <View style={styles.lightboxCounterPill}>
                <Text style={styles.lightboxCounterText}>
                  {lightboxState.index + 1} / {lightboxState.images.length}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setLightboxState(null)}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Pinch-to-Zoom & Double-Tap Zoom Scroll View */}
            <ScrollView
              style={styles.lightboxZoomScroll}
              contentContainerStyle={styles.lightboxZoomContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent={true}
            >
              <Image
                source={{ uri: lightboxState.images[lightboxState.index] }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </ScrollView>

            {/* Left Navigation Arrow (Previous Image) */}
            {lightboxState.images.length > 1 && (
              <TouchableOpacity
                style={styles.lightboxPrevBtn}
                onPress={() =>
                  setLightboxState((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index - 1 + prev.images.length) % prev.images.length,
                        }
                      : null
                  )
                }
                activeOpacity={0.8}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Right Navigation Arrow (Next Image) */}
            {lightboxState.images.length > 1 && (
              <TouchableOpacity
                style={styles.lightboxNextBtn}
                onPress={() =>
                  setLightboxState((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index + 1) % prev.images.length,
                        }
                      : null
                  )
                }
                activeOpacity={0.8}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Bottom Indicator Dots */}
            {lightboxState.images.length > 1 && (
              <View style={styles.lightboxDotsRow}>
                {lightboxState.images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.lightboxDot,
                      i === lightboxState.index && styles.lightboxDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Facebook/Modern feed background
  },

  // FIXED FILTER BAR (Connected directly beneath MainHeader)
  fixedFilterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 20,
    gap: 8,
  },
  dropdownsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownTriggerBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dropdownTriggerBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  dropdownBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownIconCircleActive: {
    backgroundColor: '#DBEAFE',
  },
  dropdownTextCol: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dropdownValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  dropdownValueActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },

  // ACTIVE FILTERS STRIP
  activeFiltersStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  activeFilterTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  activeTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    maxWidth: 160,
  },
  activeTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  clearAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },

  // SCROLL CONTENT
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 96,
  },

  // POSTS LIST
  postsList: {
    gap: 12,
  },

  // FACEBOOK-STYLE POST CARD
  facebookPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },

  // POST HEADER
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  authorAvatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  authorAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  authorInitial: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  headerInfoCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeGlobeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  headerBarangayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    marginTop: 0.5,
  },
  headerBarangayText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },

  // STATUS & PRIORITY PILLS
  statusPillsWrapper: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusResolvedPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusResolvedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
  },
  statusInProgressPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusInProgressText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  statusQueuedPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusQueuedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  priorityPill: {
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  // POST CONTENT (Title & Description)
  postContentSection: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4,
  },
  postDescription: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: '#334155',
  },
  metaDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  coordsBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  addressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 220,
  },
  addressBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSmallText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.primary,
  },

  // FACEBOOK-STYLE PHOTO GRIDS (1, 2, 3, 4 photos)
  singleImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#0F172A',
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  twoImageGrid: {
    flexDirection: 'row',
    gap: 3,
    width: '100%',
    height: 200,
    backgroundColor: '#E2E8F0',
  },
  twoImageItem: {
    flex: 1,
    height: '100%',
  },
  threeImageGrid: {
    flexDirection: 'row',
    gap: 3,
    width: '100%',
    height: 240,
    backgroundColor: '#E2E8F0',
  },
  threeImageLarge: {
    flex: 1.2,
    height: '100%',
  },
  threeImageStackedCol: {
    flex: 1,
    gap: 3,
    height: '100%',
  },
  threeImageStackedItem: {
    flex: 1,
  },
  fourImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  fourImageItem: {
    width: (screenWidth - 35) / 2,
    height: 140,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },

  // POST FOOTER (Department & Feedback)
  postFooterSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  officeDispatchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  officeDispatchText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
  },
  adminFeedbackBox: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminFeedbackLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  adminFeedbackText: {
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 16,
  },

  // EMPTY & LOADING STATES
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyBadgeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.colors.primarySoft,
    borderRadius: 12,
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },

  // DROPDOWN BOTTOM SHEET MODAL
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: screenHeight * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  optionRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: THEME.colors.primary,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionIconBoxSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  optionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  optionTitleSelected: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  optionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  optionCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  optionCountBadgeSelected: {
    backgroundColor: THEME.colors.primary,
  },
  optionCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  optionCountTextSelected: {
    color: '#FFFFFF',
  },

  // LIGHTBOX MODAL & CONTROLS
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  lightboxCounterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  lightboxCounterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxZoomScroll: {
    width: screenWidth,
    height: screenHeight,
  },
  lightboxZoomContent: {
    width: screenWidth,
    height: screenHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: screenWidth,
    height: screenHeight * 0.75,
  },
  lightboxPrevBtn: {
    position: 'absolute',
    left: 14,
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  lightboxNextBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  lightboxDotsRow: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 20,
  },
  lightboxDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  lightboxDotActive: {
    width: 20,
    backgroundColor: THEME.colors.primary,
  },
});
