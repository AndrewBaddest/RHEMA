import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useStore } from '../../lib/store';
import { ALL_BOOKS, BOOKS_OT } from '../../lib/utils';
import { fetchAllQuizQuestions } from '../../lib/api';
import BookGrid from '../shared/BookGrid';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext'; // 👈 Added

export default function Home() {
  const [mode, setMode] = useState('quiz');
  const navigate = useNavigate();
  const setCurrentHomeTab = useUIStore((state) => state.setCurrentHomeTab);
  const setAllQuizQuestions = useStore((s) => s.setAllQuizQuestions);
  const allQuizQuestions = useStore((s) => s.allQuizQuestions || []);
  const playedQuestions = useStore((s) => s.playedQuestions || []);
  const { language, t } = useLanguage(); // 👈 Get language

  const { user, loading } = useAuth();

  useEffect(() => {
    if (allQuizQuestions.length === 0) {
      const load = async () => {
        try {
          const qs = await fetchAllQuizQuestions();
          setAllQuizQuestions(qs);
        } catch (err) {
          console.warn('⚠️ Failed to preload quiz questions:', err);
        }
      };
      if ('requestIdleCallback' in window) {
        requestIdleCallback(load, { timeout: 5000 });
      } else {
        setTimeout(load, 1000);
      }
    }
  }, []);

  const handleModeChange = (tab) => {
    setMode(tab);
    setCurrentHomeTab(tab);
  };

  const handleBookClick = (book) => {
    // 👇 'book' here is always the English name (e.g., 'Genesis')
    if (mode === 'quiz') {
      navigate('/quiz', { state: { book } });
    } else {
      navigate('/reader', { state: { book } });
    }
  };

  const startDailyQuiz = () => {
    navigate('/quiz', { state: { daily: true } });
  };

  const startGlobalChallenge = () => {
    navigate('/challenge');
  };

  return (
    <div>
      <div className="flex bg-surface rounded-3xl p-1 border border-[#333] mb-5">
        <button
          className={`flex-1 py-2.5 font-bold rounded-2xl transition-all ${
            mode === 'quiz' ? 'bg-primary text-black' : 'text-muted hover:bg-white/5'
          }`}
          onClick={() => handleModeChange('quiz')}
        >
          {t('quiz')}
        </button>
        <button
          className={`flex-1 py-2.5 font-bold rounded-2xl transition-all ${
            mode === 'read' ? 'bg-primary text-black' : 'text-muted hover:bg-white/5'
          }`}
          onClick={() => handleModeChange('read')}
        >
          {t('scripture')}
        </button>
      </div>

      <div className="flex gap-2.5 flex-wrap mb-4">
        <button className="btn flex-1 min-w-[120px]" onClick={startDailyQuiz}>
          {t('dailyQuiz')}
        </button>
        <button className="btn-secondary flex-1 min-w-[120px]" onClick={startGlobalChallenge}>
          {t('globalChallenge')}
        </button>
      </div>

      <h3 className="text-lg font-semibold mb-1.5">
        {mode === 'quiz' ? t('selectBookPlay') : t('selectBookRead')}
      </h3>
      <p className="text-muted text-sm mb-2.5">
        {mode === 'quiz'
          ? 'Choose a book and test your knowledge with 10 questions.'
          : 'Choose a book and chapter to start reading.'}
      </p>

      <div className="testament-title">{t('oldTestament')}</div>
      {/* 👇 Pass the language down */}
      <BookGrid books={BOOKS_OT} onClick={handleBookClick} lang={language} />
      
      <div className="testament-title">{t('newTestament')}</div>
      <BookGrid books={ALL_BOOKS.filter((b) => !BOOKS_OT.includes(b))} onClick={handleBookClick} lang={language} />
    </div>
  );
}