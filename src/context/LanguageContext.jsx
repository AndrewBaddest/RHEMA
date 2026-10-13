import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { translations } from '../lib/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // default

  // Load from localStorage initially
  useEffect(() => {
    const stored = localStorage.getItem('rhema_language');
    if (stored) setLanguage(stored);
  }, []);

  // Save to DB when user is authenticated and language changes
  const setLanguageWithSync = async (lang, user) => {
    setLanguage(lang);
    localStorage.setItem('rhema_language', lang);
    if (user) {
      try {
        await supabase.from('users').update({ language: lang }).eq('id', user.id);
      } catch (e) {
        console.warn('Failed to save language preference to DB', e);
      }
    }
  };

  // On mount, load language from DB if user is logged in
  useEffect(() => {
    const loadFromDB = async (user) => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('language')
        .eq('id', user.id)
        .single();
      if (data?.language) {
        setLanguage(data.language);
        localStorage.setItem('rhema_language', data.language);
      }
    };
    // This will be called after auth loads – we'll integrate in App.jsx
    // For now, we'll provide a function to call from AuthContext.
  }, []);

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageWithSync, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);