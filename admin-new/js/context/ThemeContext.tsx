import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors: ThemeColors = {
  primary: '#e74c3c',
  secondary: '#c5a052',
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#16a34a',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const darkColors: ThemeColors = {
  primary: '#e74c3c',
  secondary: '#d4b86a',
  background: '#0d0d0d',
  surface: '#141414',
  text: '#f5f5f5',
  textSecondary: '#a0a0a0',
  border: '#2a2a2a',
  error: '#ef4444',
  success: '#16a34a',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('admin-theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('admin-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ colors, theme, toggleTheme }}>
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