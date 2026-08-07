import { useStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { initDevice } from '../../lib/utils';
import { useEffect, useState } from 'react';

export default function Progress() {
  const navigate = useNavigate();

  // Store data & actions
  const username = useStore((state) => state.username || 'Player');
  const setUsername = useStore((state) => state.setUsername);
  const setPlayerId = useStore((state) => state.setPlayerId);
  const quizzes = useStore((state) => state.quizzes || []);
  const scripture = useStore((state) => state.scripture || { booksRead: [], chaptersRead: [], versesRead: 0 });
  const globalChallenges = useStore((state) => state.globalChallenges || []);
  const dailyQuizHistory = useStore((state) => state.dailyQuizHistory || []);
  const playerId = useStore((state) => state.playerId || '');

  const deviceCode = initDevice();

  // ── Save state ──────────────────────────────────────────────────
  const [saveUsername, setSaveUsername] = useState(username);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageType, setSaveMessageType] = useState('');

  // Load leaderboard from localStorage
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('rhema_global_leaderboard');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        data.sort((a, b) => (b.score || 0) - (a.score || 0));
        setLeaderboard(data.slice(0, 10));
      } catch (e) {}
    }
  }, []);

  // ─── Save Progress ────────────────────────────────────────────────
  const handleSaveProgress = () => {
    const name = saveUsername.trim() || 'Player';
    const newPlayerId = name + ' ' + deviceCode;

    setUsername(name);
    setPlayerId(newPlayerId);

    const progressData = {
      username: name,
      playerId: newPlayerId,
      quizzes,
      scripture,
      globalChallenges,
      dailyQuizHistory,
      playedQuestions: [],
    };

    const key = 'rhema_progress_' + newPlayerId;
    localStorage.setItem(key, JSON.stringify(progressData));
    localStorage.setItem('rhema_current_player', newPlayerId);

    setSaveMessage(`  Progress saved for ${name} ${deviceCode}!`);
    setSaveMessageType('success');
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-primary text-2xl font-bold">  Your Progress</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate('/home')}>
          ← Back
        </button>
      </div>

      <div className="player-id-box bg-surface border border-primary rounded-lg p-3 my-3 text-center text-lg font-semibold text-primary">
        Player ID: <span className="text-text">{username} {deviceCode}</span>
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

      {/* ─── Global Challenge Leaderboard ──────────────────────────── */}
      <div className="mt-6">
        <h3 className="text-primary text-lg font-semibold mb-2">🏆 Global Challenge Leaderboard</h3>
        <div className="bg-surface border border-[#2a2a2a] rounded-xl overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-4 text-muted text-center">No global challenge data yet.</div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                let rankClass = '';
                let trophy = '';
                if (rank === 1) { rankClass = 'gold'; trophy = '🥇'; }
                else if (rank === 2) { rankClass = 'silver'; trophy = '🥈'; }
                else if (rank === 3) { rankClass = 'bronze'; trophy = '🥉'; }
                return (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#222] transition-colors">
                    <span className={`font-bold text-lg w-8 text-center ${rankClass}`}>
                      {trophy || `#${rank}`}
                    </span>
                    <span className="flex-1 font-medium">{entry.name || 'Anonymous'}</span>
                    <span className="text-primary font-bold">
                      {entry.score || 0}% ({entry.correct || 0}/{entry.total || 0})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Save Progress Section ────────────────────────────────── */}
      <div className="mt-6 bg-surface rounded-xl p-5 border border-[#2a2a2a]">
        <h3 className="text-primary text-lg font-semibold mb-3">  Save Progress</h3>
        <p className="text-muted text-sm mb-3">
          Choose a username and save your progress to this device. This will update your Player ID.
        </p>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={saveUsername}
            onChange={(e) => setSaveUsername(e.target.value)}
            placeholder="Your username"
            className="flex-1 min-w-[200px] p-3 rounded-lg border border-[#333] bg-surface text-text placeholder-gray-400 focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSaveProgress}
            className="btn !w-auto px-6"
          >
              Save Progress
          </button>
        </div>
        {saveMessage && (
          <div className={`mt-3 text-sm ${saveMessageType === 'success' ? 'text-success' : 'text-muted'}`}>
            {saveMessage}
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-muted text-xs">
        {username ? `Logged in as ${username} ${deviceCode}` : 'Not logged in'}
      </div>
    </div>
  );
}