import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';

interface CityLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const CityLogo: React.FC<CityLogoProps> = ({ size = 'md', showSubtitle = false }) => {
  const dimensions = {
    sm: { container: 48, icon: 24, text: 12, border: 2 },
    md: { container: 72, icon: 34, text: 14, border: 3 },
    lg: { container: 92, icon: 44, text: 18, border: 4 },
  }[size];

  return (
    <View style={styles.wrapper}>
      {/* Emblem Circle */}
      <View
        style={[
          styles.emblemCircle,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: dimensions.container / 2,
            borderWidth: dimensions.border,
          },
        ]}
      >
        {/* Inner Seal Graphic */}
        <View style={styles.sealInner}>
          <Ionicons name="shield-checkmark" size={dimensions.icon} color={THEME.colors.primary} />
          {/* Accent Gold Star */}
          <View style={styles.starBadge}>
            <Ionicons name="star" size={size === 'sm' ? 8 : 12} color={THEME.colors.accent} />
          </View>
        </View>
      </View>

      {/* City Title */}
      <View style={styles.textContainer}>
        <Text style={[styles.cityTitle, { fontSize: dimensions.text }]}>CITY OF MATI</Text>
        <Text style={styles.provinceSubtitle}>DAVAO ORIENTAL</Text>
      </View>

      {showSubtitle && (
        <Text style={styles.tagline}>For residents of Mati City</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemCircle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F59E0B', // Gold border matching official seal
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sealInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 1,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  cityTitle: {
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1.5,
  },
  provinceSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.accentDark,
    letterSpacing: 1,
    marginTop: 1,
  },
  tagline: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
});
