import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useSaveQuizAttempt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, quizId, score, totalQuestions, answers }) => {
      console.log('📤 Saving quiz attempt:', { userId, quizId, score, totalQuestions });
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          quiz_id: quizId,
          score,
          total_questions: totalQuestions,
          answers,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Quiz attempt saved:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      console.log('🔄 Invalidating queries for user:', variables.userId);
      queryClient.invalidateQueries({ queryKey: ['quizAttempts', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['playedQuestions', variables.userId] });
    },
    onError: (error) => {
      console.error('❌ Quiz save error in mutation:', error);
      // You can add a toast notification here if you have one
    },
  });
};

export const usePlayedQuestions = (userId) => {
  return useQuery({
    queryKey: ['playedQuestions', userId],
    queryFn: async () => {
      if (!userId) {
        console.log('⚠️ usePlayedQuestions: No userId provided');
        return [];
      }
      
      console.log('🔍 Fetching played questions for user:', userId);
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('answers')
        .eq('user_id', userId);
        
      if (error) {
        console.error('❌ Error fetching played questions:', error);
        throw new Error(error.message);
      }
      
      // Extract all question references from answers
      // Each answer array contains indices of selected options
      // For now, we return empty array – filtering is handled by quiz engine
      const playedRefs = data?.flatMap(attempt => attempt.answers || []) || [];
      console.log(`📊 Found ${playedRefs.length} played question references`);
      
      // Return unique refs only
      return [...new Set(playedRefs)];
    },
    enabled: !!userId,
    staleTime: 60000, // Cache for 1 minute
    retry: 1,
  });
};

// Optional: Fetch all quiz attempts for a user (for progress tracking)
export const useQuizAttempts = (userId) => {
  return useQuery({
    queryKey: ['quizAttempts', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
        
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60000,
  });
};

// Optional: Get average score for a user
export const useAverageScore = (userId) => {
  return useQuery({
    queryKey: ['averageScore', userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('score, total_questions')
        .eq('user_id', userId);
        
      if (error) throw new Error(error.message);
      
      if (!data || data.length === 0) return 0;
      
      const totalScore = data.reduce((sum, attempt) => sum + attempt.score, 0);
      const totalQuestions = data.reduce((sum, attempt) => sum + attempt.total_questions, 0);
      
      return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    },
    enabled: !!userId,
    staleTime: 60000,
  });
};