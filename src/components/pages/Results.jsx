import { useLocation, useNavigate } from 'react-router-dom';
import { getFullName, cleanBookName } from '../../lib/utils';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, userAnswers, score, isDaily, book } = location.state || {};

  if (!questions || !userAnswers) {
    navigate('/home');
    return null;
  }

  const total = questions.length;
  const correct = score;
  const percent = Math.round((correct / total) * 100);
  let emoji = '';
  let message = '';
  if (percent === 100) { emoji = ' '; message = 'Perfect! Divine wisdom!'; }
  else if (percent >= 70) { emoji = ' '; message = 'Great job! You know the Word!'; }
  else if (percent >= 40) { emoji = ' '; message = 'Good effort! Keep reading!'; }
  else { emoji = ' '; message = 'Keep studying the Word!'; }

  const goToVerse = (ref) => {
    if (!ref) return;
    const trimmed = String(ref).trim();
    console.log('🔍 goToVerse called with ref:', trimmed);

    // Case 1: "Book C:V"
    let m = trimmed.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (m) {
      const fullBook = getFullName(cleanBookName(m[1].trim()));
      if (!fullBook) {
        console.warn('📖 Book not recognized:', m[1]);
        return;
      }
      navigate('/reader', {
        state: {
          book: fullBook,
          chapter: parseInt(m[2], 10),
          verse: parseInt(m[3], 10),
          fromResults: true,
        },
      });
      return;
    }

    // Case 2: "Book C" (chapter only, default to verse 1)
    m = trimmed.match(/^(.+?)\s+(\d+)$/);
    if (m) {
      const fullBook = getFullName(cleanBookName(m[1].trim()));
      if (!fullBook) {
        console.warn('📖 Book not recognized:', m[1]);
        return;
      }
      navigate('/reader', {
        state: {
          book: fullBook,
          chapter: parseInt(m[2], 10),
          verse: 1,
          fromResults: true,
        },
      });
      return;
    }

    console.warn('⚠️ Failed to parse ref:', trimmed);
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
          <div className="mt-2 text-primary font-semibold">  Daily Quiz Complete!</div>
        )}
      </div>

      <div className="text-sm font-semibold text-muted mb-3">  Detailed Review</div>

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
              <span className="font-bold text-sm text-primary">Question {i + 1}</span>
              <span
                className={`text-sm font-semibold ${
                  isCorrect ? 'text-success' : 'text-error'
                }`}
              >
                {isCorrect ? '✅ Correct' : '❌ Incorrect'}
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
                    <span className="font-bold text-muted min-w-[22px]">
                      {letters[optIdx]}.
                    </span>
                    <span className="flex-1">{opt}</span>
                    <span className="ml-auto">{checkMark}</span>
                  </div>
                );
              })}
            </div>

            {userAns === -1 && (
              <div className="text-error text-sm mt-1.5">
                  You did not answer this question in time.
              </div>
            )}

            <div
              className="mt-3 pt-2.5 border-t border-[#2a2a2a] text-sm text-primary font-medium cursor-pointer underline text-right"
              onClick={() => goToVerse(verseRef)}
            >
              📖 {verseRef || 'Reference unavailable'}
            </div>
          </div>
        );
      })}

      <div className="flex gap-3 flex-wrap mt-5">
        <button className="btn flex-1 min-w-[120px]" onClick={redoQuiz}>
          Redo Quiz
        </button>
        <button
          className="btn-secondary flex-1 min-w-[120px]"
          onClick={() => navigate('/home')}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}