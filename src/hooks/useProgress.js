import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../lib/store';

export const useProgress = (userId) => {
  const { isAnonymous } = useAuth();
  return useQuery({
    queryKey: ['progress', userId],
    queryFn: async () => {
      if (!userId || isAnonymous) return [];
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId && !isAnonymous,
    retry: 1,
    staleTime: 60000,
  });
};

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();
  const { user, isAnonymous } = useAuth();
  const updateScripture = useStore((s) => s.updateScripture);

  return useMutation({
    mutationFn: async ({ userId, book_name, chapter, verse, status }) => {
      // ─── Guest: save locally only, no DB ───────────────────
      if (!user || isAnonymous) {
        console.log('💾 Guest mode — progress saved locally');
        updateScripture(book_name, chapter, verse || 0);
        return { book_name, chapter, verse, status, _local: true };
      }

      // ─── Signed-in: write to DB ────────────────────────────
      console.log('📤 Saving progress to DB:', { book_name, chapter, verse });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mutation timeout after 5 seconds')), 5000);
      });

      const mutationPromise = supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          book_name,
          chapter,
          verse,
          status,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      const result = await Promise.race([mutationPromise, timeoutPromise]);
      if (result.error) throw new Error(result.error.message);
      console.log('✅ Progress saved to DB:', result.data);
      return result.data;
    },
    onSuccess: (data, variables) => {
      if (data?._local) return;
      queryClient.invalidateQueries({ queryKey: ['progress', variables.userId] });
    },
    onError: (error) => {
      console.error('❌ Progress mutation error:', error);
    },
  });
};