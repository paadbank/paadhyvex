'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';

// Language support
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
type SupportedLang = typeof SUPPORTED_LANGUAGES[number];

// Translation shape from en.json
type Translations = typeof en;

// All loaded language files
const languages: Record<SupportedLang, Translations> = {
  en,
  fr
};

// Type for translation parameters
type TranslationParams = Record<string, string | number>;
type TranslationNodeParams = Record<string, string | number | React.ReactNode>;

// Enhanced context with parameter support
interface LanguageContextProps {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: {
    (key: keyof Translations | string): string;
    (key: keyof Translations | string, params: TranslationParams): string;
    (key: keyof Translations | string, runtimeLang: SupportedLang): string;
    (key: keyof Translations | string, params: TranslationParams, runtimeLang: SupportedLang): string;
  };
  tNode: {
    (key: keyof Translations | string): React.ReactNode;
    (key: keyof Translations | string, params: TranslationNodeParams): React.ReactNode;
    (key: keyof Translations | string, runtimeLang: SupportedLang): React.ReactNode;
    (key: keyof Translations | string, params: TranslationNodeParams, runtimeLang: SupportedLang): React.ReactNode;
  };
}

// Default context values
const LanguageContext = createContext<LanguageContextProps>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  tNode: (key) => key
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<SupportedLang>('en');

  // Initialize from localStorage
  useEffect(() => {
    const initializeLanguage = () => {
      try {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('language') as SupportedLang | null;
          const initialLang = saved && SUPPORTED_LANGUAGES.includes(saved)
            ? saved
            : 'en';

          setLangState(initialLang);
        }
      } catch (error) {
        console.error('Error initializing language:', error);
        setLangState('en');
      }
    };

    initializeLanguage();
  }, []);

  const setLang = (newLang: SupportedLang) => {
    setLangState(newLang);
    localStorage.setItem('language', newLang);
  };

  const t: LanguageContextProps['t'] = (
    key: keyof Translations | string,
    paramsOrLang?: TranslationParams | SupportedLang,
    runtimeLangMaybe?: SupportedLang
  ): string => {
    let params: TranslationParams | undefined;
    let runtimeLang: SupportedLang | undefined;

    // Determine if second argument is params or runtimeLang
    if (typeof paramsOrLang === 'string') {
      runtimeLang = paramsOrLang;
    } else {
      params = paramsOrLang;
      runtimeLang = runtimeLangMaybe;
    }

    const dictionary = languages[runtimeLang ?? lang] ?? languages.en;
    let translation = dictionary[key as keyof Translations] ?? key;

    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      });
    }

    return translation;
  };

  const tNode: LanguageContextProps['tNode'] = (
    key: keyof Translations | string,
    paramsOrLang?: TranslationNodeParams | SupportedLang,
    runtimeLangMaybe?: SupportedLang
  ): React.ReactNode => {
    let params: TranslationNodeParams | undefined;
    let runtimeLang: SupportedLang | undefined;

    // Determine if second argument is params or runtimeLang
    if (typeof paramsOrLang === 'string') {
      runtimeLang = paramsOrLang;
    } else {
      params = paramsOrLang;
      runtimeLang = runtimeLangMaybe;
    }

    const dictionary = languages[runtimeLang ?? lang] ?? languages.en;
    const template = dictionary[key as keyof Translations] ?? key;

    if (!params) return template;

    const parts = template.split(/(\{.*?\})/g);

    return parts.map((part, index) => {
      const match = part.match(/^\{(.*)\}$/);
      if (match) {
        const paramKey = match[1];
        return <React.Fragment key={index}>{params[paramKey]}</React.Fragment>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };


  // Don't render children until language is initialized
  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tNode }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const getSupportedLang = (lang: string | null): SupportedLang => {
  return lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLang)
    ? (lang as SupportedLang)
    : 'en';
};

export type { SupportedLang };
export const useLanguage = () => useContext(LanguageContext);