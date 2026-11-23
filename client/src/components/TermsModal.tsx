import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const TermsModal: React.FC<TermsModalProps> = ({
  visible,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name={activeTab === 'privacy' ? 'shield-checkmark' : 'document-text'}
                      size={18}
                      color={THEME.colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.title}>
                      {activeTab === 'privacy' ? 'Data Privacy Notice' : 'Terms of Service'}
                    </Text>
                    <Text style={styles.subtitle}>City Government of Mati</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color={THEME.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tab Selector */}
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'privacy' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('privacy')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color={activeTab === 'privacy' ? THEME.colors.primary : THEME.colors.textMuted}
                  />
                  <Text
                    style={[styles.tabBtnText, activeTab === 'privacy' && styles.tabBtnTextActive]}
                  >
                    Data Privacy (RA 10173)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'terms' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('terms')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={activeTab === 'terms' ? THEME.colors.primary : THEME.colors.textMuted}
                  />
                  <Text
                    style={[styles.tabBtnText, activeTab === 'terms' && styles.tabBtnTextActive]}
                  >
                    Terms of Use
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable Content */}
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {activeTab === 'privacy' ? (
                  <>
                    <View style={styles.lawBadge}>
                      <Ionicons name="information-circle" size={16} color={THEME.colors.primary} />
                      <Text style={styles.lawBadgeText}>
                        Republic Act No. 10173 • Philippine Data Privacy Act of 2012
                      </Text>
                    </View>

                    <Text style={styles.sectionTitle}>1. Statement of Privacy & Commitment</Text>
                    <Text style={styles.paragraph}>
                      The City Government of Mati is committed to protecting the privacy, security,
                      and confidentiality of all personal data submitted through SmartMati. In compliance
                      with RA 10173, all information gathered is processed in accordance with the
                      principles of transparency, legitimate purpose, and proportionality.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Information We Collect</Text>
                    <Text style={styles.paragraph}>
                      To establish resident identity and route public civic reports, SmartMati collects:
                      {'\n'}• Personal Details: Full name, gender, date of birth, contact number, and email.
                      {'\n'}• Mati Residence Details: Registered Barangay and Purok/Zone.
                      {'\n'}• Verification Credentials: Valid Government-issued ID and Barangay Certificate of Residency.
                      {'\n'}• Geospatial Data: Device GPS coordinates attached exclusively when submitting public issue reports.
                    </Text>

                    <Text style={styles.sectionTitle}>3. Purpose of Processing</Text>
                    <Text style={styles.paragraph}>
                      Your personal data is used solely for:
                      {'\n'}a) Authenticating citizen identity to prevent fraudulent and scam submissions.
                      {'\n'}b) Dispatching appropriate municipal offices (CEO, ENRO, CDRRMO) to resolve civic issues.
                      {'\n'}c) Transmitting official advisories, emergency alerts, and report progress updates.
                    </Text>

                    <Text style={styles.sectionTitle}>4. Data Protection & Non-Disclosure</Text>
                    <Text style={styles.paragraph}>
                      SmartMati employs SSL/TLS encryption and strict role-based access control. Your
                      private contact information and identification documents are accessible only to
                      authorized City Hall administrators and will NEVER be shared, sold, or distributed to
                      unauthorized commercial entities or third parties.
                    </Text>

                    <Text style={styles.sectionTitle}>5. Citizen Data Rights</Text>
                    <Text style={styles.paragraph}>
                      As a data subject, you hold the right to be informed, access your stored data, rectify
                      inaccuracies, or request account deactivation by contacting the City Government of Mati
                      Data Protection Officer.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>1. Resident Account & Purpose</Text>
                    <Text style={styles.paragraph}>
                      SmartMati is an official civic service application provided by the City
                      Government of Mati for verified residents and constituents to submit, monitor,
                      and coordinate non-emergency urban issues, infrastructure repairs, sanitation,
                      and public service requests.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Accuracy of Reported Data</Text>
                    <Text style={styles.paragraph}>
                      By creating an account, you agree to provide truthful and verifiable personal
                      information (name, contact number, resident barangay). Any intentional false
                      reports, abusive submissions, or harassment may result in account revocation.
                    </Text>

                    <Text style={styles.sectionTitle}>3. Resident Verification Policy</Text>
                    <Text style={styles.paragraph}>
                      Accounts submitted for resident verification undergo review by designated City
                      Hall administrators. Official verification grants authorization to submit community
                      incident reports and track city responses. Review turnaround is typically up to 2
                      business days.
                    </Text>

                    <Text style={styles.sectionTitle}>4. Community Guidelines</Text>
                    <Text style={styles.paragraph}>
                      Users must not upload obscene, offensive, or defamatory content. Reports should be
                      restricted to non-emergency civic concerns. Active emergency situations must be
                      reported immediately via local hotlines (CDRRMO / PNP).
                    </Text>
                  </>
                )}
              </ScrollView>

              {/* Accept / Close Button */}
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptButtonText}>I Understand & Agree</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabBtnTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  lawBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  lawBadgeText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.primary,
    lineHeight: 14,
  },
  body: {
    paddingVertical: 4,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  acceptButton: {
    backgroundColor: THEME.colors.primary,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
