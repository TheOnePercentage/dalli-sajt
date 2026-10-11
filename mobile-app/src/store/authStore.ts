import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKVStorage } from './MMKVStorage';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'admin' | 'vendor';
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

const storage = {
  getItem: (name: string) => MMKVStorage.getString(name),
  setItem: (name: string, value: string) => MMKVStorage.setString(name, value),
  removeItem: (name: string) => MMKVStorage.remove(name),
};

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      biometricEnabled: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
          }

          const data = await response.json();
          const { user, token, refreshToken } = data;

          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Store tokens securely
          await BiometricAuth.storeTokens(data.token, data.refreshToken);

          // Track analytics
          AnalyticsService.trackEvent('user_login', { method: 'email' });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
          }

          const data = await response.json();
          const { user, token, refreshToken } = data;

          set({
            user: data.user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          await BiometricAuth.storeTokens(data.token, data.refreshToken);
          AnalyticsService.trackEvent('user_register', { method: 'email' });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${get().token}` },
          });
        } catch (e) {
          // Ignore logout errors
        }

        await BiometricAuth.clearTokens();
        await AsyncStorage.clear();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          biometricEnabled: false,
        });

        AnalyticsService.trackEvent('user_logout');
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;

        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: get().refreshToken }),
          });

          if (!response.ok) throw new Error('Token refresh failed');

          const data = await response.json();
          const { token, refreshToken, user } = data;

          set({
            token: data.token,
            refreshToken: data.refreshToken,
            user: data.user,
          });

          await BiometricAuth.storeTokens(data.token, data.refreshToken);
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      enableBiometric: async () => {
        const available = await BiometricAuth.isAvailable();
        if (!available) throw new Error('Biometric not available');

        const authenticated = await BiometricAuth.authenticate({
          promptMessage: 'Enable biometric login',
          cancelButtonText: 'Cancel',
        });

        if (authenticated) {
          set({ biometricEnabled: true });
          await BiometricAuth.enableBiometric();
        }
      },

      disableBiometric: async () => {
        await BiometricAuth.disableBiometric();
        set({ biometricEnabled: false });
      },

      updateProfile: async (data: Partial<User>) => {
        const { token } = get();
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/user/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${get().token}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update profile');

        const user = await response.json();
        set({ user: data.user });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        biometricEnabled: state.biometricEnabled,
      }),
    }
  ))
);