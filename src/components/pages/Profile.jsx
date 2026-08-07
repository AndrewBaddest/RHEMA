import { useStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { ACHIEVEMENTS, THEMES } from '../../lib/store';

export default function Profile() {
  const navigate = useNavigate();
  const gamification = useStore((state) => state.gamification);
  const scripture = useStore((state) => state.scripture);
  const selectTheme = useStore((state) => state.selectTheme);

  const { xp, level, title, streak, total_quizzes, perfect_quizzes, unlocked_badges, unlocked_themes, selected_theme } = gamification;
  const booksRead = scripture.booksRead.length;

  const nextLevelXp = level * 100;
  const xpProgress = Math.min(Math.round((xp / nextLevelXp) * 100), 100);

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-primary text-2xl font-bold">👤 My Profile</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate('/home')}>
          ← Back
        </button>
      </div>

      {/* XP & Level */}
      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-5xl">{getTitleEmoji(title)}</div>
          <div>
            <p className="text-2xl font-bold text-primary">{title}</p>
            <p className="text-muted">Level {level}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-semibold">{xp} XP</p>
            <p className="text-sm text-muted">Next level: {nextLevelXp - xp} XP</p>
          </div>
        </div>
        <div className="progress-bar-container bg-[#2a2a2a] rounded-xl h-3 mt-2 overflow-hidden">
          <div className="progress-bar bg-primary h-full rounded-xl transition-all duration-500" style={{ width: `${xpProgress}%` }}></div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-primary">{streak}</div>
          <div className="text-xs text-muted uppercase">🔥 Streak</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-primary">{total_quizzes}</div>
          <div className="text-xs text-muted uppercase">📚 Quizzes</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-primary">{perfect_quizzes}</div>
          <div className="text-xs text-muted uppercase">💯 Perfect</div>
        </div>
        <div className="stat-card bg-surface border border-[#2a2a2a] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-primary">{booksRead}</div>
          <div className="text-xs text-muted uppercase">📖 Books Read</div>
        </div>
      </div>

      {/* Badges */}
      <h3 className="text-primary text-lg font-semibold mb-2">🏅 Badges</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {ACHIEVEMENTS.map(a => {
          const earned = unlocked_badges.includes(a.id);
          return (
            <div key={a.id} className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${earned ? 'border-primary bg-primary/10 text-primary' : 'border-[#333] text-muted opacity-50'}`}>
              <span>{a.icon}</span>
              <span>{earned ? a.name : '🔒'}</span>
            </div>
          );
        })}
      </div>

      {/* Themes */}
      <h3 className="text-primary text-lg font-semibold mb-2">🎨 Themes</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(THEMES).map(([key, theme]) => {
          const unlocked = unlocked_themes.includes(key) || key === 'default';
          return (
            <button
              key={key}
              className={`px-3 py-1 rounded-full text-sm border transition-all ${selected_theme === key ? 'border-primary bg-primary/20' : 'border-[#333] hover:border-primary'} ${!unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={!unlocked}
              onClick={() => unlocked && selectTheme(key)}
              style={{ background: unlocked ? theme.bg : 'transparent', color: unlocked ? theme.text : 'var(--muted)' }}
            >
              {theme.name} {!unlocked && '🔒'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getTitleEmoji(title) {
  const map = { Seeker: '🔍', Disciple: '📖', Scribe: '✍️', Prophet: '🔥', Apostle: '⚡', Saint: '✨' };
  return map[title] || '👤';
}