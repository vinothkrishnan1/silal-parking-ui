import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../translations/en.json';
import ar from '../translations/ar.json';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('appLanguage') || 'en');

  const translations = {
    en,
    ar
  };

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    // Apply RTL/LTR
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.body.style.textAlign = language === 'ar' ? 'right' : 'left';

    // Optional: Add a class to body for custom CSS targeting
    if (language === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  // Helper function to get nested translation keys
  const t = (path, variables = {}) => {
    if (typeof path !== 'string') return path;
    const keys = path.split('.');
    
    // Attempt to get translation in current language
    let result = translations[language];
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        result = undefined;
        break;
      }
    }
    
    // Fallback to english if missing in current language
    if (result === undefined && language !== 'en') {
      result = translations['en'];
      for (const key of keys) {
        if (result && result[key] !== undefined) {
          result = result[key];
        } else {
          result = undefined;
          break;
        }
      }
    }

    // If completely missing, return a human-readable fallback and log warning
    if (result === undefined) {
      console.warn(`[i18n] Missing translation for key: "${path}"`);
      const lastKey = keys[keys.length - 1];
      result = lastKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
    }

    // Handle Interpolation
    if (typeof result === 'string') {
      return result.replace(/\{\{\s*(\w+)\s*\}\}|\{\s*(\w+)\s*\}/g, (match, p1, p2) => {
        const key = p1 || p2;
        return variables[key] !== undefined ? variables[key] : match;
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, content: translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
