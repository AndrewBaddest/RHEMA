import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useSubmitChallengeScore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, score }) => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('global_challenge_scores')
        .upsert({
          user_id: userId,
          score,
          challenge_date: today,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
};