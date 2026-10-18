/**
 * Pure logic for the multiplayer duel.
 * Extracted from Challenge.jsx so it can be unit-tested without mocking React or Supabase.
 */

export function calculateNextScore(currentScore, isCorrect) {
  return isCorrect ? currentScore + 1 : currentScore;
}

export function canFinishDuel(localFinished, opponentFinished) {
  return Boolean(localFinished && opponentFinished);
}