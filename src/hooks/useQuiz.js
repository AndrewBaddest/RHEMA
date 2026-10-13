import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../lib/store';

export const useSaveQuizAttempt = () => {
  const queryClient = useQueryClient();
  const { user, isAnonymous } = useAuth();
  const addQuizResult = useStore((s) => s.addQuizResult);
  const addDailyQuizResult = useStore((s) => s.addDailyQuizResult);

  return useMutation({
    mutationFn: async ({ userId, quizId, score, totalQuestions, answers }) => {
      // ─── Guest: save locally only, no DB ───────────────────
      if (!user || isAnonymous) {
        console.log('💾 Guest mode — quiz result saved locally');
        const local = {
          book: quizId,
          score,
          total: totalQuestions,
          date: new Date().toISOString(),
          answers,
        };
        if (quizId === 'daily') {
          addDailyQuizResult(local);
        } else {
          addQuizResult(local);
        }
        return { ...local, _local: true };
      }

      // ─── Signed-in: write to DB ────────────────────────────
      console.log('📤 Saving quiz attempt to DB:', { quizId, score, totalQuestions });
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
      console.log('✅ Quiz attempt saved to DB:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      if (data?._local) return; // nothing to invalidate for local saves
      queryClient.invalidateQueries({ queryKey: ['quizAttempts', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['playedQuestions', variables.userId] });
    },
    onError: (error) => {
      console.error('❌ Quiz save error in mutation:', error);
    },
  });
};

export const usePlayedQuestions = (userId) => {
  const { isAnonymous } = useAuth();
  return useQuery({
    queryKey: ['playedQuestions', userId],
    queryFn: async () => {
      if (!userId || isAnonymous) return [];
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('answers')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      const playedRefs = data?.flatMap((attempt) => attempt.answers || []) || [];
      return [...new Set(playedRefs)];
    },
    enabled: !!userId && !isAnonymous,
    staleTime: 60000,
    retry: 1,
  });
};

export const useQuizAttempts = (userId) => {
  const { isAnonymous } = useAuth();
  return useQuery({
    queryKey: ['quizAttempts', userId],
    queryFn: async () => {
      if (!userId || isAnonymous) return [];
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId && !isAnonymous,
    staleTime: 60000,
  });
};

export const useAverageScore = (userId) => {
  const { isAnonymous } = useAuth();
  return useQuery({
    queryKey: ['averageScore', userId],
    queryFn: async () => {
      if (!userId || isAnonymous) return 0;
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('score, total_questions')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return 0;
      const totalScore = data.reduce((sum, a) => sum + a.score, 0);
      const totalQuestions = data.reduce((sum, a) => sum + a.total_questions, 0);
      return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    },
    enabled: !!userId && !isAnonymous,
    staleTime: 60000,
  });
};