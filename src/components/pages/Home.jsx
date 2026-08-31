import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useStore } from '../../lib/store';
import { ALL_BOOKS, BOOKS_OT } from '../../lib/utils';
import { fetchAllQuizQuestions } from '../../lib/api';
import BookGrid from '../shared/BookGrid';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  console.log('🏠 Home component rendering...');

  const [mode, setMode] = useState('quiz');
  const navigate = useNavigate();
  const setCurrentHomeTab = useUIStore((state) => state.setCurrentHomeTab);
  const setAllQuizQuestions = useStore((s) => s.setAllQuizQuestions);
  const allQuizQuestions = useStore((s) => s.allQuizQuestions || []);
  const playedQuestions = useStore((s) => s.playedQuestions || []);

  const { user, loading } = useAuth();
  console.log('👤 Auth state:', { user, loading });

  useEffect(() => {
    if (!loading) {
      console.log('✅ User authenticated:', user?.id);
    }
  }, [user, loading]);

  useEffect(() => {
    console.log('📦 allQuizQuestions length:', allQuizQuestions.length);
    if (allQuizQuestions.length === 0) {
      console.log('🔄 Starting preload...');
      const load = async () => {
        try {
          console.log('🔄 Fetching quiz questions...');
          const qs = await fetchAllQuizQuestions();
          console.log(`✅ Preloaded ${qs.length} questions.`);
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

  const availableCount = allQuizQuestions.filter(q => !playedQuestions.includes(q.ref)).length;

  return (
    <div>
      <div className="flex bg-surface rounded-3xl p-1 border border-[#333] mb-5">
        <button
          className={`flex-1 py-2.5 font-bold rounded-2xl transition-all ${
            mode === 'quiz' ? 'bg-primary text-black' : 'text-muted hover:bg-white/5'
          }`}
          onClick={() => handleModeChange('quiz')}
        >
          Quiz
        </button>
        <button
          className={`flex-1 py-2.5 font-bold rounded-2xl transition-all ${
            mode === 'read' ? 'bg-primary text-black' : 'text-muted hover:bg-white/5'
          }`}
          onClick={() => handleModeChange('read')}
        >
          Scripture
        </button>
      </div>

      <div className="flex gap-2.5 flex-wrap mb-4">
        <button className="btn flex-1 min-w-[120px]" onClick={startDailyQuiz}>
          📅 Daily Quiz
        </button>
        <button className="btn-secondary flex-1 min-w-[120px]" onClick={startGlobalChallenge}>
          🌍 Global Challenge
        </button>
      </div>

      <h3 className="text-lg font-semibold mb-1.5">
        Select a Book to {mode === 'quiz' ? 'Play' : 'Read'}
      </h3>
      <p className="text-muted text-sm mb-2.5">
        {mode === 'quiz'
          ? 'Choose a book and test your knowledge with 10 questions.'
          : 'Choose a book and chapter to start reading.'}
      </p>

      <div className="testament-title">Old Testament</div>
      <BookGrid books={BOOKS_OT} onClick={handleBookClick} />
      <div className="testament-title">New Testament</div>
      <BookGrid books={ALL_BOOKS.filter((b) => !BOOKS_OT.includes(b))} onClick={handleBookClick} />
    </div>
  );
}