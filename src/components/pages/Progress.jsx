import { useStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { initDevice } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function Progress() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  console.log(' Progress: user =', user, 'loading =', loading);

  const deviceCode = initDevice();

  // Store data & actions
  const setUsername = useStore((state) => state.setUsername);
  const setPlayerId = useStore((state) => state.setPlayerId);
  const quizzes = useStore((state) => state.quizzes || []);
  const scripture = useStore((state) => state.scripture || { booksRead: [], chaptersRead: [], versesRead: 0 });
  const globalChallenges = useStore((state) => state.globalChallenges || []);
  const dailyQuizHistory = useStore((state) => state.dailyQuizHistory || []);
  const loadProgress = useStore((state) => state.loadProgress);

  // ── State ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('Player');
  const [userEmail, setUserEmail] = useState('');
  const [saveUsername, setSaveUsername] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageType, setSaveMessageType] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // ── Modal states ──────────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modalUsername, setModalUsername] = useState('');
  const [modalEmail, setModalEmail] = useState('');

  // ── Load Progress modal ──────────────────────────────────────────
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadIdentifier, setLoadIdentifier] = useState('');
  const [loadMessage, setLoadMessage] = useState('');
  const [loadMessageType, setLoadMessageType] = useState('');
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // ── Logout state ─────────────────────────────────────────────────
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ─── Fetch and load user progress from Supabase ──────────────────
  const loadUserProgress = async (userId) => {
    try {
      const [progressRes, attemptsRes] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', userId),
        supabase.from('quiz_attempts').select('*').eq('user_id', userId),
      ]);

      if (progressRes.error) throw progressRes.error;
      if (attemptsRes.error) throw attemptsRes.error;

      const { data: userData } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .single();

      const loadedProgress = {
        username: userData?.display_name || 'Player',
        playerId: userId.slice(0, 8),
        quizzes: attemptsRes.data.map((a) => ({
          book: a.quiz_id,
          score: a.score,
          total: a.total_questions,
          date: a.completed_at,
        })),
        scripture: {
          booksRead: [...new Set(progressRes.data.map((p) => p.book_name))],
          chaptersRead: progressRes.data.map((p) => `${p.book_name}:${p.chapter}`),
          versesRead: progressRes.data.reduce((sum, p) => sum + (p.verse || 0), 0),
        },
        globalChallenges: [],
        dailyQuizHistory: [],
        playedQuestions: [],
      };

      loadProgress(loadedProgress);
      const key = 'rhema_progress_' + (loadedProgress.username) + ' ' + deviceCode;
      localStorage.setItem(key, JSON.stringify(loadedProgress));
      localStorage.setItem('rhema_current_player', loadedProgress.username + ' ' + deviceCode);
    } catch (err) {
      console.error(' Failed to load progress:', err);
    }
  };

  // ─── Fetch display_name & email from Supabase, and load progress ──
  useEffect(() => {
    if (user) {
      supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setDisplayName(data.display_name || 'Player');
            setSaveUsername(data.display_name || '');
            setModalUsername(data.display_name || '');
            setUserEmail(data.email || '');
            setModalEmail(data.email || '');
            if (data.display_name && data.email) {
              setAutoSaveEnabled(true);
              localStorage.setItem('rhema_auto_save', 'true');
            } else {
              setAutoSaveEnabled(false);
              localStorage.setItem('rhema_auto_save', 'false');
            }
          } else {
            setDisplayName('Player');
            setSaveUsername('');
            setModalUsername('');
            setAutoSaveEnabled(false);
            localStorage.setItem('rhema_auto_save', 'false');
          }
        });

      loadUserProgress(user.id);

      const autoSave = localStorage.getItem('rhema_auto_save') === 'true';
      setAutoSaveEnabled(autoSave);
    }
  }, [user]);

  // ─── Open Save Modal ──────────────────────────────────────────────
  const handleOpenSaveModal = () => {
    if (loading) {
      setSaveMessage(' Still loading authentication...');
      setSaveMessageType('warning');
      return;
    }
    if (!user) {
      setSaveMessage(' No authenticated user. Please refresh the page.');
      setSaveMessageType('error');
      return;
    }
    // If already saved, don't open modal (button hidden anyway)
    if (autoSaveEnabled) return;
    setModalUsername(displayName === 'Player' ? '' : displayName);
    setModalEmail(userEmail || '');
    setShowSaveModal(true);
  };

  // ─── Save after modal submit (email required) ──────────────────
  const confirmSaveProgress = async () => {
    const name = modalUsername.trim() || 'Player';
    const email = modalEmail.trim();

    if (!email) {
      setSaveMessage(' Email is required to save progress.');
      setSaveMessageType('error');
      return;
    }

    setUsername(name);
    setPlayerId(name + ' ' + deviceCode);

    const progressData = {
      username: name,
      playerId: name + ' ' + deviceCode,
      quizzes,
      scripture,
      globalChallenges,
      dailyQuizHistory,
      playedQuestions: [],
    };
    const key = 'rhema_progress_' + (name + ' ' + deviceCode);
    localStorage.setItem(key, JSON.stringify(progressData));
    localStorage.setItem('rhema_current_player', name + ' ' + deviceCode);

    try {
      console.log('📤 Updating Supabase with:', { display_name: name, email });
      const { error } = await supabase
        .from('users')
        .update({
          display_name: name,
          email: email,
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Failed to update user:', error);
        setSaveMessage('❌ Failed to save progress to cloud: ' + error.message);
        setSaveMessageType('error');
      } else {
        console.log('✅ User updated in Supabase:', { name, email });

        // ✅ Link email to the anonymous auth account (so they can log in with it)
        const { error: linkError } = await supabase.auth.updateUser({ email });
        if (linkError) {
          console.warn('⚠️ Failed to link email to auth user:', linkError);
          // The email is already saved in `public.users` – we can retry later.
        } else {
          console.log('✅ Email linked to auth user successfully.');
        }

        setDisplayName(name);
        setUserEmail(email);
        setAutoSaveEnabled(true);
        localStorage.setItem('rhema_auto_save', 'true');
        setSaveMessage(' Progress will now auto save');
        setSaveMessageType('success');
        setShowSaveModal(false);
        const { data: refreshed } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', user.id)
          .single();
        if (refreshed) {
          setDisplayName(refreshed.display_name || name);
          setUserEmail(refreshed.email || '');
        }
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setSaveMessage('❌ Unexpected error. Check console.');
      setSaveMessageType('error');
    }
  };

  // ─── Load Progress – send magic link (secure, no user search) ──
  const handleLoadProgress = async () => {
    const email = loadIdentifier.trim();
    if (!email) {
      setLoadMessage('❌ Please enter your email address.');
      setLoadMessageType('error');
      return;
    }

    setLoadingLoad(true);
    setLoadMessage(` Sending magic link to ${email}...`);
    setLoadMessageType('warning');
    setMagicLinkSent(false);

    try {
      // Optionally, we can set createUser: false to only allow existing accounts
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email: email,
        options: { 
          emailRedirectTo: window.location.origin,
          // createUser: false, // uncomment if you want to only allow existing accounts
        },
      });
      if (magicError) throw magicError;

      setLoadMessage(` Magic link sent to ${email}. Please check your inbox and click the link to log in.`);
      setLoadMessageType('success');
      setMagicLinkSent(true);
    } catch (err) {
      console.error('❌ Load error:', err);
      setLoadMessage('❌ Failed to send magic link. Please try again.');
      setLoadMessageType('error');
    } finally {
      setLoadingLoad(false);
    }
  };

  // ─── Logout handler ──────────────────────────────────────────────
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('rhema_current_player');
      localStorage.removeItem('rhema_auto_save');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      setSaveMessage('❌ Logout failed: ' + error.message);
      setSaveMessageType('error');
    } finally {
      setLogoutLoading(false);
    }
  };

  // ── Compute Stats ──────────────────────────────────────────────────
  const totalCorrect = quizzes.reduce((acc, q) => acc + (q.score || 0), 0) +
                       dailyQuizHistory.reduce((acc, q) => acc + (q.score || 0), 0);
  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.total || 0), 0) +
                         dailyQuizHistory.reduce((acc, q) => acc + (q.total || 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const booksRead = (scripture.booksRead || []).length;
  const versesRead = scripture.versesRead || 0;
  const gcAttempts = globalChallenges.length;
  let gcBest = 0;
  if (gcAttempts > 0) {
    gcBest = Math.max(...globalChallenges.map(g => Math.round(((g.score || 0) / (g.total || 1)) * 100)));
  }

  const bookStats = quizzes.reduce((acc, q) => {
    if (q.book) {
      if (!acc[q.book]) acc[q.book] = { correct: 0, total: 0 };
      acc[q.book].correct += q.score || 0;
      acc[q.book].total += q.total || 0;
    }
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner"></div>
        <p className="text-muted mt-4">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-primary text-2xl font-bold">  Your Progress</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate('/home')}>
          ← Back
        </button>
      </div>

      <div className="player-id-box bg-surface border border-primary rounded-lg p-3 my-3 text-center text-lg font-semibold text-primary">
        Player ID: <span className="text-text">{displayName || 'Player'} {deviceCode}</span>
        {user && <span className="ml-2 text-xs text-success">(Cloud connected)</span>}
        {user && (
          <div className="text-xs text-muted mt-1">
            User ID: {user.id.slice(0, 8)}...
          </div>
        )}
        {userEmail && (
          <div className="text-xs text-muted mt-1">
            Email: {userEmail}
          </div>
        )}
        {autoSaveEnabled && (
          <div className="text-xs text-success mt-1">  Auto‑save active</div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="progress-stats-grid grid grid-cols-2 gap-3 my-3">
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{accuracy}%</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">Quiz Accuracy</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{totalCorrect}/{totalQuestions}</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">Quiz Correct / Total</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{booksRead}</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">Books Read</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{versesRead}</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">Verses Read</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{gcAttempts}</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">Global Challenges</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{gcBest}%</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">Best Challenge</div>
        </div>
      </div>

      {/* Per-Book Stats */}
      <div className="mt-3 text-sm text-muted">
        <strong>Per‑Book Quiz Stats:</strong>
        {Object.keys(bookStats).length === 0 ? ' None yet.' : (
          <ul className="list-none p-0 mt-1">
            {Object.entries(bookStats).map(([book, stats]) => (
              <li key={book} className="py-1 border-b border-[#2a2a2a]">
                {book}: {stats.correct}/{stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-sm text-muted">
          <span>Overall Progress</span>
          <span>{accuracy}%</span>
        </div>
        <div className="progress-bar-container bg-[#2a2a2a] rounded-xl h-5 mt-1 overflow-hidden">
          <div className="progress-bar bg-primary h-full rounded-xl transition-all duration-500" style={{ width: `${accuracy}%` }}></div>
        </div>
      </div>

      {/* ─── Manage Progress ───────────────────────────────────────── */}
      <div className="mt-6 bg-surface rounded-xl p-5 border border-[#2a2a2a]">
        <h3 className="text-primary text-lg font-semibold mb-3">  Manage Progress</h3>
        <p className="text-muted text-sm mb-3">
          {!autoSaveEnabled
            ? "Save your progress with a username and email to create an account."
            : "Your progress is saved."}
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Show Save and Load only if NOT already saved */}
          {!autoSaveEnabled && (
            <>
              <button onClick={handleOpenSaveModal} className="btn !w-auto px-6">
                 Save Progress
              </button>
              <button onClick={() => setShowLoadModal(true)} className="btn-secondary !w-auto px-6">
                 Load Progress
              </button>
            </>
          )}
          {/* Logout button appears only after saving */}
          {autoSaveEnabled && (
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="btn-secondary !w-auto px-6"
            >
              {logoutLoading ? 'Logging out...' : 'Log Out'}
            </button>
          )}
        </div>
        {saveMessage && (
          <div className={`mt-3 text-sm ${saveMessageType === 'success' ? 'text-success' : saveMessageType === 'error' ? 'text-error' : 'text-muted'}`}>
            {saveMessage}
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-muted text-xs">
        {user ? `Logged in as ${displayName || 'Player'} ${deviceCode}` : 'Not logged in'}
        {user && <span className="ml-2 text-success">(Cloud connected)</span>}
      </div>

      {/* ─── Save Modal ────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full border border-[#2a2a2a] shadow-xl">
            <h3 className="text-primary text-xl font-bold mb-2">  Update Profile</h3>
            <p className="text-muted text-sm mb-4">
              Choose a username and provide your email address (required).
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={modalUsername}
                onChange={(e) => setModalUsername(e.target.value)}
                placeholder="Username (required)"
                className="w-full p-3 rounded-lg border border-[#333] bg-surface text-text placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <input
                type="email"
                value={modalEmail}
                onChange={(e) => setModalEmail(e.target.value)}
                placeholder="Email (required)"
                className="w-full p-3 rounded-lg border border-[#333] bg-surface text-text placeholder-gray-400 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={confirmSaveProgress} className="btn flex-1">
                Save
              </button>
              <button onClick={() => setShowSaveModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Load Modal ────────────────────────────────────────────── */}
      {showLoadModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full border border-[#2a2a2a] shadow-xl">
            <h3 className="text-primary text-xl font-bold mb-2">  Load Progress</h3>

            {!magicLinkSent ? (
              <>
                <p className="text-muted text-sm mb-4">
                  Enter the <strong>email</strong> associated with your account. A magic link will be sent to that address.
                </p>
                <input
                  type="text"
                  value={loadIdentifier}
                  onChange={(e) => setLoadIdentifier(e.target.value)}
                  placeholder="Email"
                  className="w-full p-3 rounded-lg border border-[#333] bg-surface text-text placeholder-gray-400 focus:outline-none focus:border-primary mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleLoadProgress}
                    disabled={loadingLoad}
                    className="btn flex-1"
                  >
                    {loadingLoad ? 'Sending...' : 'Send Magic Link'}
                  </button>
                  <button
                    onClick={() => {
                      setShowLoadModal(false);
                      setLoadMessage('');
                      setLoadMessageType('');
                      setMagicLinkSent(false);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
                {loadMessage && (
                  <div className={`mt-3 text-sm ${loadMessageType === 'success' ? 'text-success' : loadMessageType === 'error' ? 'text-error' : 'text-muted'}`}>
                    {loadMessage}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">📧</div>
                  <p className="text-text font-medium mb-2">Check your email!</p>
                  <p className="text-muted text-sm">
                    We sent a magic link to <strong>{loadIdentifier}</strong>. Click the link in the email to log in and load your progress.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLoadModal(false);
                    setLoadMessage('');
                    setLoadMessageType('');
                    setMagicLinkSent(false);
                    setLoadIdentifier('');
                  }}
                  className="btn w-full mt-4"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}