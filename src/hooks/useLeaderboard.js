// src/hooks/useLeaderboard.js
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useLeaderboard = () => {
  const [scores, setScores] = useState([]);
  const [challengeDate, setChallengeDate] = useState(null);

  const fetchLatestDate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('global_challenge_scores')
        .select('challenge_date')
        .order('challenge_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Using today as fallback:', error);
        setChallengeDate(new Date().toISOString().split('T')[0]);
      } else if (data?.challenge_date) {
        setChallengeDate(data.challenge_date);
      } else {
        setChallengeDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.warn('⚠️ Exception, using today:', err);
      setChallengeDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  const fetchScores = useCallback(async () => {
    if (!challengeDate) return;
    const { data, error } = await supabase
      .from('global_challenge_scores')
      .select('user_id, score, users(display_name)')
      .eq('challenge_date', challengeDate)
      .order('score', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('⚠️ Failed to fetch scores:', error);
      setScores([]);
    } else {
      setScores(data || []);
    }
  }, [challengeDate]);

  useEffect(() => {
    fetchLatestDate();
  }, [fetchLatestDate]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Real‑time subscription
  useEffect(() => {
    if (!challengeDate) return;
    const subscription = supabase
      .channel('leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_challenge_scores' },
        () => fetchScores()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [challengeDate, fetchScores]);

  // ✅ Expose refetch function
  return { scores, challengeDate, refetch: fetchScores };
};