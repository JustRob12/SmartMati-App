import React from 'react';
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
}

export const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose }) => {
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
                    <Ionicons name="document-text" size={18} color={THEME.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>Terms & Privacy Policy</Text>
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

              {/* Scrollable Terms Content */}
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
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

                <Text style={styles.sectionTitle}>3. Privacy & Data Protection</Text>
                <Text style={styles.paragraph}>
                  In compliance with the Data Privacy Act of 2012 (RA 10173), all personal data
                  collected is stored securely and processed exclusively for account verification,
                  resident identification, and municipal service dispatch. Your private contact
                  information will never be shared with unauthorized third parties.
                </Text>

                <Text style={styles.sectionTitle}>4. Resident Verification Policy</Text>
                <Text style={styles.paragraph}>
                  Accounts submitted for resident verification undergo review by designated City
                  Hall administrators. Official verification grants access to community report
                  tracking and citizen advisory updates. Review turnaround is typically up to 2
                  business days.
                </Text>
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
  body: {
    paddingVertical: 6,
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
