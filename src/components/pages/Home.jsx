import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../lib/store';
import { ALL_BOOKS, BOOKS_OT } from '../../lib/utils';
import BookGrid from '../shared/BookGrid';
import { useLanguage } from '../../context/LanguageContext';

export default function Home() {
  const [mode, setMode] = useState('quiz');
  const navigate = useNavigate();
  const setCurrentHomeTab = useUIStore((state) => state.setCurrentHomeTab);
  const { language, t } = useLanguage();

  const handleModeChange = (tab) => {
    setMode(tab);
    setCurrentHomeTab(tab);
  };

  const handleBookClick = (book) => {
    // 'book' is the English name (e.g., 'Genesis') for the DB query
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
        {mode === 'quiz' ? t('homeDescQuiz') : t('homeDescRead')}
      </p>

      <div className="testament-title">{t('oldTestament')}</div>
      <BookGrid books={BOOKS_OT} onClick={handleBookClick} lang={language} />
      
      <div className="testament-title">{t('newTestament')}</div>
      <BookGrid books={ALL_BOOKS.filter((b) => !BOOKS_OT.includes(b))} onClick={handleBookClick} lang={language} />
    </div>
  );
}