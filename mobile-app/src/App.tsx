/**
 * DALLI Mobile App Entry Point
 * React Native with TypeScript, CodePush, Biometrics
 */

import React from 'react';
import { AppRegistry, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { I18nProvider } from './context/I18nContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthStack } from './navigation/AuthStack';
import { MainStack } from './navigation/MainStack';
import { RootNavigator } from './navigation/RootNavigator';
import { CodePush } from 'react-native-code-push';
import { SplashScreen } from './components/SplashScreen';
import { BiometricAuth } from './services/BiometricAuth';
import { CodePushService } from './services/CodePushService';
import { AnalyticsService } from './services/AnalyticsService';
import { PushNotificationService } from './services/PushNotificationService';
import { Theme } from './constants/theme';
import { i18n } from './utils/i18n';

// CodePush configuration
const codePushOptions = {
  checkFrequency: 'ON_APP_RESUME',
  installMode: 'ON_NEXT_RESTART',
  minimumBackgroundDuration: 60 * 1000, // 1 minute
  mandatoryUpdateMode: 'IMMEDIATE',
};

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const App = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);

  React.useEffect(() => {
    const initApp = async () => {
      // Initialize services
      await AnalyticsService.initialize();
      await PushNotificationService.configure();
      await CodePushService.sync();

      // Check biometric availability
      const biometricAvailable = await BiometricAuth.isAvailable();
      setBiometricEnabled(biometricAvailable);

      setIsReady(true);
    };

    initApp();
  }, []);

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <PaperProvider theme={Theme}>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <PersistGate loading={<SplashScreen />} persistor={persistor}>
                  <NavigationContainer>
                    <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primary} />
                    <RootNavigator />
                  </NavigationContainer>
                </PersistGate>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </PaperProvider>
  );
};

const CodePushEnabledApp = CodePush(codePushOptions)(App);

AppRegistry.registerComponent('DALLIMobile', () => CodePushEnabledApp);

export default CodePushEnabledApp;