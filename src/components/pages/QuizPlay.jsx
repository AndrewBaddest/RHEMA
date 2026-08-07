import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useSound } from '../../hooks/useSound';
import { fetchQuizData, fetchAllQuizQuestions } from '../../lib/api';
import { shuffle, getFullName } from '../../lib/utils';

export default function QuizPlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const { book, daily } = location.state || {};

  // ── Settings ────────────────────────────────────────────────────
  const settings = useStore((s) => s.settings);
  const timerDuration = settings.quiz.timer || 30;
  const questionsPerBook = settings.quiz.questionsPerBook || 10;
  const soundEffectsEnabled = settings.sound.soundEffects !== false;
  // We no longer need bgMusicEnabled here because music is started globally

  // ── Sound ──────────────────────────────────────────────────────
  const { playEffect, pauseBackground } = useSound();

  // ── Store data ─────────────────────────────────────────────────
  const allQuizQuestions = useStore((s) => s.allQuizQuestions || []);
  const addQuizResult = useStore((s) => s.addQuizResult);
  const addDailyQuizResult = useStore((s) => s.addDailyQuizResult);
  const markQuestionsPlayed = useStore((s) => s.markQuestionsPlayed);
  const playedQuestions = useStore((s) => s.playedQuestions || []);

  // ── Local state ──────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(timerDuration);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDaily, setIsDaily] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const timerRef = useRef(null);
  const questionFinishedRef = useRef(false);

  // ── Load questions ─────────────────────────────────────────────
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      setError(null);
      let qs = [];
      let refs = [];

      if (daily) {
        let allQ = allQuizQuestions;
        if (allQ.length === 0) {
          allQ = await fetchAllQuizQuestions();
        }
        const available = allQ.filter(q => !playedQuestions.includes(q.ref));
        const selected = available.length >= 15
          ? shuffle(available).slice(0, 15)
          : shuffle(allQ).slice(0, 15);
        qs = selected;
        refs = selected.map(q => q.ref);
        setIsDaily(true);
      } else if (book) {
        try {
          const data = await fetchQuizData(book);
          if (!data || data.length === 0) {
            setError(`📚 "${book}" coming soon!`);
            setIsLoading(false);
            return;
          }
          const count = Math.min(questionsPerBook, data.length);
          const selected = shuffle(data).slice(0, count);
          qs = selected;
          refs = selected.map(q => q.ref);
        } catch (err) {
          setError(`📚 "${book}" coming soon!`);
          setIsLoading(false);
          return;
        }
      } else {
        let allQ = allQuizQuestions;
        if (allQ.length === 0) allQ = await fetchAllQuizQuestions();
        const selected = shuffle(allQ).slice(0, 10);
        qs = selected;
        refs = selected.map(q => q.ref);
      }

      if (qs.length === 0 && !error) {
        setError('No questions available. Please try again later.');
        setIsLoading(false);
        return;
      }

      setQuestions(qs);
      setUserAnswers(new Array(qs.length).fill(null));
      setCurrentIndex(0);
      setScore(0);
      setTimer(timerDuration);
      setIsFinished(false);
      questionFinishedRef.current = false;
      setIsLoading(false);

      // No need to start background music here – it's already playing globally
    };

    loadQuestions();

    return () => {
      clearInterval(timerRef.current);
    };
  }, [book, daily, allQuizQuestions, timerDuration, questionsPerBook]);

  // ── Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || isFinished || questions.length === 0) return;
    clearInterval(timerRef.current);
    setTimer(timerDuration);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!questionFinishedRef.current) {
            handleNextQuestion();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, isLoading, isFinished, questions, timerDuration]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelectOption = (index) => {
    if (questionFinishedRef.current) return;
    setSelectedOption(index);
  };

  const handleNextQuestion = () => {
    if (questionFinishedRef.current) return;
    questionFinishedRef.current = true;
    clearInterval(timerRef.current);

    const q = questions[currentIndex];
    const isCorrect = selectedOption === q.answer;
    const userAnswer = selectedOption !== null ? selectedOption : -1;
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentIndex] = userAnswer;
    setUserAnswers(newUserAnswers);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      if (soundEffectsEnabled) playEffect('correct');
    } else {
      if (soundEffectsEnabled) playEffect('wrong');
    }

    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
        questionFinishedRef.current = false;
        setTimer(timerDuration);
      }, 500);
    } else {
      setIsFinished(true);
      // We don't pause background music here – let it continue
      if (soundEffectsEnabled) playEffect('gameover');
      const finalScore = score + (isCorrect ? 1 : 0);
      saveResults(finalScore, newUserAnswers);
    }
  };

  const saveResults = (finalScore, answers) => {
    const refs = questions.map(q => q.ref);
    markQuestionsPlayed(refs);
    const result = {
      book: book || (daily ? 'Daily Quiz' : 'Mixed'),
      score: finalScore,
      total: questions.length,
      date: new Date().toISOString(),
    };
    if (isDaily) {
      addDailyQuizResult(result);
    } else if (isGlobal) {
      // handled elsewhere
    } else {
      addQuizResult(result);
    }
  };

  const goToVerse = (ref) => {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) return;
    const bookName = match[1].trim();
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    const fullBook = getFullName(bookName);
    if (fullBook) {
      navigate('/reader', { state: { book: fullBook, chapter, verse } });
    }
  };

  const redoQuiz = () => {
    setCurrentIndex(0);
    setScore(0);
    setUserAnswers(new Array(questions.length).fill(null));
    setIsFinished(false);
    questionFinishedRef.current = false;
    setTimer(timerDuration);
    setSelectedOption(null);
    // No need to restart background music – it's already playing
  };

  // ── Render states ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-error text-lg">{error}</p>
        <button className="btn mt-4" onClick={() => navigate('/home')}>Go Home</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner"></div>
        <p className="text-muted mt-4">Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0 && !error) {
    return (
      <div className="text-center py-10">
        <p className="text-muted">No questions available for this book.</p>
        <button className="btn mt-4" onClick={() => navigate('/home')}>Go Home</button>
      </div>
    );
  }

  // ─── Results ──────────────────────────────────────────────────
  if (isFinished) {
    const total = questions.length;
    const correct = score;
    const percent = Math.round((correct / total) * 100);
    let emoji = '';
    let message = '';
    if (percent === 100) { emoji = '🌟'; message = 'Perfect! Divine wisdom!'; }
    else if (percent >= 70) { emoji = '👏'; message = 'Great job! You know the Word!'; }
    else if (percent >= 40) { emoji = '📖'; message = 'Good effort! Keep reading!'; }
    else { emoji = '💪'; message = 'Keep studying the Word!'; }

    return (
      <div className="bg-surface rounded-xl p-4 border border-primary">
        <div className="text-center mb-5 pb-4 border-b border-primary/20">
          <div className="text-4xl">{emoji}</div>
          <div className="text-5xl font-bold text-primary">{correct}/{total}</div>
          <div className="text-lg mt-1">{message}</div>
          {isDaily && <div className="mt-2 text-primary font-semibold">📅 Daily Quiz Complete!</div>}
        </div>

        <div className="text-sm font-semibold text-muted mb-3">📋 Detailed Review</div>

        {questions.map((q, i) => {
          const userAns = userAnswers[i];
          const isCorrect = userAns === q.answer;
          const letters = ['A', 'B', 'C', 'D'];
          return (
            <div key={i} className={`bg-card rounded-lg p-4 mb-3 border-l-4 ${isCorrect ? 'border-success' : 'border-error'}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-sm text-primary">Question {i+1}</span>
                <span className={`text-sm font-semibold ${isCorrect ? 'text-success' : 'text-error'}`}>
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
                    <div key={optIdx} className={`${optClass} flex items-center gap-2 p-2 rounded border border-[#333] bg-[#121212]`}>
                      <span className="font-bold text-muted min-w-[22px]">{letters[optIdx]}.</span>
                      <span className="flex-1">{opt}</span>
                      <span className="ml-auto">{checkMark}</span>
                    </div>
                  );
                })}
              </div>
              {userAns === -1 && (
                <div className="text-error text-sm mt-1.5">⏱️ You did not answer this question in time.</div>
              )}
              <div
                className="mt-3 pt-2.5 border-t border-[#2a2a2a] text-sm text-primary font-medium cursor-pointer underline text-right"
                onClick={() => goToVerse(q.ref)}
              >
                📖 {q.ref}
              </div>
            </div>
          );
        })}

        <div className="flex gap-3 flex-wrap mt-5">
          <button className="btn flex-1 min-w-[120px]" onClick={redoQuiz}>Redo Quiz</button>
          <button className="btn-secondary flex-1 min-w-[120px]" onClick={() => navigate('/home')}>Go Home</button>
        </div>
      </div>
    );
  }

  // ─── Active Quiz ──────────────────────────────────────────────
  const q = questions[currentIndex];
  const total = questions.length;
  const questionNum = currentIndex + 1;
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div>
      <div className="quiz-header flex justify-between items-center mb-5 font-bold flex-wrap gap-2">
        <div>
          {isDaily ? '📅 ' : ''}{book ? `📖 ${book}` : 'Quiz'} Question {questionNum}/{total}
        </div>
        <div className="timer text-primary text-xl bg-[#2a2205] px-3 py-1 rounded-full border border-primary">
          {timer}s
        </div>
        <button className="quit-btn" onClick={() => navigate('/home')}>
          ✕ Quit
        </button>
      </div>

      <div className="question-box bg-surface p-5 rounded-xl border-l-4 border-primary mb-5 text-lg leading-relaxed">
        {q.question}
      </div>

      <div className="options-list flex flex-col gap-3">
        {q.options.map((opt, i) => {
          const isSelected = selectedOption === i;
          return (
            <button
              key={i}
              className={`option-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectOption(i)}
              disabled={questionFinishedRef.current}
            >
              {letters[i]}. {opt}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-3">
        <span className="text-sm text-muted" id="feedback-message"></span>
      </div>

      <button
        className="btn mt-3"
        disabled={selectedOption === null || questionFinishedRef.current}
        onClick={handleNextQuestion}
      >
        {currentIndex < total - 1 ? 'Next Question' : 'Submit Quiz'}
      </button>
    </div>
  );
}