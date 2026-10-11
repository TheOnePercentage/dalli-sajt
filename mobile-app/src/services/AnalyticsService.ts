import { Analytics } from 'expo-firebase-analytics';
import { Platform } from 'react-native';

export class AnalyticsService {
  static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    try {
      if (Platform.OS !== 'web') {
        await Analytics.setAnalyticsCollectionEnabled(true);
        await Analytics.setUserId('anonymous');
      }
      this.initialized = true;
      console.log('[Analytics] Initialized');
    } catch (e) {
      console.error('Analytics initialization failed:', e);
    }
  }

  static async setUserId(userId: string) {
    try {
      if (Platform.OS !== 'web') {
        await Analytics.setUserId(userId);
      }
    } catch (e) {
      console.error('Set user ID failed:', e);
    }
  }

  static async setUserProperties(properties: Record<string, any>) {
    try {
      if (Platform.OS !== 'web') {
        await Analytics.setUserProperties(properties);
      }
    } catch (e) {
      console.error('Set user properties failed:', e);
    }
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Analytics Event:', name, parameters);
    // In production, send to Firebase Analytics, Amplitude, etc.
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Analytics Event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static trackScreenView(screenName: string, screenClass?: string) {
    console.log('Screen view:', screenName, screenClass);
  }

  static trackEvent(name: string, params?: Record<string, any>) {
    console.log('Track event:', name, params);
  }

  static trackScreenView(screenName: string, screenClass?: string) {
    console.log('Screen view:', screenName, screenClass);
  }

  static trackEvent(name: string, params?: Record<string, any>) {
    console.log('Track event:', name, params);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static trackEvent(name: string, params?: Record<string, any>) {
    console.log('Track event:', name, params);
  }

  static trackScreenView(screenName: string, screenClass?: string) {
    console.log('Screen view:', screenName, screenClass);
  }

  static trackEvent(name: string, params?: Record<string, any>) {
    console.log('Track event:', name, params);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }

  static setUserId(userId: string) {
    console.log('Set user ID:', userId);
  }

  static setUserProperties(properties: Record<string, any>) {
    console.log('Set user properties:', properties);
  }

  static logEvent(eventName: string, parameters?: Record<string, any>) {
    console.log('Log event:', name, parameters);
  }
}
