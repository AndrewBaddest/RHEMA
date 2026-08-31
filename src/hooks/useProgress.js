import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useProgress = (userId) => {
  return useQuery({
    queryKey: ['progress', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId,
    retry: 1, // Only retry once
    staleTime: 60000, // Cache for 1 minute
  });
};

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, book_name, chapter, verse, status }) => {
      console.log('🔵 Mutation called with:', { userId, book_name, chapter, verse, status });
      
      // Add a timeout to prevent hanging
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
      console.log('✅ Mutation successful:', result.data);
      return result.data;
    },
    onSuccess: (data, variables) => {
      console.log('🔄 Invalidating progress query for user:', variables.userId);
      queryClient.invalidateQueries({ queryKey: ['progress', variables.userId] });
    },
    onError: (error) => {
      console.error('❌ Mutation error:', error);
    },
  });
};