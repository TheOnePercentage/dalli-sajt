import * as LocalAuthentication from 'expo-local-authentication';
import * as Keychain from 'react-native-keychain';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export class BiometricAuth {
  static async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (e) {
      console.error('Biometric availability check failed:', e);
      return false;
    }
  }

  static async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  }

  static async authenticate(options: {
    promptMessage: string;
    cancelButtonText?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
  } = { promptMessage: 'Authenticate to continue' }): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage,
        cancelButtonText: options.cancelButtonText || 'Cancel',
        fallbackLabel: options.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: options.disableDeviceFallback || false,
      });
      return result.success;
    } catch (e) {
      console.error('Biometric authentication failed:', e);
      return false;
    }
  }

  static async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Store in secure keychain
      await Keychain.setGenericPassword('dalli_access_token', accessToken, {
        service: 'dalli_tokens',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      await Keychain.setGenericPassword('dalli_refresh_token', refreshToken, {
        service: 'dalli_tokens',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      // Also store in SecureStore as backup
      await SecureStore.setItemAsync('dalli_access_token', accessToken);
      await SecureStore.setItemAsync('dalli_refresh_token', refreshToken);
    } catch (e) {
      console.error('Failed to store tokens:', e);
      throw e;
    }
  }

  static async getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      // Try Keychain first (biometric protected)
      const credentials = await Keychain.getGenericPassword({ service: 'dalli_tokens' });
      if (credentials) {
        const accessToken = credentials.password;
        const refreshCredentials = await Keychain.getGenericPassword({ service: 'dalli_tokens', username: 'dalli_refresh_token' });
        const refreshToken = refreshCredentials?.password;

        if (accessToken && refreshToken) {
          return { accessToken, refreshToken };
        }
      }

      // Fallback to SecureStore
      const accessToken = await SecureStore.getItemAsync('dalli_access_token');
      const refreshToken = await SecureStore.getItemAsync('dalli_refresh_token');

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }

      return null;
    } catch (e) {
      console.error('Failed to get tokens:', e);
      return null;
    }
  }

  static async clearTokens(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: 'dalli_tokens' });
      await SecureStore.deleteItemAsync('dalli_access_token');
      await SecureStore.deleteItemAsync('dalli_refresh_token');
    } catch (e) {
      console.error('Failed to clear tokens:', e);
    }
  }

  static async enableBiometric(): Promise<void> {
    try {
      // Store biometric preference
      await SecureStore.setItemAsync('biometric_enabled', 'true');
    } catch (e) {
      console.error('Failed to enable biometric:', e);
      throw e;
    }
  }

  static async disableBiometric(): Promise<void> {
    try {
      await SecureStore.setItemAsync('biometric_enabled', 'false');
    } catch (e) {
      console.error('Failed to disable biometric:', e);
      throw e;
    }
  }

  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync('biometric_enabled');
      return value === 'true';
    } catch {
      return false;
    }
  }

  static async authenticateWithBiometrics(promptMessage = 'Authenticate to access your account'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelButtonText: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (e) {
      console.error('Biometric authentication failed:', e);
      return false;
    }
  }

  static async getSupportedTypes(): Promise<string[]> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'face_id';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'unknown';
      }
    });
  }
}