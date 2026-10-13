import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuth } from '../../context/AuthContext';
import { useSubmitChallengeScore } from '../../hooks/useSubmitChallengeScore';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import SignInPrompt from '../shared/SignInPrompt';
import { supabase } from '../../lib/supabase';
import { fetchGlobalChallengeQuestionsFromDB } from '../../lib/api';

// ─── Fallback generator ───────────────────────────────────────────
const generateGlobalQuizQuestions = (count) => {
  const books = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
    'Joshua','Judges','Ruth','1 Samuel','2 Samuel',
    '1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
    'Nehemiah','Esther','Job','Psalms','Proverbs',
    'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations',
    'Ezekiel','Daniel','Hosea','Joel','Amos',
    'Obadiah','Jonah','Micah','Nahum','Habakkuk',
    'Zephaniah','Haggai','Zechariah','Malachi',
    'Matthew','Mark','Luke','John','Acts',
    'Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
    'Philippians','Colossians','1 Thessalonians','2 Thessalonians',
    '1 Timothy','2 Timothy','Titus','Philemon','Hebrews',
    'James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
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
  const { scores, refetch } = useLeaderboard();
  const submitScore = useSubmitChallengeScore();
  const { requireAuth, promptOpen, reason, closePrompt } = useRequireAuth();

  // ─── Global Challenge ──────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [status, setStatus] = useState('waiting');
  const [globalChallengeStatus, setGlobalChallengeStatus] = useState('idle');
  const [globalCountdown, setGlobalCountdown] = useState(10);
  const [globalParticipants, setGlobalParticipants] = useState([]);
  const [globalQuizQuestions, setGlobalQuizQuestions] = useState([]);
  const [globalCurrentQuestionIndex, setGlobalCurrentQuestionIndex] = useState(0);
  const [globalPlayerAnswers, setGlobalPlayerAnswers] = useState([]);
  const [globalQuizResults, setGlobalQuizResults] = useState(null);
  const [showGlobalPopup, setShowGlobalPopup] = useState(false);
  const [globalQuestionTimer, setGlobalQuestionTimer] = useState(30);

  // ─── Multiplayer Duel ──────────────────────────────────────────
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [opponentId, setOpponentId] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [multiplayerStatus, setMultiplayerStatus] = useState('idle');
  const [notification, setNotification] = useState(null);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [duelCountdown, setDuelCountdown] = useState(3);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [activeQuestionTimer, setActiveQuestionTimer] = useState(30);

  // ─── Presence & Rematch ───────────────────────────────────────
  const [isOpponentPresent, setIsOpponentPresent] = useState(false);
  const [isRematchRequested, setIsRematchRequested] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────
  const countdownIntervalRef = useRef(null);
  const questionTimerRef = useRef(null);
  const channelRef = useRef(null);
  const hasAnsweredRef = useRef(false);
  const globalQuestionIntervalRef = useRef(null);

  const userRef = useRef(user);
  const currentChallengeRef = useRef(null);
  const quizQuestionsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const myScoreRef = useRef(0);
  const timerSecondsRef = useRef(30);
  const localFinishedRef = useRef(false);
  const opponentFinishedRef = useRef(false);
  const duelStartedRef = useRef(false);
  const handleNextQuestionRef = useRef(null);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { currentChallengeRef.current = currentChallenge; }, [currentChallenge]);
  useEffect(() => { quizQuestionsRef.current = quizQuestions; }, [quizQuestions]);
  useEffect(() => { currentIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { myScoreRef.current = myScore; }, [myScore]);
  useEffect(() => { timerSecondsRef.current = timerSeconds; }, [timerSeconds]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (globalQuestionIntervalRef.current) clearInterval(globalQuestionIntervalRef.current);
    };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────
  const getUserDisplayName = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .single();
    return data?.display_name || userId.slice(0, 8);
  };

  const findOpponent = async (identifier) => {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmed)) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('id', trimmed)
        .maybeSingle();
      if (data) return data.id;
    }

    const { data } = await supabase
      .from('users')
      .select('id')
      .ilike('display_name', `%${trimmed}%`)
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  };

  // ─── Incoming Challenges ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const streamChannel = supabase
      .channel('duel_challenges_global_stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duel_challenges' },
        async (payload) => {
          const newChallenge = payload.new;
          if (newChallenge.opponent_id !== user.id) return;
          if (newChallenge.challenger_id === user.id) return;
          const name = await getUserDisplayName(newChallenge.challenger_id);
          setNotification({
            id: newChallenge.id,
            message: `🔥 You have been challenged by ${name}!`,
            type: 'info',
          });
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(streamChannel);
    };
  }, [user]);

  // ═══════════════════════════════════════════════════════════════
  // DUEL LOGIC
  // ═══════════════════════════════════════════════════════════════

  const maybeFinishDuel = async () => {
    if (!localFinishedRef.current || !opponentFinishedRef.current) return;
    const challenge = currentChallengeRef.current;
    if (!challenge) return;
    if (challenge.status === 'finished') {
      setMultiplayerStatus('finished');
      return;
    }
    await supabase
      .from('duel_challenges')
      .update({ status: 'finished' })
      .eq('id', challenge.id);
    setMultiplayerStatus('finished');
  };

  const handleNextQuestionImpl = async () => {
    const qs = quizQuestionsRef.current;
    const idx = currentIndexRef.current;
    const challenge = currentChallengeRef.current;
    const me = userRef.current;
    if (!challenge || !me) return;

    const nextIndex = idx + 1;
    const isChallenger = me.id === challenge.challenger_id;
    const score = myScoreRef.current;

    if (nextIndex < qs.length) {
      currentIndexRef.current = nextIndex;
      setCurrentQuestionIndex(nextIndex);
      hasAnsweredRef.current = false;
      startQuestionTimer();

      const updatePayload = isChallenger
        ? { score_challenger: score, current_question: nextIndex }
        : { score_opponent: score, current_question: nextIndex };
      await supabase
        .from('duel_challenges')
        .update(updatePayload)
        .eq('id', challenge.id);
    } else {
      localFinishedRef.current = true;
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }

      const scorePayload = isChallenger
        ? { score_challenger: score }
        : { score_opponent: score };
      await supabase
        .from('duel_challenges')
        .update(scorePayload)
        .eq('id', challenge.id);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_finished',
        payload: { user: me.id },
      });

      await maybeFinishDuel();
    }
  };
  handleNextQuestionRef.current = handleNextQuestionImpl;

  const startQuestionTimer = () => {
    const seconds = timerSecondsRef.current || 30;
    setActiveQuestionTimer(seconds);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
      setActiveQuestionTimer((prev) => {
        if (prev <= 1) {
          clearInterval(questionTimerRef.current);
          questionTimerRef.current = null;
          handleNextQuestionRef.current?.();
          return seconds;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const beginCountdown = (questions, seconds) => {
    duelStartedRef.current = true;
    quizQuestionsRef.current = questions;
    currentIndexRef.current = 0;
    myScoreRef.current = 0;
    localFinishedRef.current = false;
    opponentFinishedRef.current = false;
    hasAnsweredRef.current = false;
    timerSecondsRef.current = seconds || 30;

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setMyScore(0);
    setOpponentScore(0);
    setIsMultiplayerModalOpen(true);
    setMultiplayerStatus('countdown');

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    let count = 3;
    setDuelCountdown(count);
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setDuelCountdown(count);
      if (count <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setMultiplayerStatus('quiz');
        startQuestionTimer();
      }
    }, 1000);
  };

  // ─── Live Match Room Sync Hub ─────────────────────────────────
  useEffect(() => {
    if (!currentChallenge?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const challengeId = currentChallenge.id;
    const me = userRef.current;
    if (!me) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room_${challengeId}`, {
        config: {
          broadcast: { ack: true, self: false },
          presence: { key: me.id },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_challenges',
          filter: `id=eq.${challengeId}`,
        },
        (payload) => {
          const updated = payload.new;

          if (!duelStartedRef.current) {
            quizQuestionsRef.current = updated.questions || [];
            setQuizQuestions(updated.questions || []);
          }

          if (updated.status === 'pending') {
            setMultiplayerStatus('pending');
          } else if (updated.status === 'declined') {
            setMultiplayerStatus('idle');
            setNotification({ message: '❌ Challenge declined.', type: 'error' });
            setCurrentChallenge(null);
            setIsMultiplayerModalOpen(false);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
          } else if (updated.status === 'accepted') {
            if (duelStartedRef.current) return;
            beginCountdown(updated.questions || [], updated.timer_seconds || 30);
          } else if (updated.status === 'finished') {
            if (questionTimerRef.current) {
              clearInterval(questionTimerRef.current);
              questionTimerRef.current = null;
            }
            const isChallenger = me.id === updated.challenger_id;
            setMyScore(isChallenger ? updated.score_challenger : updated.score_opponent);
            setOpponentScore(isChallenger ? updated.score_opponent : updated.score_challenger);
            setMultiplayerStatus('finished');
          }
        }
      )
      .on('broadcast', { event: 'live_score' }, (payload) => {
        if (payload.payload.user !== me.id) {
          setOpponentScore(payload.payload.score);
        }
      })
      .on('broadcast', { event: 'player_finished' }, (payload) => {
        if (payload.payload.user !== me.id) {
          opponentFinishedRef.current = true;
          maybeFinishDuel();
        }
      })
      .on('broadcast', { event: 'rematch_requested' }, () => {
        setIsRematchRequested(true);
      })
      .on('broadcast', { event: 'rematch_accepted' }, (payload) => {
        setIsRematchRequested(false);
        beginCountdown(
          payload.payload.questions,
          payload.payload.timerSeconds || 30
        );
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const cc = currentChallengeRef.current;
        if (!cc) return;
        const targetOpponentId =
          me.id === cc.challenger_id ? cc.opponent_id : cc.challenger_id;
        setIsOpponentPresent(!!state[targetOpponentId]);
      })
      .subscribe(async (status) => {
        console.log(`🎮 Room ${challengeId} status:`, status);
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, [currentChallenge?.id, user?.id]);

  // ─── Send Challenge (GATED) ──────────────────────────────────
  const handleSendChallenge = () => {
    requireAuth(async () => {
      if (!opponentId.trim()) {
        alert("Please enter your opponent's User ID or Display Name.");
        return;
      }

      const targetUid = await findOpponent(opponentId.trim());
      if (!targetUid || targetUid === user.id) {
        alert('Opponent not found or you cannot challenge yourself.');
        return;
      }

      if (!connectionStatus) {
        alert('Connection not ready. Please wait.');
        return;
      }

      const questions = await fetchGlobalChallengeQuestionsFromDB(questionCount);
      const fallbacks =
        questions && questions.length > 0 ? questions : generateGlobalQuizQuestions(questionCount);

      duelStartedRef.current = false;
      localFinishedRef.current = false;
      opponentFinishedRef.current = false;
      hasAnsweredRef.current = false;

      setMyScore(0);
      setOpponentScore(0);
      setCurrentQuestionIndex(0);
      setIsRematchRequested(false);

      const { data, error } = await supabase
        .from('duel_challenges')
        .insert({
          challenger_id: user.id,
          opponent_id: targetUid,
          status: 'pending',
          questions: fallbacks,
          score_challenger: 0,
          score_opponent: 0,
          current_question: 0,
          timer_seconds: timerSeconds,
        })
        .select()
        .single();

      if (error) {
        console.error('Send error:', error);
        alert('Failed to send challenge.');
        return;
      }

      setCurrentChallenge(data);
      setMultiplayerStatus('pending');
    }, 'Sign in to challenge another player');
  };

  // ─── Accept Challenge (GATED) ────────────────────────────────
  const handleAcceptChallenge = (challengeId) => {
    requireAuth(async () => {
      setNotification(null);
      setIsRematchRequested(false);

      const { data, error } = await supabase
        .from('duel_challenges')
        .update({ status: 'accepted' })
        .eq('id', challengeId)
        .select()
        .single();

      if (error || !data) {
        console.error('Accept error:', error);
        alert('Failed to accept challenge.');
        return;
      }

      setCurrentChallenge(data);
      beginCountdown(data.questions || [], data.timer_seconds || 30);
    }, 'Sign in to accept the challenge');
  };

  const handleDeclineChallenge = async (challengeId) => {
    setNotification(null);
    await supabase
      .from('duel_challenges')
      .update({ status: 'declined' })
      .eq('id', challengeId);
  };

  // ─── Rematch ──────────────────────────────────────────────────
  const handleInitiateRematch = async () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'rematch_requested',
        payload: {},
      });
      alert('Rematch request sent!');
    }
  };

  const handleAcceptRematch = async () => {
    if (!channelRef.current || !currentChallengeRef.current) return;
    const freshQuestions = generateGlobalQuizQuestions(questionCount);
    const secs = currentChallengeRef.current.timer_seconds || timerSecondsRef.current || 30;

    await supabase
      .from('duel_challenges')
      .update({
        status: 'accepted',
        questions: freshQuestions,
        score_challenger: 0,
        score_opponent: 0,
        current_question: 0,
      })
      .eq('id', currentChallengeRef.current.id);

    channelRef.current.send({
      type: 'broadcast',
      event: 'rematch_accepted',
      payload: { questions: freshQuestions, timerSeconds: secs },
    });

    setIsRematchRequested(false);
    beginCountdown(freshQuestions, secs);
  };

  // ─── Answer Handler ──────────────────────────────────────────
  const handleSelectAnswer = async (selectedOptionIndex) => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;

    const currentQuestion = quizQuestionsRef.current[currentIndexRef.current];
    if (!currentQuestion) return;

    const isCorrect = selectedOptionIndex === currentQuestion.correct;
    let updatedScore = myScoreRef.current;
    if (isCorrect) {
      updatedScore += 1;
      myScoreRef.current = updatedScore;
      setMyScore(updatedScore);
    }

    channelRef.current?.send({
      type: 'broadcast',
      event: 'live_score',
      payload: { score: updatedScore, user: userRef.current.id },
    });

    await handleNextQuestionImpl();
  };

  // ─── Reset Multiplayer ──────────────────────────────────────
  const resetMultiplayer = () => {
    setIsMultiplayerModalOpen(false);
    setOpponentId('');
    setMultiplayerStatus('idle');
    setNotification(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setMyScore(0);
    setOpponentScore(0);
    setCurrentChallenge(null);
    setIsRematchRequested(false);
    setIsOpponentPresent(false);

    duelStartedRef.current = false;
    localFinishedRef.current = false;
    opponentFinishedRef.current = false;
    hasAnsweredRef.current = false;
    quizQuestionsRef.current = [];
    currentIndexRef.current = 0;
    myScoreRef.current = 0;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  };

  // ─── Global Challenge Timer ──────────────────────────────────
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

    if (diffSec <= 10 && diffSec > 0 && isSunday && hours === 20 && minutes === 59) {
      setGlobalCountdown(diffSec);
      setGlobalChallengeStatus('countdown');
      setShowGlobalPopup(true);
    } else if (diffSec === 0 && globalChallengeStatus === 'countdown') {
      startGlobalQuiz();
    }

    if (isLive) {
      const elapsed =
        (eatNow.getTime() - new Date(eatNow).setUTCHours(21, 0, 0, 0)) / 1000;
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

  // ─── Global Challenge Quiz ──────────────────────────────────
  const startGlobalQuiz = async () => {
    if (globalChallengeStatus === 'playing') return;
    let questions = await fetchGlobalChallengeQuestionsFromDB(30);
    if (!questions || questions.length === 0) {
      questions = generateGlobalQuizQuestions(30);
    }
    setGlobalQuizQuestions(questions);
    setGlobalCurrentQuestionIndex(0);
    setGlobalPlayerAnswers([]);
    setGlobalChallengeStatus('playing');
    setShowGlobalPopup(false);
    setGlobalQuestionTimer(30);
    startGlobalQuestionTimer();
  };

  const startGlobalQuestionTimer = () => {
    if (globalQuestionIntervalRef.current) clearInterval(globalQuestionIntervalRef.current);
    let timeLeft = 30;
    globalQuestionIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setGlobalQuestionTimer(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(globalQuestionIntervalRef.current);
        globalQuestionIntervalRef.current = null;
        handleGlobalNextQuestion();
      }
    }, 1000);
  };

  const handleGlobalAnswer = (questionIndex, answerIndex) => {
    const updated = [...globalPlayerAnswers];
    updated[questionIndex] = answerIndex;
    setGlobalPlayerAnswers(updated);
    if (globalQuestionIntervalRef.current) {
      clearInterval(globalQuestionIntervalRef.current);
      globalQuestionIntervalRef.current = null;
    }
    setTimeout(() => handleGlobalNextQuestion(), 300);
  };

  const handleGlobalNextQuestion = () => {
    if (globalCurrentQuestionIndex < globalQuizQuestions.length - 1) {
      setGlobalCurrentQuestionIndex((prev) => prev + 1);
      setGlobalQuestionTimer(30);
      startGlobalQuestionTimer();
    } else {
      finishGlobalQuiz();
    }
  };

  const finishGlobalQuiz = () => {
    if (globalQuestionIntervalRef.current) {
      clearInterval(globalQuestionIntervalRef.current);
      globalQuestionIntervalRef.current = null;
    }
    const results = globalParticipants.map((participant) => {
      const correct = Math.floor(Math.random() * 30);
      return { ...participant, score: correct, total: 30 };
    });
    setGlobalQuizResults(results);
    setGlobalChallengeStatus('finished');
    results.forEach((p) => {
      if (user && p.id === user.id) {
        submitScore.mutate({ userId: user.id, score: p.score });
      }
    });
    setTimeout(() => refetch(), 1000);
  };

  const joinGlobalChallenge = () => {
    requireAuth(() => {
      setGlobalParticipants((prev) => {
        if (!prev.find((p) => p.id === user.id)) {
          return [...prev, { id: user.id, name: user.display_name || user.email }];
        }
        return prev;
      });
      setGlobalChallengeStatus('joining');
    }, 'Sign in to join the Global Challenge');
  };

  // ─── Leaderboard ────────────────────────────────────────────
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
    const foundIndex = scores.findIndex((s) => {
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
      <h2 className="text-primary text-2xl font-bold mb-4">🌍 Global Challenge</h2>

      <div className="bg-surface rounded-xl p-8 border border-[#2a2a2a] max-w-md mx-auto">
        <button
          onClick={() => setIsMultiplayerModalOpen(true)}
          className="mb-4 btn w-full"
        >
          ⚔️ Multiplayer (1v1 Duel)
        </button>

        {import.meta.env.DEV && (
          <button
            onClick={() => {
              if (!user) {
                alert('Please log in first.');
                return;
              }
              setGlobalParticipants([
                { id: user.id, name: user.display_name || user.email || 'You' },
              ]);
              startGlobalQuiz();
              setStatus('live');
              setTimeLeft({ days: 0, hours: 0, minutes: 9, seconds: 59 });
            }}
            className="mb-4 btn w-full bg-yellow-500 text-black hover:bg-yellow-600"
          >
            ⚡ Force Live (Test)
          </button>
        )}

        <div className="mb-4">
          {isLive ? (
            <>
              <div className="text-4xl font-bold text-success">🔴 LIVE NOW</div>
              <div className="text-3xl font-mono text-primary mt-2">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted">remaining in this week's challenge</div>
            </>
          ) : isWaiting ? (
            <>
              <div className="text-3xl font-mono text-primary">
                {days > 0 && `${days}d `}
                {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
                {String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted mt-1">until the next Global Challenge</div>
              <div className="text-xs text-muted mt-1">Every Sunday at 9:00 PM EAT</div>
            </>
          ) : (
            <div className="text-3xl font-mono text-muted">⏳ Next challenge coming soon</div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-primary text-lg font-semibold mb-2">
            🏆 Global Challenge Leaderboard
          </h3>
          <div className="bg-surface border border-[#2a2a2a] rounded-xl overflow-hidden">
            {scores.length === 0 ? (
              <div className="p-4 text-muted text-center">No global challenge data yet.</div>
            ) : (
              <div className="p-3 max-h-60 overflow-y-auto">
                <div className="flex justify-between text-xs text-muted border-b border-[#2a2a2a] pb-1 mb-1">
                  <span>Rank</span>
                  <span>Score</span>
                </div>
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
      </div>

      <button
        className="mt-6 btn-secondary !w-auto px-6"
        onClick={() => navigate('/home')}
      >
        ← Back to Home
      </button>

      {/* ─── Multiplayer Modal (form, countdown, results) ─────── */}
      {isMultiplayerModalOpen && multiplayerStatus !== 'quiz' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#2a2a2a]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-primary">⚔️ Duel Quiz</h3>
              {currentChallenge && (
                <span className="flex items-center gap-1 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOpponentPresent ? 'bg-green-500' : 'bg-slate-600'
                    }`}
                  ></span>
                  {isOpponentPresent ? 'Opponent Active' : 'Opponent Away'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted mb-4">Challenge a friend to a 1v1 match</p>

            <div className="flex items-center gap-2 mb-4 text-sm">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  connectionStatus ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></span>
              <span className="text-muted">
                {connectionStatus ? '🟢 Connected' : '🔴 Disconnected – refresh page'}
              </span>
            </div>

            {multiplayerStatus === 'idle' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-muted mb-1">
                    Opponent User ID or Display Name
                  </label>
                  <input
                    type="text"
                    value={opponentId}
                    onChange={(e) => setOpponentId(e.target.value)}
                    placeholder="Enter opponent's User ID or Display Name"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-muted mt-1">
                    You can find your opponent's User ID on their Progress page.
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

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={handleSendChallenge}
                    className="btn flex-1"
                    disabled={!opponentId.trim()}
                  >
                    Start Duel
                  </button>
                  <button onClick={resetMultiplayer} className="btn-secondary flex-1">
                    Cancel
                  </button>
                </div>
              </>
            )}

            {multiplayerStatus === 'pending' && (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-text">Challenge sent! Waiting for opponent to accept...</p>
                <button onClick={resetMultiplayer} className="mt-4 btn-secondary">
                  Cancel
                </button>
              </div>
            )}

            {multiplayerStatus === 'countdown' && (
              <div className="text-center py-8">
                <div className="text-6xl font-bold text-primary">{duelCountdown}</div>
                <p className="text-muted mt-2">Get ready for the duel!</p>
              </div>
            )}

            {multiplayerStatus === 'finished' && (
              <div>
                <h4 className="text-lg font-bold text-primary mb-3">🏁 Duel Results</h4>
                <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between border-b border-[#2a2a2a] py-1">
                    <span>You</span>
                    <span className="text-primary font-bold">
                      {myScore}/{quizQuestions.length}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#2a2a2a] py-1">
                    <span>Opponent</span>
                    <span className="text-primary font-bold">
                      {opponentScore}/{quizQuestions.length}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-center text-sm">
                  {myScore > opponentScore && '🎉 You won!'}
                  {myScore < opponentScore && '😞 Opponent won!'}
                  {myScore === opponentScore && "🤝 It's a draw!"}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {isRematchRequested ? (
                    <button
                      onClick={handleAcceptRematch}
                      className="btn w-full bg-green-600 hover:bg-green-500"
                    >
                      ⚡ Accept Rematch
                    </button>
                  ) : (
                    <button onClick={handleInitiateRematch} className="btn-secondary w-full">
                      🔄 Request Rematch
                    </button>
                  )}
                  <button onClick={resetMultiplayer} className="btn-secondary w-full">
                    Quit to Arena
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Multiplayer Quiz – Full Screen ───────────────────── */}
      {isMultiplayerModalOpen && multiplayerStatus === 'quiz' && quizQuestions.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-bg overflow-y-auto">
          <div className="max-w-2xl mx-auto p-5">
            <div className="quiz-header flex justify-between items-center mb-5 font-bold flex-wrap gap-2">
              <div>
                ⚔️ Duel – {currentQuestionIndex + 1}/{quizQuestions.length}
              </div>
              <div className="timer text-primary text-xl bg-[#2a2205] px-3 py-1 rounded-full border border-primary">
                {activeQuestionTimer}s
              </div>
              <button className="quit-btn" onClick={resetMultiplayer}>
                ✕ Quit
              </button>
            </div>

            <div className="flex justify-between text-sm mb-3 font-bold">
              <span className="text-primary">You: {myScore}</span>
              <span className="text-muted flex items-center gap-1">
                Opponent: {opponentScore}
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isOpponentPresent ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                ></span>
              </span>
            </div>

            <div className="question-box bg-surface p-5 rounded-xl border-l-4 border-primary mb-5 text-lg leading-relaxed">
              {quizQuestions[currentQuestionIndex].question}
              <div className="text-xs text-muted mt-2">
                From {quizQuestions[currentQuestionIndex].book}
              </div>
            </div>

            <div className="options-list flex flex-col gap-3">
              {quizQuestions[currentQuestionIndex].options.map((opt, idx) => (
                <button
                  key={idx}
                  className="option-btn"
                  onClick={() => handleSelectAnswer(idx)}
                >
                  {String.fromCharCode(65 + idx)}. {opt}
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-3">
              <span className="text-sm text-muted">
                Answer when ready — the timer runs on both sides.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Notification Popup ────────────────────────────────── */}
      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-sm w-full border border-[#2a2a2a] text-center">
            <p className="text-text mb-4">{notification.message}</p>
            <div className="flex gap-3 justify-center">
              {notification.id && (
                <>
                  <button onClick={() => handleAcceptChallenge(notification.id)} className="btn">
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineChallenge(notification.id)}
                    className="btn-secondary"
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── GLOBAL CHALLENGE countdown popup ──────────────────── */}
      {showGlobalPopup && globalChallengeStatus === 'countdown' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-8 max-w-sm w-full text-center border border-primary/50">
            <h3 className="text-2xl font-bold text-primary mb-2">
              🌍 Global Challenge begins in
            </h3>
            <div className="text-7xl font-mono text-primary my-4">{globalCountdown}</div>
            <p className="text-muted text-sm mb-6">seconds</p>
            {!globalParticipants.find((p) => p.id === user?.id) ? (
              <button onClick={joinGlobalChallenge} className="btn w-full text-lg py-3">
                Join Now
              </button>
            ) : (
              <p className="text-success font-medium">✅ You have joined!</p>
            )}
            <p className="text-xs text-muted mt-4">Quiz starts at 9:00 PM EAT sharp</p>
          </div>
        </div>
      )}

      {/* ─── GLOBAL CHALLENGE Quiz – Full Screen ──────────────── */}
      {globalChallengeStatus === 'playing' && globalQuizQuestions.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-bg overflow-y-auto">
          <div className="max-w-2xl mx-auto p-5">
            <div className="quiz-header flex justify-between items-center mb-5 font-bold flex-wrap gap-2">
              <div>
                🌍 Global – {globalCurrentQuestionIndex + 1}/{globalQuizQuestions.length}
              </div>
              <div className="timer text-primary text-xl bg-[#2a2205] px-3 py-1 rounded-full border border-primary">
                {globalQuestionTimer}s
              </div>
            </div>

            <div className="question-box bg-surface p-5 rounded-xl border-l-4 border-primary mb-5 text-lg leading-relaxed">
              {globalQuizQuestions[globalCurrentQuestionIndex].question}
              <div className="text-xs text-muted mt-2">
                From {globalQuizQuestions[globalCurrentQuestionIndex].book}
              </div>
            </div>

            <div className="options-list flex flex-col gap-3">
              {globalQuizQuestions[globalCurrentQuestionIndex].options.map((opt, idx) => (
                <button
                  key={idx}
                  className="option-btn"
                  onClick={() => handleGlobalAnswer(globalCurrentQuestionIndex, idx)}
                >
                  {String.fromCharCode(65 + idx)}. {opt}
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-3">
              <span className="text-sm text-muted">
                {globalParticipants.length} player(s) participating
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── GLOBAL CHALLENGE Results ─────────────────────────── */}
      {globalChallengeStatus === 'finished' && globalQuizResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#2a2a2a]">
            <h4 className="text-2xl font-bold text-primary text-center mb-4">
              🏁 Global Challenge Results
            </h4>
            <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
              {globalQuizResults
                .sort((a, b) => b.score - a.score)
                .map((r, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between border-b border-[#2a2a2a] py-1"
                  >
                    <span>
                      {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'}
                      {r.name}
                    </span>
                    <span className="text-primary font-bold">
                      {r.score}/{r.total}
                    </span>
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
                refetch();
              }}
              className="mt-4 btn w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─── Sign-in prompt for gated actions ─────────────────── */}
      <SignInPrompt open={promptOpen} reason={reason} onClose={closePrompt} />
    </div>
  );
}