import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import deCommon from '../public/locales/de/common.json';
import enCommon from '../public/locales/en/common.json';
import viCommon from '../public/locales/vi/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: {
        common: deCommon,
      },
      en: {
        common: enCommon,
      },
      vi: {
        common: viCommon,
      },
    },
    lng: 'de', // Always start with 'de' to ensure server/client consistency
    fallbackLng: 'de',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
