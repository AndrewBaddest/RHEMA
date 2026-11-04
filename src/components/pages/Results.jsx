import { useLocation, useNavigate } from 'react-router-dom';
import { getFullName, cleanBookName } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import { SWAHILI_BOOK_NAMES } from '../../lib/translations';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, userAnswers, score, isDaily, book } = location.state || {};
  const { language, t } = useLanguage();

  if (!questions || !userAnswers) {
    navigate('/home');
    return null;
  }

  const total = questions.length;
  const correct = score;
  const percent = Math.round((correct / total) * 100);
  let emoji = '';
  let message = '';
  if (percent === 100) { emoji = ' '; message = t('perfectWisdom'); }
  else if (percent >= 70) { emoji = ' '; message = t('greatJob'); }
  else if (percent >= 40) { emoji = ' '; message = t('goodEffort'); }
  else { emoji = ' '; message = t('keepStudying'); }

  const goToVerse = (ref) => {
    if (!ref) return;
    const trimmed = String(ref).trim();

    // Match "Book Chapter:Verse" or "Book Chapter"
    const matchWithVerse = trimmed.match(/^(.+?)\s+(\d+):(\d+)$/);
    const matchChapterOnly = trimmed.match(/^(.+?)\s+(\d+)$/);

    let rawBook, chapter, verse;
    if (matchWithVerse) {
      rawBook = matchWithVerse[1];
      chapter = matchWithVerse[2];
      verse = matchWithVerse[3];
    } else if (matchChapterOnly) {
      rawBook = matchChapterOnly[1];
      chapter = matchChapterOnly[2];
      verse = 1;
    } else {
      return;
    }

    // Clean the string: remove periods and lowercase it (e.g., "Mwa." -> "mwa")
    const cleanString = rawBook.replace(/\./g, '').trim().toLowerCase();
    
    let finalBook = null;

    // 👇 IF WE ARE IN SWAHILI MODE, TRY SWAHILI FIRST!
    if (language === 'sw') {
      // 1. Exact Swahili match
      for (const [en, sw] of Object.entries(SWAHILI_BOOK_NAMES)) {
        if (sw.replace(/\./g, '').toLowerCase() === cleanString) {
          finalBook = en;
          break;
        }
      }
      // 2. Fuzzy Swahili match (e.g., "mwa" -> "mwanzo")
      if (!finalBook) {
        for (const [en, sw] of Object.entries(SWAHILI_BOOK_NAMES)) {
          const swClean = sw.replace(/\./g, '').toLowerCase();
          if (cleanString.length >= 3 && swClean.startsWith(cleanString)) {
            finalBook = en;
            break;
          }
        }
      }
    }

    // 👇 FALLBACK TO ENGLISH (If Swahili failed, or if we are in English mode)
    if (!finalBook) {
      finalBook = getFullName(cleanBookName(cleanString));
    }

    // Debug log to help track any future issues
    console.log(`🔍 Parsing Ref: "${ref}" -> Resolved Book: "${finalBook}" (Chapter ${chapter}, Verse ${verse})`);

    if (!finalBook) {
      console.warn("❌ Could not resolve book:", rawBook);
      return;
    }

    console.log("🔍 Parsing Ref:", ref, "-> Book:", finalBook, "Chapter:", chapter);
    navigate("/reader", {
      state: { book: finalBook, chapter: parseInt(chapter, 10), verse: parseInt(verse, 10), fromResults: true },
    });
  };

  const redoQuiz = () => {
    if (isDaily) navigate('/quiz', { state: { daily: true } });
    else if (book) navigate('/quiz', { state: { book } });
    else navigate('/home');
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="bg-surface rounded-xl p-4 border border-primary">
      <div className="text-center mb-5 pb-4 border-b border-primary/20">
        <div className="text-4xl">{emoji}</div>
        <div className="text-5xl font-bold text-primary">{correct}/{total}</div>
        <div className="text-lg mt-1">{message}</div>
        {isDaily && (
          <div className="mt-2 text-primary font-semibold">{t('dailyQuizComplete')}</div>
        )}
      </div>

      <div className="text-sm font-semibold text-muted mb-3">{t('detailedReview')}</div>

      {questions.map((q, i) => {
        const userAns = userAnswers[i];
        const isCorrect = userAns === q.answer;
        const verseRef = q.ref || q.reference || '';

        return (
          <div
            key={i}
            className={`bg-card rounded-lg p-4 mb-3 border-l-4 ${
              isCorrect ? 'border-success' : 'border-error'
            }`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-sm text-primary">
                {t('question')} {i + 1}
              </span>
              <span
                className={`text-sm font-semibold ${
                  isCorrect ? 'text-success' : 'text-error'
                }`}
              >
                {isCorrect ? t('correct') : t('incorrect')}
              </span>
            </div>

            <div className="text-base font-medium mb-2.5">{q.question}</div>

            <div className="flex flex-col gap-1.5">
              {q.options.map((opt, optIdx) => {
                let optClass = 'opt-review';
                let checkMark = '';
                if (userAns === optIdx && isCorrect) {
                  optClass += ' player-correct';
                  checkMark = '✅';
                } else if (userAns === optIdx && !isCorrect) {
                  optClass += ' player-wrong';
                  checkMark = '❌';
                } else if (optIdx === q.answer) {
                  optClass += ' correct-answer';
                  checkMark = '✔';
                }
                return (
                  <div key={optIdx} className={optClass}>
                    <span className="font-bold text-muted min-w-[22px]">{letters[optIdx]}.</span>
                    <span className="flex-1">{opt}</span>
                    <span className="ml-auto">{checkMark}</span>
                  </div>
                );
              })}
            </div>

            {userAns === -1 && (
              <div className="text-error text-sm mt-1.5">{t('timeoutNote')}</div>
            )}

            <div
              className="mt-3 pt-2.5 border-t border-[#2a2a2a] text-sm text-primary font-medium cursor-pointer underline text-right"
              onClick={() => goToVerse(verseRef)}
            >
              📖 {verseRef || t('referenceUnavailable')}
            </div>
          </div>
        );
      })}

      <div className="flex gap-3 flex-wrap mt-5">
        <button className="btn flex-1 min-w-[120px]" onClick={redoQuiz}>
          {t('redoQuiz')}
        </button>
        <button
          className="btn-secondary flex-1 min-w-[120px]"
          onClick={() => navigate('/home')}
        >
          {t('goHome')}
        </button>
      </div>
    </div>
  );
}
