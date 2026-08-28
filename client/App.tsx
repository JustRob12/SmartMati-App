import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { THEME } from './src/lib/constants';
import { CityLogo } from './src/components/CityLogo';

// Prevent native splash screen from auto-hiding before fonts & auth are ready
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Reload/dev ignore */
});

const MainNavigator: React.FC<{ fontsLoaded: boolean }> = ({ fontsLoaded }) => {
  const { user, loading: authLoading } = useAuth();

  const isReady = fontsLoaded && !authLoading;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        /* Ignore hide error */
      });
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.white} />
        <CityLogo size="md" />
        <ActivityIndicator
          size="large"
          color={THEME.colors.primary}
          style={styles.loadingSpinner}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primaryDark} />
      {user ? <DashboardScreen /> : <LoginScreen />}
    </>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error (fallback to system icons):', fontError);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontError]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <MainNavigator fontsLoaded={fontsLoaded || Boolean(fontError)} />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginTop: 24,
  },
});

