import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LANGUAGE_OPTIONS = [
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪'
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧'
  }
];

export function LanguageProvider({ children }) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('de');

  // Sync with Next.js router locale
  useEffect(() => {
    const locale = router.locale || 'de';
    if (locale !== currentLanguage) {
      setCurrentLanguage(locale);
      i18n.changeLanguage(locale);
    }
  }, [router.locale, i18n]);

  const changeLanguage = (languageCode) => {
    // Push to new locale URL
    router.push(router.asPath, router.asPath, { locale: languageCode });
  };

  const getCurrentLanguageInfo = () => {
    return LANGUAGE_OPTIONS.find(lang => lang.code === currentLanguage) || LANGUAGE_OPTIONS[0];
  };

  const value = {
    currentLanguage,
    changeLanguage,
    languages: LANGUAGE_OPTIONS,
    currentLanguageInfo: getCurrentLanguageInfo()
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
