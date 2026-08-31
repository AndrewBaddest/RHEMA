import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuth } from '../../context/AuthContext';
import { useSubmitChallengeScore } from '../../hooks/useSubmitChallengeScore';

// --- Generate quiz questions with unique Bible books (for global challenge & multiplayer) ---
const generateGlobalQuizQuestions = (count) => {
  const books = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
    'James', '1 Peter', '2 Peter', '1 John', '2 John',
    '3 John', 'Jude', 'Revelation'
  ];
  const shuffled = [...books].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((book, idx) => ({
    id: idx,
    book,
    question: `Sample question from ${book}?`,
    options: ['A', 'B', 'C', 'D'],
    correct: Math.floor(Math.random() * 4),
  }));
};

export default function Challenge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scores, refetch: refetchLeaderboard } = useLeaderboard();
  const submitScore = useSubmitChallengeScore();

  // ─── Global Challenge Timer ──────────────────────────────────
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [status, setStatus] = useState('waiting');

  // GLOBAL CHALLENGE states
  const [globalChallengeStatus, setGlobalChallengeStatus] = useState('idle');
  const [globalCountdown, setGlobalCountdown] = useState(10);
  const [globalParticipants, setGlobalParticipants] = useState([]);
  const [globalQuizQuestions, setGlobalQuizQuestions] = useState([]);
  const [globalCurrentQuestionIndex, setGlobalCurrentQuestionIndex] = useState(0);
  const [globalPlayerAnswers, setGlobalPlayerAnswers] = useState([]);
  const [globalQuizResults, setGlobalQuizResults] = useState(null);
  const [showGlobalPopup, setShowGlobalPopup] = useState(false);
  const [globalQuestionTimer, setGlobalQuestionTimer] = useState(30);

  // ─── Helper: get next Sunday 9:00 PM EAT ────────────────────
  const getNextSunday9pmEAT = () => {
    const now = new Date();
    const eatOffset = 3;
    const eatNow = new Date(now.getTime() + eatOffset * 60 * 60 * 1000);
    const day = eatNow.getUTCDay();
    const hours = eatNow.getUTCHours();
    const minutes = eatNow.getUTCMinutes();

    let target = new Date(eatNow);
    if (day === 0 && (hours < 21 || (hours === 21 && minutes === 0))) {
      target.setUTCHours(21, 0, 0, 0);
    } else {
      let daysUntilSunday = (7 - day) % 7;
      if (daysUntilSunday === 0) daysUntilSunday = 7;
      target.setUTCDate(target.getUTCDate() + daysUntilSunday);
      target.setUTCHours(21, 0, 0, 0);
    }
    return target;
  };

  // ─── Update timer ────────────────────────────────────────────
  const updateTimer = () => {
    const now = new Date();
    const eatOffset = 3;
    const eatNow = new Date(now.getTime() + eatOffset * 60 * 60 * 1000);
    const day = eatNow.getUTCDay();
    const hours = eatNow.getUTCHours();
    const minutes = eatNow.getUTCMinutes();

    const isSunday = day === 0;
    const isLive = isSunday && hours === 21 && minutes < 30;
    const isAfter = isSunday && (hours > 21 || (hours === 21 && minutes >= 30));

    const nextSunday = getNextSunday9pmEAT();
    const diffMs = nextSunday.getTime() - eatNow.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    // GLOBAL CHALLENGE: 10‑second window
    if (diffSec <= 10 && diffSec > 0 && isSunday && hours === 20 && minutes === 59) {
      setGlobalCountdown(diffSec);
      setGlobalChallengeStatus('countdown');
      setShowGlobalPopup(true);
    } else if (diffSec === 0 && globalChallengeStatus === 'countdown') {
      startGlobalQuiz();
    }

    // Normal timer update
    if (isLive) {
      const elapsed = (eatNow.getTime() - new Date(eatNow).setUTCHours(21, 0, 0, 0)) / 1000;
      const remaining = 1800 - elapsed;
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        setTimeLeft({ days: 0, hours: 0, minutes: mins, seconds: secs });
        setStatus('live');
        return;
      }
    }

    if (isAfter || !isSunday) {
      if (diffMs > 0) {
        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hoursRem = Math.floor((totalSeconds % 86400) / 3600);
        const minutesRem = Math.floor((totalSeconds % 3600) / 60);
        const secondsRem = totalSeconds % 60;
        setTimeLeft({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
        setStatus('waiting');
      } else {
        const nextNext = new Date(nextSunday);
        nextNext.setUTCDate(nextNext.getUTCDate() + 7);
        const diff2 = nextNext.getTime() - eatNow.getTime();
        const totalSeconds = Math.floor(diff2 / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hoursRem = Math.floor((totalSeconds % 86400) / 3600);
        const minutesRem = Math.floor((totalSeconds % 3600) / 60);
        const secondsRem = totalSeconds % 60;
        setTimeLeft({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
        setStatus('waiting');
      }
    }
  };

  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Multiplayer State (1v1 Duel only) ──────────────────────
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [opponentId, setOpponentId] = useState(''); // single opponent ID
  const [questionCount, setQuestionCount] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [multiplayerStatus, setMultiplayerStatus] = useState('idle');
  const [notification, setNotification] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerAnswers, setPlayerAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [allParticipants, setAllParticipants] = useState([]);

  // Mock online users – replace with real socket data
  const mockOnlineUsers = [
    { id: 'player1', name: 'Alex 2020' },
    { id: 'player2', name: 'Jordan 3344' },
    { id: 'player3', name: 'Taylor 5566' },
    { id: 'player4', name: 'Morgan 7788' },
  ];

  const isPlayerOnline = (playerId) => {
    return mockOnlineUsers.some(u => u.id === playerId);
  };

  // ─── Multiplayer Functions (1v1) ────────────────────────────
  const handleStartMultiplayer = () => {
    if (!opponentId.trim()) {
      alert('Please enter your opponent\'s ID.');
      return;
    }
    if (!isPlayerOnline(opponentId.trim())) {
      setNotification({
        message: `Player "${opponentId.trim()}" is currently unavailable for a challenge.`,
        type: 'error',
        actions: [{ label: 'Close', onClick: () => setNotification(null) }]
      });
      return;
    }

    // Store participant list (host + opponent)
    const host = { id: user.id, name: user.display_name || user.email };
    const opponent = { id: opponentId.trim(), name: opponentId.trim() };
    setAllParticipants([host, opponent]);

    setMultiplayerStatus('challengeSent');
    // Simulate acceptance after 2 sec (replace with socket responses)
    setTimeout(() => {
      startCountdown();
    }, 2000);
  };

  const startCountdown = () => {
    setMultiplayerStatus('countdown');
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          startQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startQuiz = () => {
    const questions = generateGlobalQuizQuestions(questionCount);
    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setPlayerAnswers({});
    setMultiplayerStatus('quiz');
  };

  const handleAnswer = (playerId, answerIndex) => {
    setPlayerAnswers(prev => ({ ...prev, [playerId]: answerIndex }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    // Mock results – replace with real scores from server
    const results = allParticipants.map(player => {
      const correct = Math.floor(Math.random() * quizQuestions.length);
      return { ...player, score: correct, total: quizQuestions.length };
    });
    setQuizResults(results);
    setMultiplayerStatus('results');
    refetchLeaderboard();
  };

  const resetMultiplayer = () => {
    setIsMultiplayerModalOpen(false);
    setOpponentId('');
    setMultiplayerStatus('idle');
    setNotification(null);
    setQuizResults(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setPlayerAnswers({});
    setAllParticipants([]);
  };

  // ─── GLOBAL CHALLENGE: Start the quiz for all participants ──
  const startGlobalQuiz = () => {
    if (globalChallengeStatus === 'playing') return;
    const questions = generateGlobalQuizQuestions(30);
    setGlobalQuizQuestions(questions);
    setGlobalCurrentQuestionIndex(0);
    setGlobalPlayerAnswers([]);
    setGlobalChallengeStatus('playing');
    setShowGlobalPopup(false);
    setGlobalQuestionTimer(30);
    startGlobalQuestionTimer();
  };

  let globalQuestionInterval = null;

  const startGlobalQuestionTimer = () => {
    let timeLeft = 30;
    globalQuestionInterval = setInterval(() => {
      timeLeft -= 1;
      setGlobalQuestionTimer(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(globalQuestionInterval);
        handleGlobalNextQuestion();
      }
    }, 1000);
  };

  const handleGlobalAnswer = (questionIndex, answerIndex) => {
    const updated = [...globalPlayerAnswers];
    updated[questionIndex] = answerIndex;
    setGlobalPlayerAnswers(updated);
    clearInterval(globalQuestionInterval);
    setTimeout(() => handleGlobalNextQuestion(), 300);
  };

  const handleGlobalNextQuestion = () => {
    if (globalCurrentQuestionIndex < globalQuizQuestions.length - 1) {
      setGlobalCurrentQuestionIndex(prev => prev + 1);
      setGlobalQuestionTimer(30);
      startGlobalQuestionTimer();
    } else {
      finishGlobalQuiz();
    }
  };

  const finishGlobalQuiz = () => {
    clearInterval(globalQuestionInterval);
    const results = globalParticipants.map(participant => {
      const correct = Math.floor(Math.random() * 30);
      return { ...participant, score: correct, total: 30 };
    });
    setGlobalQuizResults(results);
    setGlobalChallengeStatus('finished');

    results.forEach(p => {
      if (user && p.id === user.id) {
        submitScore.mutate({ userId: user.id, score: p.score });
      }
    });
    setTimeout(() => refetchLeaderboard(), 1000);
  };

  const joinGlobalChallenge = () => {
    if (!user) {
      alert('Please sign in to join the Global Challenge.');
      return;
    }
    setGlobalParticipants(prev => {
      if (!prev.find(p => p.id === user.id)) {
        return [...prev, { id: user.id, name: user.display_name || user.email }];
      }
      return prev;
    });
    setGlobalChallengeStatus('joining');
  };

  // ─── LEADERBOARD: compute user rank ─────────────────────────
  const topScores = scores.slice(0, 10);
  const getTrophy = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  let userRank = null;
  let userScore = null;
  if (user) {
    const foundIndex = scores.findIndex(s => {
      const userId = s.userId || s.users?.id;
      return userId === user.id;
    });
    if (foundIndex !== -1) {
      userRank = foundIndex + 1;
      userScore = scores[foundIndex].score;
    }
  }
  const showUserRow = user && userRank !== null && userRank > 10;

  // ─── Render ──────────────────────────────────────────────────
  const { days, hours, minutes, seconds } = timeLeft;
  const isLive = status === 'live';
  const isWaiting = status === 'waiting';

  return (
    <div className="py-4 text-center">
      <h2 className="text-primary text-2xl font-bold mb-4">  Global Challenge</h2>

      <div className="bg-surface rounded-xl p-8 border border-[#2a2a2a] max-w-md mx-auto">
        {/* --- Multiplayer Button --- */}
        <button
          onClick={() => setIsMultiplayerModalOpen(true)}
          className="mb-4 btn w-full"
        >
            Multiplayer (1v1 Duel)
        </button>

        {/* --- Timer Display --- */}
        <div className="mb-4">
          {isLive ? (
            <>
              <div className="text-4xl font-bold text-success">  LIVE NOW</div>
              <div className="text-3xl font-mono text-primary mt-2">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted">remaining in this week's challenge</div>
            </>
          ) : isWaiting ? (
            <>
              <div className="text-3xl font-mono text-primary">
                {days > 0 && `${days}d `}
                {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted mt-1">until the next Global Challenge</div>
              <div className="text-xs text-muted mt-1">Every Sunday at 9:00 PM EAT</div>
            </>
          ) : (
            <div className="text-3xl font-mono text-muted">  Next challenge coming soon</div>
          )}
        </div>

        {/* --- LEADERBOARD: Styled like the progress page --- */}
        <div className="mt-6">
          <h3 className="text-primary text-lg font-semibold mb-2">  Global Challenge Leaderboard</h3>
          <div className="bg-surface border border-[#2a2a2a] rounded-xl overflow-hidden">
            {scores.length === 0 ? (
              <div className="p-4 text-muted text-center">No global challenge data yet.</div>
            ) : (
              <div className="p-3 max-h-60 overflow-y-auto">
                {/* Header row */}
                <div className="flex justify-between text-xs text-muted border-b border-[#2a2a2a] pb-1 mb-1">
                  <span>Rank</span>
                  <span>Score</span>
                </div>
                {/* Top 10 */}
                {topScores.map((s, idx) => {
                  const userId = s.userId || s.users?.id;
                  const isCurrentUser = user && userId === user.id;
                  return (
                    <div
                      key={idx}
                      className={`flex justify-between py-1 border-b border-[#2a2a2a] text-sm ${
                        isCurrentUser ? 'bg-primary/10 border-primary/30' : ''
                      }`}
                    >
                      <span>
                        <span className="inline-block w-6 text-right mr-2">{idx + 1}.</span>
                        {getTrophy(idx) && <span className="mr-1">{getTrophy(idx)}</span>}
                        {isCurrentUser ? (
                          <span className="text-primary font-bold">You</span>
                        ) : (
                          s.users?.display_name || 'Anonymous'
                        )}
                      </span>
                      <span className="text-primary font-bold">{s.score}</span>
                    </div>
                  );
                })}
                {/* 11th row – user's own position if outside top 10 */}
                {showUserRow && (
                  <div className="flex justify-between py-1 border-b border-[#2a2a2a] text-sm bg-primary/20">
                    <span>
                      <span className="inline-block w-6 text-right mr-2">{userRank}.</span>
                      <span className="text-primary font-bold">You</span>
                      <span className="text-muted text-xs ml-1">(your position)</span>
                    </span>
                    <span className="text-primary font-bold">{userScore}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 
          --- Manual submit removed – scores are auto-submitted at quiz end ---
        */}
      </div>

      <button
        className="mt-6 btn-secondary !w-auto px-6"
        onClick={() => navigate('/home')}
      >
        ← Back to Home
      </button>

      {/* ─── Multiplayer Modal (1v1 Duel) ────────────────────── */}
      {isMultiplayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#2a2a2a]">
            <h3 className="text-xl font-bold text-primary mb-1"> Duel Quiz</h3>
            <p className="text-sm text-muted mb-4">Challenge a friend to a 1v1 match</p>

            {multiplayerStatus === 'idle' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-muted mb-1">Opponent ID</label>
                  <input
                    type="text"
                    value={opponentId}
                    onChange={(e) => setOpponentId(e.target.value)}
                    placeholder="Enter opponent's ID (e.g., Noah 1016)"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-muted mt-1">
                    Enter the unique ID of the friend you want to duel.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-muted mb-1">Questions</label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Timer per Q</label>
                    <select
                      value={timerSeconds}
                      onChange={(e) => setTimerSeconds(Number(e.target.value))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value={15}>15 sec</option>
                      <option value={30}>30 sec</option>
                      <option value={60}>60 sec</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleStartMultiplayer}
                    className="btn flex-1"
                    disabled={!opponentId.trim()}
                  >
                    Start Duel
                  </button>
                  <button onClick={resetMultiplayer} className="btn-secondary flex-1">Cancel</button>
                </div>
              </>
            )}

            {multiplayerStatus === 'challengeSent' && (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-text">Sending challenge request to {opponentId}...</p>
              </div>
            )}

            {multiplayerStatus === 'countdown' && (
              <div className="text-center py-8">
                <div className="text-6xl font-bold text-primary">{countdown}</div>
                <p className="text-muted mt-2">Get ready for the duel!</p>
              </div>
            )}

            {multiplayerStatus === 'quiz' && quizQuestions.length > 0 && (
              <div>
                <div className="flex justify-between text-sm text-muted mb-2">
                  <span>Question {currentQuestionIndex + 1}/{quizQuestions.length}</span>
                  <span>⏱️ {timerSeconds}s</span>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                  <p className="text-text font-medium">{quizQuestions[currentQuestionIndex].question}</p>
                  <p className="text-xs text-muted mt-1">From {quizQuestions[currentQuestionIndex].book}</p>
                </div>
                <div className="space-y-2">
                  {quizQuestions[currentQuestionIndex].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(user.id, idx)} // Host answers using their own ID
                      className="w-full text-left bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm transition"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <button onClick={handleNextQuestion} className="mt-4 btn w-full">
                  {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question' : 'See Results'}
                </button>
              </div>
            )}

            {multiplayerStatus === 'results' && quizResults && (
              <div>
                <h4 className="text-lg font-bold text-primary mb-3">🏁 Duel Results</h4>
                <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                  {quizResults.map((r, idx) => (
                    <div key={idx} className="flex justify-between border-b border-[#2a2a2a] py-1">
                      <span>{r.name}</span>
                      <span className="text-primary font-bold">{r.score}/{r.total}</span>
                    </div>
                  ))}
                </div>
                <button onClick={resetMultiplayer} className="mt-4 btn w-full">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Notification Popup ────────────────────────────────── */}
      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-sm w-full border border-[#2a2a2a] text-center">
            <p className="text-text mb-4">{notification.message}</p>
            <div className="flex gap-3 justify-center">
              {notification.actions.map((action, i) => (
                <button key={i} onClick={action.onClick} className="btn !w-auto px-6">
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── GLOBAL CHALLENGE: 10‑Second Countdown Popup ────── */}
      {showGlobalPopup && globalChallengeStatus === 'countdown' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-8 max-w-sm w-full text-center border border-primary/50">
            <h3 className="text-2xl font-bold text-primary mb-2">  Global Challenge begins in</h3>
            <div className="text-7xl font-mono text-primary my-4">{globalCountdown}</div>
            <p className="text-muted text-sm mb-6">seconds</p>
            {!globalParticipants.find(p => p.id === user?.id) ? (
              <button
                onClick={joinGlobalChallenge}
                className="btn w-full text-lg py-3"
              >
                Join Now
              </button>
            ) : (
              <p className="text-success font-medium">  You have joined!</p>
            )}
            <p className="text-xs text-muted mt-4">Quiz starts at 9:00 PM EAT sharp</p>
          </div>
        </div>
      )}

      {/* ─── GLOBAL CHALLENGE: Quiz in progress ──────────────── */}
      {globalChallengeStatus === 'playing' && globalQuizQuestions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#2a2a2a]">
            <div className="flex justify-between text-sm text-muted mb-2">
              <span>Global Challenge – Question {globalCurrentQuestionIndex + 1}/{globalQuizQuestions.length}</span>
              <span>  {globalQuestionTimer}s</span>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
              <p className="text-text font-medium">{globalQuizQuestions[globalCurrentQuestionIndex].question}</p>
              <p className="text-xs text-muted mt-1">From {globalQuizQuestions[globalCurrentQuestionIndex].book}</p>
            </div>
            <div className="space-y-2">
              {globalQuizQuestions[globalCurrentQuestionIndex].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGlobalAnswer(globalCurrentQuestionIndex, idx)}
                  className="w-full text-left bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm transition"
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted text-center">
              {globalParticipants.length} player(s) participating
            </div>
          </div>
        </div>
      )}

      {/* ─── GLOBAL CHALLENGE: Results ────────────────────────── */}
      {globalChallengeStatus === 'finished' && globalQuizResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#2a2a2a]">
            <h4 className="text-2xl font-bold text-primary text-center mb-4">🏁 Global Challenge Results</h4>
            <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
              {globalQuizResults
                .sort((a, b) => b.score - a.score)
                .map((r, idx) => (
                  <div key={idx} className="flex justify-between border-b border-[#2a2a2a] py-1">
                    <span>
                      {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'}
                      {r.name}
                    </span>
                    <span className="text-primary font-bold">{r.score}/{r.total}</span>
                  </div>
                ))}
            </div>
            <button
              onClick={() => {
                setGlobalChallengeStatus('idle');
                setShowGlobalPopup(false);
                setGlobalQuizResults(null);
                setGlobalQuizQuestions([]);
                setGlobalParticipants([]);
                refetchLeaderboard();
              }}
              className="mt-4 btn w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}