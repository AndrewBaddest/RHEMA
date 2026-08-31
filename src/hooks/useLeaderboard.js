// src/hooks/useLeaderboard.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useLeaderboard = () => {
  const [scores, setScores] = useState([]);
  const [challengeDate, setChallengeDate] = useState(null);

  useEffect(() => {
    const fetchLatestDate = async () => {
      // Get the most recent challenge date with scores
      const { data, error } = await supabase
        .from('global_challenge_scores')
        .select('challenge_date')
        .order('challenge_date', { ascending: false })
        .limit(1)
        .single();
      if (!error && data) {
        setChallengeDate(data.challenge_date);
      }
    };

    fetchLatestDate();
  }, []);

  useEffect(() => {
    if (!challengeDate) return;
    const fetchScores = async () => {
      const { data, error } = await supabase
        .from('global_challenge_scores')
        .select('user_id, score, users(display_name)')
        .eq('challenge_date', challengeDate)
        .order('score', { ascending: false })
        .limit(100);
      if (!error) setScores(data);
    };
    fetchScores();

    // Real-time subscription
    const subscription = supabase
      .channel('leaderboard')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'global_challenge_scores' },
        () => fetchScores()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [challengeDate]);

  return { scores, challengeDate };
};