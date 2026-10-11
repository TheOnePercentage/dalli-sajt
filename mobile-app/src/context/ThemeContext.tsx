import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../constants/theme';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  colors: typeof Theme.colors.light;
}

const ThemeContext = React.createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setIsDark(JSON.parse(savedTheme));
        } else {
          // Check system preference
          const dark = Appearance.getColorScheme() === 'dark';
          setIsDark(dark);
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newValue = !prev;
      AsyncStorage.setItem('theme', JSON.stringify(!prev));
      return !prev;
    });
  }, []);

  const setTheme = useCallback((isDark: boolean) => {
    setIsDark(isDark);
    AsyncStorage.setItem('theme', JSON.stringify(isDark));
  }, []);

  const colors = isDark ? Theme.colors.dark : Theme.colors.light;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};