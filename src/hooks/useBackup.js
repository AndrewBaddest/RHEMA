import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useSaveBackup = () => {
  return useMutation({
    mutationFn: async ({ username, playerId, progressData }) => {
      const { data, error } = await supabase
        .from('user_backups')
        .insert({
          username,
          player_id: playerId,
          progress_data: progressData,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useLoadBackup = (username, playerId) => {
  return useQuery({
    queryKey: ['backup', username, playerId],
    queryFn: async () => {
      if (!username || !playerId) return null;
      const { data, error } = await supabase
        .from('user_backups')
        .select('progress_data')
        .eq('username', username)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // no rows
        throw new Error(error.message);
      }
      return data?.progress_data || null;
    },
    enabled: !!username && !!playerId,
    retry: 1,
  });
};