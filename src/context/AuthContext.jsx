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
    username: '',
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
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('username, display_name, device_code, email')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.warn('loadOrCreateProfile fetch error:', fetchError.message);
    }

    if (data) {
      return {
        username: data.username || '',
        displayName: data.display_name || '',
        deviceCode: data.device_code || '',
        email: data.email || '',
      };
    }

    // Fresh user — insert with retry on device_code collision.
    for (let attempt = 0; attempt < 6; attempt++) {
      const deviceCode = generateDeviceCode();
      const username = 'Player';
      const displayName = `${username} ${deviceCode}`;

      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          username,
          display_name: displayName,
          device_code: deviceCode,
          created_at: new Date().toISOString(),
        });

      if (!error) {
        return { username, displayName, deviceCode, email: '' };
      }

      if (error.code === '23505') continue;

      console.error(
        `loadOrCreateProfile insert error (attempt ${attempt + 1}):`,
        error
      );
      break;
    }

    // Fallback with a UUID-derived numeric code
    const hex = userId.replace(/-/g, '');
    const numeric = String(parseInt(hex.slice(-6), 16) % 10000).padStart(4, '0');
    const username = 'Player';
    const displayName = `${username} ${numeric}`;

    const { error: fbError } = await supabase.from('users').insert({
      id: userId,
      username,
      display_name: displayName,
      device_code: numeric,
      created_at: new Date().toISOString(),
    });

    if (fbError && fbError.code !== '23505') {
      console.error('loadOrCreateProfile fallback insert failed:', fbError);
    }

    return { username, displayName, deviceCode: numeric, email: '' };
  };

  // ─── Sync auth metadata into public.users ─────────────────────
  const syncPublicUser = async (authUser) => {
    if (!authUser) return;
    const { id, email, user_metadata } = authUser;

    let googleName = user_metadata?.full_name || user_metadata?.name || null;
    if (!googleName && email) googleName = email.split('@')[0];

    const updates = {};
    if (email) updates.email = email;

    const { data: current } = await supabase
      .from('users')
      .select('username, display_name, device_code')
      .eq('id', id)
      .maybeSingle();

    const isDefaultUsername = !current?.username || current.username === 'Player';
    const isDefaultDisplay =
      !current?.display_name || /^Player \d+$/.test(current.display_name);

    if (googleName && isDefaultUsername) {
      updates.username = googleName;
      const code = current?.device_code || '';
      updates.display_name = code ? `${googleName} ${code}` : googleName;
    } else if (googleName && isDefaultDisplay) {
      updates.display_name = googleName;
    }

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
      setProfile({ username: '', displayName: '', deviceCode: '', email: '' });
    }
  };

  // ─── Rename display name (device code stays fixed) ────────────
  const updateDisplayName = async (newUsername) => {
    if (!user?.id) throw new Error('Not signed in');
    const trimmed = String(newUsername || '').trim();
    if (!trimmed) throw new Error('Name cannot be empty');
    if (trimmed.length > 20) throw new Error('Name is too long');

    const code = profile.deviceCode;
    const displayName = code ? `${trimmed} ${code}` : trimmed;

    const { error } = await supabase
      .from('users')
      .update({ username: trimmed, display_name: displayName })
      .eq('id', user.id);

    if (error) throw error;

    setProfile((p) => ({ ...p, username: trimmed, displayName }));
    return displayName;
  };

  // ─── Google upgrade (OAuth redirect) ──────────────────────────
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };
  const linkWithGoogle = signInWithGoogle;

  // ─── Google One Tap ───────────────────────────────────────────
  // The nonce is required: Google embeds SHA-256(rawNonce) into the ID
  // token as the "nonce" claim, and Supabase hashes the raw nonce we
  // pass here to compare. Both must be present or Supabase rejects.
  const signInWithGoogleIdToken = async (credential, nonce) => {
    if (!credential) throw new Error('Missing Google credential');
    if (!nonce) throw new Error('Missing nonce — One Tap must supply it');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
      nonce,
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

  // ─── Refresh profile on user change / upgrade ─────────────────
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

  // ─── Merge local progress after upgrade ───────────────────────
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
        updateDisplayName,
        signInWithGoogle,
        signInWithGoogleIdToken,
        linkWithGoogle,
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