import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { mergeLocalProgress } from '../lib/mergeProgress';
import { generateDeviceCode } from '../lib/utils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [profile, setProfile] = useState({
    displayName: '',
    deviceCode: '',
    email: '',
  });
  const initDone = useRef(false);

  // ─── Detect anonymous ─────────────────────────────────────────
  const detectAnonymous = (authUser) => {
    if (!authUser) return true;
    if (typeof authUser.is_anonymous === 'boolean') return authUser.is_anonymous;
    const providers = authUser.identities?.map((i) => i.provider) || [];
    const hasRealProvider = providers.some((p) => p !== 'anonymous');
    return !hasRealProvider && !authUser.email;
  };

  // ─── Load or create the public.users row ──────────────────────
  const loadOrCreateProfile = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('display_name, device_code, email')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return {
        displayName: data.display_name || '',
        deviceCode: data.device_code || '',
        email: data.email || '',
      };
    }

    const deviceCode = generateDeviceCode();
    const displayName = `Player ${deviceCode}`;

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        display_name: displayName,
        device_code: deviceCode,
        created_at: new Date().toISOString(),
      });

    if (insertError && insertError.code !== '23505') {
      console.warn('loadOrCreateProfile insert error:', insertError.message);
    }

    return { displayName, deviceCode, email: '' };
  };

  // ─── Sync auth metadata into public.users ─────────────────────
  const syncPublicUser = async (authUser) => {
    if (!authUser) return;
    const { id, email, user_metadata } = authUser;

    let displayName = user_metadata?.full_name || user_metadata?.name || null;
    if (!displayName && email) displayName = email.split('@')[0];

    const updates = {};
    if (email) updates.email = email;

    const { data: current } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', id)
      .maybeSingle();

    const isDefaultName =
      !current?.display_name || /^Player \d+$/.test(current.display_name);
    if (displayName && isDefaultName) updates.display_name = displayName;

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error && error.code !== 'PGRST116') {
      console.warn('syncPublicUser error:', error.message);
    }
  };

  const setUserAndLoading = (userData) => {
    setUser(userData);
    setLoading(false);
    setIsAnonymous(detectAnonymous(userData));
    if (!userData) {
      setProfile({ displayName: '', deviceCode: '', email: '' });
    }
  };

  // ─── Google upgrade (OAuth redirect, in-place, preserves UID) ──
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };
  const linkWithGoogle = signInWithGoogle;

  // ─── Google One Tap: sign in with an ID token (JWT) ───────────
  // One Tap returns a signed JWT credential. Supabase verifies it and
  // issues a session. Because the user already had an anonymous session,
  // Supabase links the Google identity to the SAME user_id — so local
  // progress + merge flow continues to work.
  const signInWithGoogleIdToken = async (credential) => {
    if (!credential) throw new Error('Missing Google credential');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
    });
    if (error) throw error;
    return data;
  };

  // ─── Bootstrap ────────────────────────────────────────────────
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserAndLoading(session.user);
      } else {
        setUserAndLoading(null);
      }
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          setUserAndLoading(session.user);
        } else {
          try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) {
              console.error('Anonymous sign-in failed:', error);
              setLoading(false);
            } else if (data?.user) {
              setUserAndLoading(data.user);
            } else {
              setLoading(false);
            }
          } catch (err) {
            console.error('Anonymous sign-in exception:', err);
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error('getSession error:', err);
        setLoading(false);
      });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // ─── Refresh profile whenever user changes (incl. after upgrade) ──
  useEffect(() => {
    if (loading || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        await syncPublicUser(user);
        const fresh = await loadOrCreateProfile(user.id);
        if (!cancelled) setProfile(fresh);
      } catch (err) {
        console.error('profile refresh failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isAnonymous, loading]);

  // ─── One-shot: merge local progress after upgrade ─────────────
  useEffect(() => {
    if (loading || !user || isAnonymous) return;

    const mergedKey = `rhema_merged_${user.id}`;
    if (localStorage.getItem(mergedKey) === 'true') return;

    mergeLocalProgress(user.id)
      .then((result) => {
        console.log('📦 Merged local progress:', result);
        localStorage.setItem(mergedKey, 'true');
      })
      .catch((err) => console.error('mergeLocalProgress failed:', err));
  }, [user, loading, isAnonymous]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAnonymous,
        profile,
        signInWithGoogle,        // OAuth redirect fallback
        signInWithGoogleIdToken, // Google One Tap (JWT)
        linkWithGoogle,          // alias for signInWithGoogle
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};