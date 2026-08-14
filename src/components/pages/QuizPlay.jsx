import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useSound } from '../../hooks/useSound';
import { fetchQuizData, fetchAllQuizQuestions } from '../../lib/api';
import { shuffle } from '../../lib/utils';

export default function QuizPlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const { book, daily } = location.state || {};

  const settings = useStore((s) => s.settings);
  const timerDuration = settings.quiz.timer || 30;
  const questionsPerBook = settings.quiz.questionsPerBook || 10;
  const soundEffectsEnabled = settings.sound.soundEffects !== false;

  const { playEffect } = useSound();

  const allQuizQuestions = useStore((s) => s.allQuizQuestions || []);
  const addQuizResult = useStore((s) => s.addQuizResult);
  const addDailyQuizResult = useStore((s) => s.addDailyQuizResult);
  const markQuestionsPlayed = useStore((s) => s.markQuestionsPlayed);
  const playedQuestions = useStore((s) => s.playedQuestions || []);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(timerDuration);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDaily, setIsDaily] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const timerRef = useRef(null);
  const questionFinishedRef = useRef(false);
  const questionSetRef = useRef([]); // store the full question set for results

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      setError(null);
      let qs = [];
      let refs = [];

      if (daily) {
        let allQ = allQuizQuestions;
        if (allQ.length === 0) allQ = await fetchAllQuizQuestions();
        const available = allQ.filter(q => !playedQuestions.includes(q.ref));
        const selected = available.length >= 15 ? shuffle(available).slice(0, 15) : shuffle(allQ).slice(0, 15);
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
      questionSetRef.current = qs;
      setUserAnswers(new Array(qs.length).fill(null));
      setCurrentIndex(0);
      setScore(0);
      setTimer(timerDuration);
      questionFinishedRef.current = false;
      setIsLoading(false);
    };

    loadQuestions();
    return () => clearInterval(timerRef.current);
  }, [book, daily, allQuizQuestions, timerDuration, questionsPerBook]);

  useEffect(() => {
    if (isLoading || questions.length === 0) return;
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
  }, [currentIndex, isLoading, questions, timerDuration]);

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
      setScore(prev => prev + 1);
      if (soundEffectsEnabled) playEffect('correct');
    } else {
      if (soundEffectsEnabled) playEffect('wrong');
    }

    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        questionFinishedRef.current = false;
        setTimer(timerDuration);
      }, 500);
    } else {
      // Quiz finished – save results and navigate
      const finalScore = score + (isCorrect ? 1 : 0);
      // Save to store
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
        // handle global separately if needed
      } else {
        addQuizResult(result);
      }

      if (soundEffectsEnabled) playEffect('gameover');

      navigate('/results', {
        state: {
          questions: questionSetRef.current,
          userAnswers: newUserAnswers,
          score: finalScore,
          isDaily,
          book,
        }
      });
    }
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

  // ─── Active Quiz ──────────────────────────────────────────────
  const q = questions[currentIndex];
  const total = questions.length;
  const questionNum = currentIndex + 1;
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div>
      <div className="quiz-header flex justify-between items-center mb-5 font-bold flex-wrap gap-2">
        <div>
          {isDaily ? '  ' : ''}{book ? `  ${book}` : 'Quiz'} Question {questionNum}/{total}
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