import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuth } from '../../context/AuthContext';
import { useSubmitChallengeScore } from '../../hooks/useSubmitChallengeScore';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import SignInPrompt from '../shared/SignInPrompt';
import { supabase } from '../../lib/supabase';
import { fetchGlobalChallengeQuestionsFromDB, fetchGlobalEvent } from '../../lib/api';
import { calculateNextScore, canFinishDuel } from '../../lib/duelLogic';
import { useLanguage } from '../../context/LanguageContext';

const generateGlobalQuizQuestions = (count) => {
  const books = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'];
  return Array.from({ length: count }).map((_, idx) => ({
    id: idx,
    book: books[idx % 5],
    question: `Sample question from ${books[idx % 5]}?`,
    options: ['A', 'B', 'C', 'D'],
    correct: Math.floor(Math.random() * 4),
  }));
};

// 👇 Countdown formatter — Dd HHh MMm SSs
const formatCountdown = (sec) => {
  if (sec <= 0) return '0s';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (h > 0) return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${pad(m)}m ${pad(s)}s`;
  return `${s}s`;
};

export default function Challenge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch } = useLeaderboard();
  const submitScore = useSubmitChallengeScore();
  const { requireAuth, promptOpen, reason, closePrompt } = useRequireAuth();
  const { t } = useLanguage();

  // ─── Global Challenge Engine State ────────────────────────────
  const [globalEvent, setGlobalEvent] = useState(null);
  const [timeUntilStart, setTimeUntilStart] = useState(0);
  const [globalChallengeStatus, setGlobalChallengeStatus] = useState('idle');
  const [globalQuizQuestions, setGlobalQuizQuestions] = useState([]);
  const [globalCurrentQuestionIndex, setGlobalCurrentQuestionIndex] = useState(0);
  const [globalPlayerAnswers, setGlobalPlayerAnswers] = useState([]);
  const [globalQuestionTimer, setGlobalQuestionTimer] = useState(30);
  const [top10Scores, setTop10Scores] = useState([]);
  
  const [isReadyForGlobal, setIsReadyForGlobal] = useState(false);
  const [hasFinishedCurrentEvent, setHasFinishedCurrentEvent] = useState(false);

  // ─── Multiplayer Duel State ───────────────────────────────────
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [opponentId, setOpponentId] = useState('');
  const [opponentName, setOpponentName] = useState('');
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

  // ─── DISCONNECT RECOVERY ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const checkActiveDuel = async () => {
      const { data } = await supabase
        .from('duel_challenges')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const isChallenger = user.id === data.challenger_id;
        const myProgress = isChallenger ? data.challenger_current_question : data.opponent_current_question;
        
        setCurrentChallenge(data);
        setQuizQuestions(data.questions);
        setCurrentQuestionIndex(myProgress || 0);
        setMyScore(isChallenger ? data.score_challenger : data.score_opponent);
        setOpponentScore(isChallenger ? data.score_opponent : data.score_challenger);
        setIsMultiplayerModalOpen(true);
        setMultiplayerStatus('quiz');
        
        startQuestionTimer();
      }
    };
    checkActiveDuel();
  }, [user]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (globalQuestionIntervalRef.current) clearInterval(globalQuestionIntervalRef.current);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SERVER-DRIVEN GLOBAL CHALLENGE ENGINE
  // ═══════════════════════════════════════════════════════════════
  const fetchTopScores = async (eventId) => {
    if (!eventId) return;
    const { data, error } = await supabase.rpc('get_global_leaderboard', { event_id_param: eventId });
    if (!error) setTop10Scores(data || []);
  };

  useEffect(() => {
    fetchGlobalEvent().then(event => {
      if (event) {
        setGlobalEvent(event);
        fetchTopScores(event.id);
      }
    });

    const channel = supabase
      .channel('global_challenge_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_events' }, (payload) => {
        const updated = payload.new;
        if (updated.event_type !== 'global_challenge') return;
        
        setGlobalEvent(updated);
        if (updated.status === 'live') {
           fetchTopScores(updated.id);
           if (isReadyForGlobal && globalChallengeStatus !== 'playing') {
             startGlobalQuiz(updated);
           }
        }
        if (updated.status === 'finished' && !hasFinishedCurrentEvent) {
           setGlobalChallengeStatus('idle');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_challenge_scores' }, (payload) => {
        if (payload.new.event_id === globalEvent?.id) fetchTopScores(globalEvent.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isReadyForGlobal, hasFinishedCurrentEvent, globalEvent?.id]);

  useEffect(() => {
    if (!globalEvent) return;
    let hasTriggeredFallback = false;
    const tick = () => {
      const now = Date.now();
      const start = new Date(globalEvent.start_time).getTime();
      const diffSec = Math.floor((start - now) / 1000);
      setTimeUntilStart(diffSec);

      if (diffSec <= 0 && globalEvent.status === 'waiting' && !hasTriggeredFallback) {
        hasTriggeredFallback = true;
        supabase.rpc('manage_global_challenge').then(() => {
          fetchGlobalEvent().then((freshEvent) => {
            setGlobalEvent(freshEvent);
            if (freshEvent?.status === 'live') {
              fetchTopScores(freshEvent.id);
              if (isReadyForGlobal) startGlobalQuiz(freshEvent);
            }
          });
        });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [globalEvent, isReadyForGlobal]);

  const startGlobalQuiz = async (event) => {
    if (globalChallengeStatus === 'playing' || !event) return;
    let questions = [];
    if (event.question_ids && event.question_ids.length > 0) {
      const { data: dbQuestions } = await supabase
        .from('quiz_questions')
        .select('id, quiz_id, question, options, correct_answer, verse_reference, quizzes(book_name)')
        .in('id', event.question_ids);
        
      if (dbQuestions) {
        questions = dbQuestions.map((q, idx) => ({
          id: q.id, book: q.quizzes?.book_name || 'Bible', question: q.question, options: q.options, answer: q.correct_answer, correct: q.correct_answer, ref: q.verse_reference?.trim() || `Bible ${idx + 1}:1`,
        }));
      }
    }
    if (questions.length === 0) questions = generateGlobalQuizQuestions(30);
    setGlobalQuizQuestions(questions);
    setGlobalCurrentQuestionIndex(0);
    setGlobalPlayerAnswers([]);
    setGlobalChallengeStatus('playing');
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
        handleGlobalNextQuestion();
      }
    }, 1000);
  };

  const handleGlobalAnswer = (questionIndex, answerIndex) => {
    const updated = [...globalPlayerAnswers];
    updated[questionIndex] = answerIndex;
    setGlobalPlayerAnswers(updated);
    if (globalQuestionIntervalRef.current) clearInterval(globalQuestionIntervalRef.current);
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

  const finishGlobalQuiz = async () => {
    if (globalQuestionIntervalRef.current) clearInterval(globalQuestionIntervalRef.current);
    let correctCount = 0;
    globalQuizQuestions.forEach((q, idx) => {
      if (globalPlayerAnswers[idx] === q.answer) correctCount++;
    });
    setGlobalChallengeStatus('finished');
    setHasFinishedCurrentEvent(true);
    if (user && globalEvent) {
      await supabase.from('global_challenge_scores').insert({ user_id: user.id, score: correctCount, event_id: globalEvent.id });
      await fetchTopScores(globalEvent.id);
    }
    refetch();
  };

  // ═══════════════════════════════════════════════════════════════
  // SERVER-AUTHORITATIVE MULTIPLAYER DUEL LOGIC
  // ═══════════════════════════════════════════════════════════════
  const getUserDisplayName = async (userId) => {
    const { data } = await supabase.from('users').select('display_name, username, device_code').eq('id', userId).maybeSingle();
    if (data?.display_name) return data.display_name;
    if (data?.username && data?.device_code) return `${data.username} ${data.device_code}`;
    return userId.slice(0, 8);
  };

  const findOpponent = async (identifier) => {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmed)) {
      const { data } = await supabase.from('users').select('id').eq('id', trimmed).maybeSingle();
      if (data) return data.id;
    }
    const { data } = await supabase.from('users').select('id').ilike('display_name', `%${trimmed}%`).limit(1).maybeSingle();
    return data?.id || null;
  };

  useEffect(() => {
    if (!currentChallenge || !user?.id) { setOpponentName(''); return; }
    const otherId = user.id === currentChallenge.challenger_id ? currentChallenge.opponent_id : currentChallenge.challenger_id;
    let cancelled = false;
    (async () => {
      const name = await getUserDisplayName(otherId);
      if (!cancelled) setOpponentName(name);
    })();
    return () => { cancelled = true; };
  }, [currentChallenge?.id, user?.id]);

  useEffect(() => {
    if (!user) return;
    const streamChannel = supabase.channel('duel_challenges_global_stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_challenges' }, async (payload) => {
          const newChallenge = payload.new;
          if (newChallenge.opponent_id !== user.id || newChallenge.challenger_id === user.id) return;
          const name = await getUserDisplayName(newChallenge.challenger_id);
          setNotification({ id: newChallenge.id, message: `🔥 You have been challenged by ${name}!`, type: 'info' });
        }
      ).subscribe((status) => { setConnectionStatus(status === 'SUBSCRIBED'); });
    return () => { supabase.removeChannel(streamChannel); };
  }, [user]);

  const maybeFinishDuel = async () => {
    if (!canFinishDuel(localFinishedRef.current, opponentFinishedRef.current)) return;
    const challenge = currentChallengeRef.current;
    if (!challenge || challenge.status === 'finished') return;
    await supabase.from('duel_challenges').update({ status: 'finished' }).eq('id', challenge.id);
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
    } else {
      localFinishedRef.current = true;
      if (questionTimerRef.current) { clearInterval(questionTimerRef.current); questionTimerRef.current = null; }
      channelRef.current?.send({ type: 'broadcast', event: 'player_finished', payload: { user: me.id } });
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
        setMultiplayerStatus('quiz');
        startQuestionTimer();
      }
    }, 1000);
  };

  useEffect(() => {
    if (!currentChallenge?.id) {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      return;
    }
    const challengeId = currentChallenge.id;
    const me = userRef.current;
    if (!me) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`room_${challengeId}`, {
        config: { broadcast: { ack: true, self: false }, presence: { key: me.id } },
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duel_challenges', filter: `id=eq.${challengeId}` }, (payload) => {
          const updated = payload.new;
          if (!duelStartedRef.current) { quizQuestionsRef.current = updated.questions || []; setQuizQuestions(updated.questions || []); }
          
          const isChallenger = me.id === updated.challenger_id;
          setOpponentScore(isChallenger ? updated.score_opponent : updated.score_challenger);
          setMyScore(isChallenger ? updated.score_challenger : updated.score_opponent);

          if (updated.status === 'declined') {
            setMultiplayerStatus('idle'); setNotification({ message: t('challengeDeclined'), type: 'error' }); setCurrentChallenge(null); setIsMultiplayerModalOpen(false);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
          } else if (updated.status === 'accepted' && !duelStartedRef.current) {
            beginCountdown(updated.questions || [], updated.timer_seconds || 30);
          } else if (updated.status === 'finished') {
            if (questionTimerRef.current) { clearInterval(questionTimerRef.current); questionTimerRef.current = null; }
            setMultiplayerStatus('finished');
          }
        }
      )
      .on('broadcast', { event: 'player_finished' }, (payload) => { if (payload.payload.user !== me.id) { opponentFinishedRef.current = true; maybeFinishDuel(); } })
      .on('broadcast', { event: 'rematch_requested' }, () => setIsRematchRequested(true))
      .on('broadcast', { event: 'rematch_accepted' }, (payload) => { setIsRematchRequested(false); beginCountdown(payload.payload.questions, payload.payload.timerSeconds || 30); })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const cc = currentChallengeRef.current;
        if (!cc) return;
        const targetOpponentId = me.id === cc.challenger_id ? cc.opponent_id : cc.challenger_id;
        setIsOpponentPresent(!!state[targetOpponentId]);
      })
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() }); });

    channelRef.current = channel;
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      if (questionTimerRef.current) { clearInterval(questionTimerRef.current); questionTimerRef.current = null; }
    };
  }, [currentChallenge?.id, user?.id]);

  const handleSendChallenge = () => {
    requireAuth(async () => {
      if (!opponentId.trim()) { alert("Please enter your opponent's name."); return; }
      const targetUid = await findOpponent(opponentId.trim());
      if (!targetUid || targetUid === user.id) { alert('Opponent not found or you cannot challenge yourself.'); return; }
      if (!connectionStatus) { alert('Connection not ready.'); return; }

      setOpponentName(await getUserDisplayName(targetUid));
      const questions = await fetchGlobalChallengeQuestionsFromDB(questionCount);
      const fallbacks = questions?.length > 0 ? questions : generateGlobalQuizQuestions(questionCount);

      duelStartedRef.current = false; localFinishedRef.current = false; opponentFinishedRef.current = false; hasAnsweredRef.current = false;
      setMyScore(0); setOpponentScore(0); setCurrentQuestionIndex(0); setIsRematchRequested(false);

      const { data, error } = await supabase.from('duel_challenges').insert({
          challenger_id: user.id, opponent_id: targetUid, status: 'pending', questions: fallbacks, score_challenger: 0, score_opponent: 0, current_question: 0, timer_seconds: timerSeconds,
        }).select().single();

      if (error) { alert('Failed to send challenge.'); return; }
      setCurrentChallenge(data); setMultiplayerStatus('pending');
    }, 'Sign in to challenge another player');
  };

  const handleAcceptChallenge = (challengeId) => {
    requireAuth(async () => {
      setNotification(null);
      const { data, error } = await supabase.from('duel_challenges').update({ status: 'accepted' }).eq('id', challengeId).select().single();
      if (error || !data) { alert('Failed to accept challenge.'); return; }
      setCurrentChallenge(data); beginCountdown(data.questions || [], data.timer_seconds || 30);
    }, 'Sign in to accept the challenge');
  };

  const handleDeclineChallenge = async (challengeId) => {
    setNotification(null);
    await supabase.from('duel_challenges').update({ status: 'declined' }).eq('id', challengeId);
  };

  const handleSelectAnswer = async (selectedOptionIndex) => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;
    const challengeId = currentChallengeRef.current.id;
    
    const { data, error } = await supabase.rpc('submit_duel_answer', {
      p_duel_id: challengeId,
      p_question_index: currentIndexRef.current,
      p_selected_option: selectedOptionIndex
    });

    if (!error && data) {
      setMyScore(data.new_score);
      myScoreRef.current = data.new_score;
    }
    await handleNextQuestionImpl();
  };

  const handleInitiateRematch = async () => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'rematch_requested', payload: {} });
      alert('Rematch request sent!');
    }
  };

  const handleAcceptRematch = async () => {
    if (!channelRef.current || !currentChallengeRef.current) return;
    const freshQuestions = generateGlobalQuizQuestions(questionCount);
    const secs = currentChallengeRef.current.timer_seconds || timerSecondsRef.current || 30;
    await supabase.from('duel_challenges').update({ 
      status: 'accepted', questions: freshQuestions, score_challenger: 0, score_opponent: 0, current_question: 0,
      challenger_answers: [], opponent_answers: [], challenger_current_question: 0, opponent_current_question: 0
    }).eq('id', currentChallengeRef.current.id);
    
    channelRef.current.send({ type: 'broadcast', event: 'rematch_accepted', payload: { questions: freshQuestions, timerSeconds: secs } });
    setIsRematchRequested(false); beginCountdown(freshQuestions, secs);
  };

  const resetMultiplayer = () => {
    setIsMultiplayerModalOpen(false); setOpponentId(''); setOpponentName(''); setMultiplayerStatus('idle');
    setNotification(null); setQuizQuestions([]); setCurrentQuestionIndex(0); setMyScore(0); setOpponentScore(0);
    setCurrentChallenge(null); setIsRematchRequested(false); setIsOpponentPresent(false);
    duelStartedRef.current = false; localFinishedRef.current = false; opponentFinishedRef.current = false; hasAnsweredRef.current = false;
    quizQuestionsRef.current = []; currentIndexRef.current = 0; myScoreRef.current = 0;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (questionTimerRef.current) { clearInterval(questionTimerRef.current); questionTimerRef.current = null; }
  };

  // ─── Render ──────────────────────────────────────────────────
  const show10MinWarning = timeUntilStart > 30 && timeUntilStart <= 600 && globalEvent?.status === 'waiting';
  const showJoinPopup = timeUntilStart > 0 && timeUntilStart <= 30 && globalEvent?.status === 'waiting' && !isReadyForGlobal;

  return (
    <div className="py-4 text-center">
      <h2 className="text-primary text-2xl font-bold mb-4">{t('globalChallenge')}</h2>
      
      <div className="bg-surface rounded-xl p-8 border border-[#2a2a2a] max-w-md mx-auto">
        <button onClick={() => setIsMultiplayerModalOpen(true)} className="mb-4 btn w-full">{t('multiplayer')}</button>
        
        <div className="mb-4">
          {globalEvent?.status === 'live' ? (
            <>
              <div className="text-4xl font-bold text-success mb-4">{t('liveNow')}</div>
              <button onClick={() => requireAuth(() => startGlobalQuiz(globalEvent), 'Enter the Global Challenge')} className="btn w-full bg-green-600 hover:bg-green-500 text-white animate-pulse">
                {t('enterLive')}
              </button>
            </>
          ) : globalEvent?.status === 'waiting' ? (
            <>
              <div className="text-3xl font-mono text-primary">
                {/* 👇 Dd HHh MMm SSs */}
                {timeUntilStart > 0 ? formatCountdown(timeUntilStart) : t('starting')}
              </div>
              <div className="text-sm text-muted mt-1">{t('nextChallenge')}</div>
            </>
          ) : (
            <div className="text-3xl font-mono text-muted">{t('comingSoon')}</div>
          )}
        </div>

        <div className="mt-6 border-t border-[#2a2a2a] pt-6">
          <h3 className="text-primary text-lg font-semibold mb-3">{t('topPlayers')}</h3>
          <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-1">
            {top10Scores.length === 0 ? (
              <div className="text-center text-muted py-4 text-sm">{t('noScores')}</div>
            ) : (
              top10Scores.map((r, idx) => (
                <div key={idx} className={`flex justify-between py-1 border-b border-[#2a2a2a] last:border-0 ${idx < 3 ? 'font-bold text-text' : 'text-sm text-muted'}`}>
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-right opacity-50">{idx + 1}.</span>
                    {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'}
                    {r.display_name || 'Anonymous'}
                  </span>
                  <span className={idx < 3 ? 'text-primary' : ''}>{r.score}/30</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <button className="mt-6 btn-secondary !w-auto px-6" onClick={() => navigate('/home')}>{t('back_home')}</button>

      {show10MinWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-primary text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce">
          ⚠️ Global Challenge starts in 10 minutes! Get ready.
        </div>
      )}

      {showJoinPopup && globalChallengeStatus !== 'playing' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-8 max-w-sm w-full text-center border border-primary/50 shadow-[0_0_50px_rgba(212,175,55,0.3)]">
            <h3 className="text-2xl font-bold text-primary mb-2">{t('globalChallengeStarts')}</h3>
            <div className="text-7xl font-mono text-primary my-4">{timeUntilStart}</div>
            <p className="text-muted text-sm mb-6">{t('seconds')}</p>
            <button 
              className="btn w-full text-lg py-3" 
              onClick={() => {
                requireAuth(() => setIsReadyForGlobal(true), 'Join the Global Challenge');
              }}
            >
              {isReadyForGlobal ? t('waitingOthers') : t('joinNow')}
            </button>
          </div>
        </div>
      )}

      {isReadyForGlobal && globalChallengeStatus !== 'playing' && globalEvent?.status !== 'live' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="spinner border-4 border-t-primary border-[#333] w-12 h-12 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-primary animate-pulse">{t('getReady')}</h3>
            <p className="text-muted mt-2">{t('startingMomentarily')}</p>
          </div>
        </div>
      )}

      {globalChallengeStatus === 'playing' && globalQuizQuestions.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-bg overflow-y-auto">
          <div className="max-w-2xl mx-auto p-5">
            <div className="quiz-header">
              <div>🌍 {t('globalChallenge')} – {globalCurrentQuestionIndex + 1}/{globalQuizQuestions.length}</div>
              <div className="timer">{globalQuestionTimer}s</div>
            </div>
            <div className="question-box">
              {globalQuizQuestions[globalCurrentQuestionIndex].question}
              <div className="text-xs text-muted mt-2">{t('from')} {globalQuizQuestions[globalCurrentQuestionIndex].book}</div>
            </div>
            <div className="options-list">
              {globalQuizQuestions[globalCurrentQuestionIndex].options.map((opt, idx) => (
                <button key={idx} className="option-btn" onClick={() => handleGlobalAnswer(globalCurrentQuestionIndex, idx)}>
                  {String.fromCharCode(65 + idx)}. {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {globalChallengeStatus === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-primary/30 shadow-[0_0_50px_rgba(212,175,55,0.15)]">
            <h4 className="text-2xl font-bold text-primary text-center mb-6">{t('globalLeaderboard')}</h4>
            
            <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-1">
              {top10Scores.length === 0 ? (
                <div className="text-center text-muted py-4">Calculating results...</div>
              ) : (
                top10Scores.map((r, idx) => (
                  <div key={idx} className={`flex justify-between py-2 border-b border-[#2a2a2a] ${idx < 3 ? 'font-bold' : 'text-sm'}`}>
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-right">{idx + 1}.</span>
                      {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'}
                      {r.display_name || 'Anonymous'}
                    </span>
                    <span className="text-primary font-bold">{r.score}/30</span>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => { setGlobalChallengeStatus('idle'); setGlobalQuizQuestions([]); setIsReadyForGlobal(false); setHasFinishedCurrentEvent(false); refetch(); }} 
              className="mt-6 btn w-full"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer Modals */}
      {isMultiplayerModalOpen && multiplayerStatus !== 'quiz' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#2a2a2a]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-primary">⚔️ {t('duel')}</h3>
              {currentChallenge && (<span className="flex items-center gap-1 text-xs"><span className={`w-2 h-2 rounded-full ${isOpponentPresent ? 'bg-green-500' : 'bg-slate-600'}`}></span>{opponentName || t('opponent')} {isOpponentPresent ? t('opponentActive') : t('opponentAway')}</span>)}
            </div>
            <p className="text-sm text-muted mb-4">Challenge another player to a 1v1 match</p>
            <div className="flex items-center gap-2 mb-4 text-sm"><span className={`inline-block w-2.5 h-2.5 rounded-full ${connectionStatus ? 'bg-green-500' : 'bg-red-500'}`}></span><span className="text-muted">{connectionStatus ? '🟢 Connected' : '🔴 Disconnected'}</span></div>
            {multiplayerStatus === 'idle' && (<>
              <div className="mb-4"><label className="block text-sm text-muted mb-1">{t('opponentName')}</label><input type="text" value={opponentId} onChange={(e) => setOpponentId(e.target.value)} placeholder="e.g. Emma or Emma 4821" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /><div className="text-xs text-muted mt-1">{t('askFriendName')}</div></div>
              <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="block text-sm text-muted mb-1">{t('questions')}</label><select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"><option value={10}>10</option><option value={15}>15</option><option value={30}>30</option></select></div><div><label className="block text-sm text-muted mb-1">{t('timerPerQ')}</label><select value={timerSeconds} onChange={(e) => setTimerSeconds(Number(e.target.value))} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"><option value={15}>15 sec</option><option value={30}>30 sec</option><option value={60}>60 sec</option></select></div></div>
              <div className="flex gap-3 mt-2"><button onClick={handleSendChallenge} className="btn flex-1" disabled={!opponentId.trim()}>{t('startDuel')}</button><button onClick={resetMultiplayer} className="btn-secondary flex-1">{t('cancel')}</button></div>
            </>)}
            {multiplayerStatus === 'pending' && (<div className="text-center py-8"><div className="text-2xl mb-2">⏳</div><p className="text-text">{t('challengeSentTo')} <strong className="text-primary">{opponentName || t('opponent')}</strong>. {t('waitingAccept')}</p><button onClick={resetMultiplayer} className="mt-4 btn-secondary">{t('cancel')}</button></div>)}
            {multiplayerStatus === 'countdown' && (<div className="text-center py-8"><div className="text-6xl font-bold text-primary">{duelCountdown}</div><p className="text-muted mt-2">{t('getReadyDuel')}</p></div>)}
            {multiplayerStatus === 'finished' && (<div>
              <h4 className="text-lg font-bold text-primary mb-3">{t('duelResults')}</h4>
              <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2"><div className="flex justify-between border-b border-[#2a2a2a] py-1"><span>{t('you')}</span><span className="text-primary font-bold">{myScore}/{quizQuestions.length}</span></div><div className="flex justify-between border-b border-[#2a2a2a] py-1"><span>{opponentName || t('opponent')}</span><span className="text-primary font-bold">{opponentScore}/{quizQuestions.length}</span></div></div>
              <div className="mt-3 text-center text-sm">{myScore > opponentScore && t('youWon')}{myScore < opponentScore && `${t('opponentWon')} (${opponentName || t('opponent')})`}{myScore === opponentScore && t('draw')}</div>
              <div className="mt-4 flex flex-col gap-2">{isRematchRequested ? <button onClick={handleAcceptRematch} className="btn w-full bg-green-600 hover:bg-green-500">{t('acceptRematch')}</button> : <button onClick={handleInitiateRematch} className="btn-secondary w-full">{t('requestRematch')}</button>}<button onClick={resetMultiplayer} className="btn-secondary w-full">{t('quitToArena')}</button></div>
            </div>)}
          </div>
        </div>
      )}

      {isMultiplayerModalOpen && multiplayerStatus === 'quiz' && quizQuestions.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-bg overflow-y-auto">
          <div className="max-w-2xl mx-auto p-5">
            <div className="quiz-header"><div>⚔️ {t('duel')} – {currentQuestionIndex + 1}/{quizQuestions.length}</div><div className="timer">{activeQuestionTimer}s</div><button className="quit-btn" onClick={resetMultiplayer}>{t('quitBtn')}</button></div>
            <div className="flex justify-between text-sm mb-3 font-bold"><span className="text-primary">{t('you')}: {myScore}</span><span className="text-muted flex items-center gap-1">{opponentName || t('opponent')}: {opponentScore}<span className={`inline-block w-2 h-2 rounded-full ${isOpponentPresent ? 'bg-green-500' : 'bg-slate-600'}`}></span></span></div>
            <div className="question-box">{quizQuestions[currentQuestionIndex].question}<div className="text-xs text-muted mt-2">{t('from')} {quizQuestions[currentQuestionIndex].book}</div></div>
            <div className="options-list">{quizQuestions[currentQuestionIndex].options.map((opt, idx) => (<button key={idx} className="option-btn" onClick={() => handleSelectAnswer(idx)}>{String.fromCharCode(65 + idx)}. {opt}</button>))}</div>
            <div className="flex justify-end mt-3"><span className="text-sm text-muted">{t('answerWhenReady')}</span></div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-6 max-w-sm w-full border border-[#2a2a2a] text-center">
            <p className="text-text mb-4">{notification.message}</p>
            <div className="flex gap-3 justify-center">{notification.id && (<><button onClick={() => handleAcceptChallenge(notification.id)} className="btn">Accept</button><button onClick={() => handleDeclineChallenge(notification.id)} className="btn-secondary">{t('cancel')}</button></>)}</div>
          </div>
        </div>
      )}

      <SignInPrompt open={promptOpen} reason={reason} onClose={closePrompt} />
    </div>
  );
}