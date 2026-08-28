import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../lib/constants';

export type NavTab = 'home' | 'feed' | 'map' | 'history' | 'settings';

interface FloatingBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  visible?: boolean;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  currentTab,
  onSelectTab,
  visible = true,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 120, // Move offscreen when hidden
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.floatingWrapper,
        {
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.navBarContainer}>
        {/* Tab 1: Home / Submit */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('home')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentTab === 'home' && styles.iconWrapperActive]}>
            <Ionicons
              name={currentTab === 'home' ? 'home' : 'home-outline'}
              size={20}
              color={currentTab === 'home' ? THEME.colors.primary : THEME.colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, currentTab === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Feed / Community */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('feed')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentTab === 'feed' && styles.iconWrapperActive]}>
            <Ionicons
              name={currentTab === 'feed' ? 'newspaper' : 'newspaper-outline'}
              size={20}
              color={currentTab === 'feed' ? THEME.colors.primary : THEME.colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, currentTab === 'feed' && styles.tabLabelActive]}>
            Feed
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Map (Prominent Big Elevated Circle) */}
        <TouchableOpacity
          style={styles.centerMapWrapper}
          onPress={() => onSelectTab('map')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              currentTab === 'map'
                ? [THEME.colors.primaryDark, '#1D4ED8']
                : [THEME.colors.primary, '#2563EB']
            }
            style={[
              styles.centerMapCircle,
              currentTab === 'map' && styles.centerMapCircleActive,
            ]}
          >
            <Ionicons name="map" size={26} color={THEME.colors.white} />
            <Text style={styles.centerMapText}>MAP</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Tab 4: History / My Reports */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('history')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentTab === 'history' && styles.iconWrapperActive]}>
            <Ionicons
              name={currentTab === 'history' ? 'time' : 'time-outline'}
              size={20}
              color={currentTab === 'history' ? THEME.colors.primary : THEME.colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, currentTab === 'history' && styles.tabLabelActive]}>
            History
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Settings */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentTab === 'settings' && styles.iconWrapperActive]}>
            <Ionicons
              name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
              size={20}
              color={currentTab === 'settings' ? THEME.colors.primary : THEME.colors.textMuted}
            />
          </View>
          <Text style={[styles.tabLabel, currentTab === 'settings' && styles.tabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 14,
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 999,
  },
  navBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 64,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    width: 32,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: THEME.colors.primarySoft,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  centerMapWrapper: {
    top: -14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  centerMapCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  centerMapCircleActive: {
    borderColor: THEME.colors.accent,
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  centerMapText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.white,
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
