import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { TermsModal } from '../components/TermsModal';

interface SettingsScreenProps {
  onNavigateProfile: () => void;
  onScroll?: (event: any) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigateProfile,
  onScroll,
}) => {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const handleCallEmergency = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Profile Shortcut Card */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={onNavigateProfile}
        activeOpacity={0.8}
      >
        <View style={styles.avatarMini}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarMiniImage} />
          ) : (
            <Ionicons name="person" size={20} color={THEME.colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.fullName || 'Mati Resident'}</Text>
          <Text style={styles.profileSubtitle}>Manage Profile, Photo & Verification</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
      </TouchableOpacity>

      {/* Notifications Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Notifications & Alerts</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDesc}>Get live updates when your report status changes</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#CBD5E1', true: THEME.colors.primaryLight }}
            thumbColor={THEME.colors.white}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>SMS Advisory Updates</Text>
            <Text style={styles.settingDesc}>Receive critical city storm and disaster advisories</Text>
          </View>
          <Switch
            value={smsAlertsEnabled}
            onValueChange={setSmsAlertsEnabled}
            trackColor={{ false: '#CBD5E1', true: THEME.colors.primaryLight }}
            thumbColor={THEME.colors.white}
          />
        </View>
      </View>

      {/* Civic & City Government Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>City Government Information</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => handleCallEmergency('09178146284')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="call" size={16} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>CDRRMO Disaster Rescue</Text>
            <Text style={styles.actionDesc}>0917-814-6284 (24/7 Hotline)</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => handleCallEmergency('09985987254')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="shield" size={16} color={THEME.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Mati City Police Station</Text>
            <Text style={styles.actionDesc}>0998-598-7254</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { borderBottomWidth: 0 }]}
          onPress={() => setTermsModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="document-text" size={16} color={THEME.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Terms of Service & Privacy</Text>
            <Text style={styles.actionDesc}>Citizen Data Protection & Usage Guidelines</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* App Version Info */}
      <View style={styles.appInfoBox}>
        <Text style={styles.appInfoBrand}>
          <Text style={{ color: THEME.colors.accent, fontWeight: '800' }}>Smart</Text>Mati Citizen Portal
        </Text>
        <Text style={styles.appInfoVersion}>Version 1.0.0 • City of Mati, Davao Oriental</Text>
      </View>

      <TermsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    overflow: 'hidden',
  },
  avatarMiniImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  profileSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  settingDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  actionDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  appInfoBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appInfoBrand: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  appInfoVersion: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});
