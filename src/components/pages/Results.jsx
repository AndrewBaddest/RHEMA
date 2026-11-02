import { useLocation, useNavigate } from 'react-router-dom';
import { getFullName, cleanBookName } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext'; // 👈 Added

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, userAnswers, score, isDaily, book } = location.state || {};
  const { t } = useLanguage(); // 👈 Added

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

    let m = trimmed.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (m) {
      const fullBook = getFullName(cleanBookName(m[1].trim()));
      if (!fullBook) return;
      navigate('/reader', {
        state: { book: fullBook, chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10), fromResults: true },
      });
      return;
    }

    m = trimmed.match(/^(.+?)\s+(\d+)$/);
    if (m) {
      const fullBook = getFullName(cleanBookName(m[1].trim()));
      if (!fullBook) return;
      navigate('/reader', {
        state: { book: fullBook, chapter: parseInt(m[2], 10), verse: 1, fromResults: true },
      });
      return;
    }
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