import { createContext, useContext, useState } from 'react';
import { translations, ENABLE_MULTI_LANGUAGE } from '../lib/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    // 👇 Master switch OFF → force English, ignore stored value
    if (!ENABLE_MULTI_LANGUAGE) return 'en';
    return localStorage.getItem('rhema_language') || 'en';
  });

  const setLanguage = (lang) => {
    // 👇 Master switch OFF → block all language changes
    if (!ENABLE_MULTI_LANGUAGE) return;
    setLanguageState(lang);
    localStorage.setItem('rhema_language', lang);
  };

  const t = (key) => {
    // 👇 Master switch OFF → always resolve from English
    const activeLang = ENABLE_MULTI_LANGUAGE ? language : 'en';
    return translations[activeLang]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language: ENABLE_MULTI_LANGUAGE ? language : 'en',
        setLanguage,
        t,
        enabled: ENABLE_MULTI_LANGUAGE, // 👈 Settings.jsx reads this
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};