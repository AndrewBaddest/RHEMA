import { supabase } from './supabase';

/**
 * One-shot: called after an anonymous user upgrades to Google/email.
 * Reads local Zustand-persisted state and uploads under the same user_id.
 *
 * Zodiac: this runs once per user, gated by a localStorage flag in AuthContext.
 */
export async function mergeLocalProgress(userId) {
  const raw = localStorage.getItem('rhema-storage');
  if (!raw) return { merged: 0, reason: 'no local data' };

  let state = {};
  try {
    const parsed = JSON.parse(raw);
    state = parsed?.state || {};
  } catch {
    return { merged: 0, reason: 'corrupt local data' };
  }

  const quizzes = state.quizzes || [];
  const dailyQuizHistory = state.dailyQuizHistory || [];
  const scripture = state.scripture || {};
  const chaptersRead = scripture.chaptersRead || [];

  const allQuizzes = [...quizzes, ...dailyQuizHistory];
  let mergedCount = 0;

  // ─── 1. Upload quiz attempts ─────────────────────────────────
  if (allQuizzes.length > 0) {
    const rows = allQuizzes
      .filter((q) => typeof q.score === 'number' && typeof q.total === 'number')
      .map((q) => ({
        user_id: userId,
        quiz_id: q.book || 'mixed',
        score: q.score,
        total_questions: q.total,
        completed_at: q.date || new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from('quiz_attempts').insert(rows);
      if (error) {
        console.warn('mergeProgress: quiz_attempts insert failed:', error.message);
      } else {
        mergedCount += rows.length;
      }
    }
  }

  // ─── 2. Upload scripture progress ────────────────────────────
  if (chaptersRead.length > 0) {
    const rows = chaptersRead
      .map((key) => {
        const [book_name, chapterStr] = String(key).split(':');
        const chapter = parseInt(chapterStr, 10);
        if (!book_name || Number.isNaN(chapter)) return null;
        return { user_id: userId, book_name, chapter };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      const { error } = await supabase.from('user_progress').insert(rows);
      if (error) {
        console.warn('mergeProgress: user_progress insert failed:', error.message);
      } else {
        mergedCount += rows.length;
      }
    }
  }

  return { merged: mergedCount };
}