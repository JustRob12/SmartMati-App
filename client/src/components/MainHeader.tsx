import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

interface MainHeaderProps {
  onPressProfile: () => void;
  title?: string;
  subtitle?: string;
}

export const MainHeader: React.FC<MainHeaderProps> = ({
  onPressProfile,
  title = 'SmartMati',
  subtitle = 'City Urban Services Portal',
}) => {
  const { user } = useAuth();
  const isApproved = user?.verificationStatus === 'approved';

  return (
    <LinearGradient
      colors={[THEME.colors.primaryDark, THEME.colors.primary]}
      style={styles.headerContainer}
    >
      <View style={styles.contentRow}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.brandTitle}>
            <Text style={styles.brandAccent}>Smart</Text>Mati
          </Text>
          <Text style={styles.tagline}>{subtitle}</Text>
        </View>

        {/* Profile Avatar Button */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={onPressProfile}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={18} color={THEME.colors.primary} />
            </View>
          )}

          {/* Verification Badge Dot */}
          {isApproved && (
            <View style={styles.verifiedDot}>
              <Ionicons name="checkmark" size={9} color={THEME.colors.white} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleSection: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.white,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: THEME.colors.accent,
  },
  tagline: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 1,
    fontWeight: '500',
  },
  profileButton: {
    position: 'relative',
    padding: 2,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: THEME.colors.white,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#059669',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.white,
  },
});
