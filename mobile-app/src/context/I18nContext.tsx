import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from '../../admin-new/js/components/ui/I18n';

interface I18nContextType {
  language: string;
  translations: Record<string, string>;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
  availableLanguages: Array<{ code: string; name: string; nativeName: string; flag: string }>;
}

const I18nContext = React.createContext<ReturnType<typeof useI18n> | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<string>('sr-Cyrl');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const loadTranslations = useCallback(async (lang: string) => {
    try {
      // In production, fetch from API or load from local files
      // For now, use embedded translations
      const translations = I18n.getEmbeddedTranslations(lang);
      setTranslations(translations);
    } catch (e) {
      console.error('Failed to load translations:', e);
    }
  }, []);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('dalli_language');
        if (savedLang) {
          await loadTranslations(savedLang);
          return;
        }
        // Default to Serbian Cyrillic
        await loadTranslations('sr-Cyrl');
      } catch (e) {
        console.error('Failed to load language:', e);
      }
    };

    loadLanguage();
  }, [loadTranslations]);

  const setLanguage = useCallback(async (lang: string) => {
    if (!I18n.languages[lang]) return;
    await AsyncStorage.setItem('dalli_language', lang);
    setLanguageState(lang);
    await loadTranslations(lang);
  }, [loadTranslations]);

  const t = useCallback((key: string, params?: Record<string, string>) => {
    let translation = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
    }
    return translation;
  }, [translations]);

  const availableLanguages = [
    { code: 'sr-Cyrl', name: 'Српски (ћирилица)', nativeName: 'Српски (ћирилица)', flag: '🇷🇸' },
    { code: 'sr-Latn', name: 'Srpski (latinica)', nativeName: 'Srpski (latinica)', flag: '🇷🇸' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🇸🇦' },
    { code: 'he', name: 'עברית', nativeName: 'עברית', flag: '🇮🇱' },
  ];

  return (
    <I18nContext.Provider value={{
      language,
      translations,
      setLanguage,
      t,
      availableLanguages,
    }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export { I18n };