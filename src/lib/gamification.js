// ─── XP & LEVELING ──────────────────────────────────────────────────
export const XP_PER_LEVEL = 100;

export function calculateLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function getTitleForLevel(level) {
  if (level <= 5) return 'Seeker';
  if (level <= 15) return 'Disciple';
  if (level <= 30) return 'Scribe';
  if (level <= 50) return 'Prophet';
  if (level <= 75) return 'Apostle';
  return 'Saint';
}

// ─── STREAK ─────────────────────────────────────────────────────────
export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export function getStreak(lastActiveDate, today) {
  if (!lastActiveDate) return 0;
  const last = new Date(lastActiveDate);
  const now = new Date(today);
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return currentStreak; // we'll pass current streak
  if (diffDays === 1) return currentStreak + 1;
  return 0; // broke streak
}

// ─── ACHIEVEMENTS ────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_quiz', name: 'First Steps', description: 'Complete your first quiz', icon: '🌱', category: 'Quiz Master', requirement: { type: 'total_quizzes', value: 1 }, rewardXp: 10 },
  { id: 'quiz_10', name: 'Quiz Enthusiast', description: 'Complete 10 quizzes', icon: '📚', category: 'Quiz Master', requirement: { type: 'total_quizzes', value: 10 }, rewardXp: 50 },
  { id: 'quiz_50', name: 'Quiz Scholar', description: 'Complete 50 quizzes', icon: '🏆', category: 'Quiz Master', requirement: { type: 'total_quizzes', value: 50 }, rewardXp: 150 },
  { id: 'perfect_3', name: 'Perfect Score', description: 'Get 100% on 3 quizzes', icon: '💯', category: 'Quiz Master', requirement: { type: 'perfect_quizzes', value: 3 }, rewardXp: 30 },
  { id: 'perfect_10', name: 'Flawless', description: 'Get 100% on 10 quizzes', icon: '⭐', category: 'Quiz Master', requirement: { type: 'perfect_quizzes', value: 10 }, rewardXp: 100 },
  { id: 'books_5', name: 'Bookworm', description: 'Read 5 books', icon: '📖', category: 'Bookworm', requirement: { type: 'books_read', value: 5 }, rewardXp: 25 },
  { id: 'books_27', name: 'Scripture Reader', description: 'Read 27 books', icon: '📜', category: 'Bookworm', requirement: { type: 'books_read', value: 27 }, rewardXp: 100 },
  { id: 'books_66', name: 'Bible Scholar', description: 'Read all 66 books', icon: '✝️', category: 'Bookworm', requirement: { type: 'books_read', value: 66 }, rewardXp: 500 },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day streak', icon: '🔥', category: 'Streak', requirement: { type: 'streak', value: 7 }, rewardXp: 50 },
  { id: 'streak_30', name: 'Month Master', description: '30-day streak', icon: '🌟', category: 'Streak', requirement: { type: 'streak', value: 30 }, rewardXp: 200 },
  { id: 'global_top10', name: 'Global Challenger', description: 'Finish in top 10 of a global challenge', icon: '🌍', category: 'Competitive', requirement: { type: 'global_rank', value: 10 }, rewardXp: 100 },
  { id: 'global_winner', name: 'Global Champion', description: 'Win a global challenge', icon: '👑', category: 'Competitive', requirement: { type: 'global_rank', value: 1 }, rewardXp: 500 },
];

// ─── BADGE CATEGORIES ──────────────────────────────────────────────
export const BADGE_CATEGORIES = ['Quiz Master', 'Bookworm', 'Streak', 'Competitive', 'Explorer'];

// ─── THEMES ─────────────────────────────────────────────────────────
export const THEMES = {
  default: { name: 'Default', primary: '#d4af37', bg: '#121212', surface: '#1e1e1e', text: '#ffffff' },
  royal: { name: 'Royal Gold', primary: '#ffd700', bg: '#1a0a00', surface: '#2a1500', text: '#fff5e6' },
  midnight: { name: 'Midnight Blue', primary: '#4a9eff', bg: '#0a0e1a', surface: '#141e33', text: '#e6f0ff' },
  forest: { name: 'Forest Green', primary: '#2ecc71', bg: '#0a1a0a', surface: '#142814', text: '#e6f5e6' },
  rose: { name: 'Rose', primary: '#ff6b81', bg: '#1a0a0a', surface: '#2a1414', text: '#f5e6e6' },
};