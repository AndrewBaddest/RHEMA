import { useStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import SignInPrompt from '../shared/SignInPrompt';

export default function Progress() {
  const navigate = useNavigate();
  const { user, loading, isAnonymous, profile, updateDisplayName } = useAuth();
  const { requireAuth, promptOpen, reason, closePrompt } = useRequireAuth();

  const loadProgress = useStore((s) => s.loadProgress);
  const resetProgress = useStore((s) => s.resetProgress);

  const quizzes = useStore((s) => s.quizzes || []);
  const scripture = useStore((s) => s.scripture || {
    booksRead: [],
    chaptersRead: [],
    versesRead: 0,
  });
  const globalChallenges = useStore((s) => s.globalChallenges || []);
  const dailyQuizHistory = useStore((s) => s.dailyQuizHistory || []);

  const [logoutLoading, setLogoutLoading] = useState(false);

  // Rename UI
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameMsg, setRenameMsg] = useState('');

  // ─── Load remote progress for signed-in users ────────────────
  useEffect(() => {
    if (!user || isAnonymous) return;
    loadUserProgress(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAnonymous]);

  const loadUserProgress = async (userId) => {
    try {
      const [progressRes, attemptsRes] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', userId),
        supabase.from('quiz_attempts').select('*').eq('user_id', userId),
      ]);

      if (progressRes.error) throw progressRes.error;
      if (attemptsRes.error) throw attemptsRes.error;

      // 👇 THE MAGIC: Back up any local guest data before overwriting it
      const currentState = useStore.getState();
      if (currentState.quizzes.length > 0 || currentState.scripture.versesRead > 0) {
        localStorage.setItem('rhema_guest_backup', JSON.stringify(currentState));
        console.log('💾 Guest data backed up safely.');
      }

      const loadedProgress = {
        username: profile.username || 'Player',
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
        globalChallenges: currentState.globalChallenges || [],
        dailyQuizHistory: currentState.dailyQuizHistory || [],
        playedQuestions: currentState.playedQuestions || [],
      };

      loadProgress(loadedProgress);
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
  };

  // ─── Logout (Silently Restores Guest Data) ───────────────────
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      // 1. Wipe the account data from the screen
      resetProgress(); 

      // 2. Check for a guest backup and restore it
      const backup = localStorage.getItem('rhema_guest_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        loadProgress(parsed);
        localStorage.removeItem('rhema_guest_backup');
        console.log('🔄 Guest data restored.');
      }

      // 3. Clear auth keys and sign out
      localStorage.removeItem('rhema_current_player');
      localStorage.removeItem('rhema_auto_save');
      localStorage.removeItem('rhema_device_code');
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLogoutLoading(false);
    }
  };

  // ─── Rename handlers ─────────────────────────────────────────
  const openRename = () => {
    setRenameValue(profile.username || 'Player');
    setRenameMsg('');
    setRenaming(true);
  };

  const saveRename = async () => {
    setRenameBusy(true);
    setRenameMsg('');
    try {
      const result = await updateDisplayName(renameValue);
      setRenameMsg(`✅ Updated to "${result}"`);
      setTimeout(() => setRenaming(false), 900);
    } catch (err) {
      setRenameMsg(`❌ ${err.message || 'Could not update name'}`);
    } finally {
      setRenameBusy(false);
    }
  };

  // ─── Stats ───────────────────────────────────────────────────
  const totalCorrect =
    quizzes.reduce((acc, q) => acc + (q.score || 0), 0) +
    dailyQuizHistory.reduce((acc, q) => acc + (q.score || 0), 0);
  const totalQuestions =
    quizzes.reduce((acc, q) => acc + (q.total || 0), 0) +
    dailyQuizHistory.reduce((acc, q) => acc + (q.total || 0), 0);
  const accuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const booksRead = (scripture.booksRead || []).length;
  const versesRead = scripture.versesRead || 0;
  const gcAttempts = globalChallenges.length;
  let gcBest = 0;
  if (gcAttempts > 0) {
    gcBest = Math.max(
      ...globalChallenges.map((g) =>
        Math.round(((g.score || 0) / (g.total || 1)) * 100)
      )
    );
  }

  const bookStats = quizzes.reduce((acc, q) => {
    if (q.book) {
      if (!acc[q.book]) acc[q.book] = { correct: 0, total: 0 };
      acc[q.book].correct += q.score || 0;
      acc[q.book].total += q.total || 0;
    }
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner"></div>
        <p className="text-muted mt-4">Loading your profile...</p>
      </div>
    );
  }

  const displayName = profile.displayName || 'Player';

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-primary text-2xl font-bold">📊 Your Progress</h2>
        <button
          className="btn-secondary !w-auto !py-2 !px-4 text-sm"
          onClick={() => navigate('/home')}
        >
          ← Back
        </button>
      </div>

      {/* Player ID card */}
      <div className="player-id-box bg-surface border border-primary rounded-lg p-3 my-3 text-center text-lg font-semibold text-primary">
        Player ID: <span className="text-text">{displayName}</span>
        {user && !isAnonymous && (
          <span className="ml-2 text-xs text-success">(Cloud connected)</span>
        )}
        {isAnonymous && (
          <span className="ml-2 text-xs text-muted">(Guest)</span>
        )}
        {user && (
          <div className="text-xs text-muted mt-1">
            User ID: {user.id.slice(0, 8)}...
          </div>
        )}
        {profile.email && (
          <div className="text-xs text-muted mt-1">Email: {profile.email}</div>
        )}

        {user && !renaming && (
          <div className="mt-2">
            <button
              onClick={openRename}
              className="text-xs text-primary underline hover:no-underline"
            >
              ✏️ Change name
            </button>
          </div>
        )}

        {user && renaming && (
          <div className="mt-3 flex flex-col gap-2 max-w-xs mx-auto text-left">
            <div className="text-xs text-muted text-center">
              Shown as <strong className="text-text">{renameValue || 'Player'}</strong>
            </div>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={20}
              placeholder="Your name"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={saveRename}
                disabled={renameBusy || !renameValue.trim()}
                className="btn flex-1 !py-2 !text-sm"
              >
                {renameBusy ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setRenaming(false)}
                className="btn-secondary flex-1 !py-2 !text-sm"
              >
                Cancel
              </button>
            </div>
            {renameMsg && <div className="text-xs text-center">{renameMsg}</div>}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="progress-stats-grid grid grid-cols-2 gap-3 my-3">
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{accuracy}%</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">
            Quiz Accuracy
          </div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">
            {totalCorrect}/{totalQuestions}
          </div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">
            Quiz Correct / Total
          </div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{booksRead}</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">
            Books Read
          </div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{versesRead}</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">
            Verses Read
          </div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{gcAttempts}</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">
            Global Challenges
          </div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-4 text-center">
          <div className="stat-number text-3xl font-bold text-primary">{gcBest}%</div>
          <div className="stat-label text-xs text-muted uppercase tracking-wide mt-1">
            Best Challenge
          </div>
        </div>
      </div>

      {/* Per-book stats */}
      <div className="mt-3 text-sm text-muted">
        <strong>Per‑Book Quiz Stats:</strong>
        {Object.keys(bookStats).length === 0 ? (
          ' None yet.'
        ) : (
          <ul className="list-none p-0 mt-1">
            {Object.entries(bookStats).map(([book, stats]) => (
              <li key={book} className="py-1 border-b border-[#2a2a2a]">
                {book}: {stats.correct}/{stats.total} (
                {Math.round((stats.correct / stats.total) * 100)}%)
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="mt-3">
        <div className="flex justify-between text-sm text-muted">
          <span>Overall Progress</span>
          <span>{accuracy}%</span>
        </div>
        <div className="progress-bar-container bg-[#2a2a2a] rounded-xl h-5 mt-1 overflow-hidden">
          <div
            className="progress-bar bg-primary h-full rounded-xl transition-all duration-500"
            style={{ width: `${accuracy}%` }}
          ></div>
        </div>
      </div>

      {/* ─── Manage Progress ─────────────────────────────────── */}
      <div className="mt-6 bg-surface rounded-xl p-5 border border-[#2a2a2a]">
        <h3 className="text-primary text-lg font-semibold mb-3">📊 Manage Progress</h3>

        {isAnonymous ? (
          <>
            <p className="text-muted text-sm mb-3">
              You're playing as a guest. Your progress is saved on this device
              only.{' '}
              <strong className="text-error">
                Clearing browser data will erase it.
              </strong>{' '}
              Sign in to keep it safe across devices and to unlock multiplayer
              duels.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  requireAuth(
                    () => {},
                    'Sign in to save your progress'
                  )
                }
                className="btn !w-auto px-6"
              >
                🔒 Sign in to save
              </button>
              <button
                onClick={() =>
                  requireAuth(
                    () => {},
                    'Sign in to load your existing progress'
                  )
                }
                className="btn-secondary !w-auto px-6"
              >
                📥 Load progress
              </button>
            </div>

            <p className="text-muted text-xs mt-3">
              Already played on another device? Use{' '}
              <strong className="text-text">Load progress</strong> and pick the
              Google account you used before.
            </p>
          </>
        ) : (
          <>
            <p className="text-success text-sm mb-3">
              ✅ Your progress is synced to your account across devices.
            </p>
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="btn-secondary !w-auto px-6"
            >
              {logoutLoading ? 'Logging out...' : 'Log Out / Switch account'}
            </button>
            <p className="text-muted text-xs mt-3">
              Want to use a different account? Log out and sign in with the
              other Google account — your data is tied to each account.
            </p>
          </>
        )}
      </div>

      <div className="mt-3 text-center text-muted text-xs">
        {user
          ? isAnonymous
            ? `Playing as guest · ${displayName}`
            : `Signed in as ${displayName}`
          : 'Not signed in'}
      </div>

      {/* Sign-in prompt for gated actions */}
      <SignInPrompt open={promptOpen} reason={reason} onClose={closePrompt} />
    </div>
  );
}