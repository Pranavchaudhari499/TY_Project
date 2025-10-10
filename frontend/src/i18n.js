// frontend/src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationHI from './locales/hi/translation.json';

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // Init i18next
  .init({
    resources: {
      en: {
        translation: translationEN
      },
      hi: {
        translation: translationHI
      }
    },
    fallbackLng: 'en', // Use English if the detected language is not available
    interpolation: {
      escapeValue: false // React already safes from xss
    }
  });

export default i18n;