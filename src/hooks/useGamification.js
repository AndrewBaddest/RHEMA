import { useStore } from '../lib/store';
import { useEffect } from 'react';

export function useGamification() {
  const gamification = useStore((state) => state.gamification);
  const addXP = useStore((state) => state.addXP);
  const incrementQuizzes = useStore((state) => state.incrementQuizzes);
  const updateStreak = useStore((state) => state.updateStreak);
  const unlockBadge = useStore((state) => state.unlockBadge);
  const checkAchievements = useStore((state) => state.checkAchievements);

  // Update streak on app load and periodically
  useEffect(() => {
    updateStreak();
  }, []);

  return { gamification, addXP, incrementQuizzes, updateStreak, unlockBadge, checkAchievements };
}