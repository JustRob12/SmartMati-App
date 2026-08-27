import React from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { THEME } from './src/lib/constants';
import { CityLogo } from './src/components/CityLogo';

const MainNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    </SafeAreaProvider>
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
