import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureUserRecord = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.warn('⚠️ User check failed:', error.message);
        return false;
      }
      if (data) {
        console.log('✅ User already exists:', userId);
        return true;
      }
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: userId, created_at: new Date().toISOString() });
      if (insertError) {
        if (insertError.code === '23505') {
          console.log('✅ User inserted by another request:', userId);
          return true;
        }
        console.error('❌ Insert failed:', insertError.message);
        return false;
      }
      console.log('✅ User inserted successfully:', userId);
      return true;
    } catch (err) {
      console.error('❌ ensureUserRecord error:', err);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setUserAndLoading = (userData) => {
      if (!isMounted) return;
      setUser(userData);
      setLoading(false);
      if (userData) {
        ensureUserRecord(userData.id).catch(console.error);
      }
    };

    // 1. Listen for auth changes (this will fire after sign-in)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      if (session?.user) {
        console.log('👤 User from event:', session.user.id);
        setUserAndLoading(session.user);
      } else {
        console.log('🚪 No user in session');
        setUserAndLoading(null);
      }
    });

    // 2. Check for an existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        console.log('🔐 Initial session found:', session.user.id);
        setUserAndLoading(session.user);
      } else {
        console.log('🔑 No session – signing in anonymously...');
        // ✅ Trigger anonymous sign-in
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error('❌ Anonymous sign-in error:', error);
            setLoading(false);
          } else if (data?.user) {
            console.log('👤 New anonymous user:', data.user.id);
            setUserAndLoading(data.user);
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error('❌ Sign-in exception:', err);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};