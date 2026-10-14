import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGoogleOneTap } from '../../hooks/useGoogleOneTap';

export default function SignInPrompt({ open, reason, onClose }) {
  const { signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [oneTapTried, setOneTapTried] = useState(false);

  const { available: oneTapAvailable, promptOneTap } = useGoogleOneTap({
    enabled: open,
    onCredential: async (credential, nonce) => {
      setBusy(true);
      setMessage('');
      try {
        await signInWithGoogleIdToken(credential, nonce);
        onClose?.();
      } catch (err) {
        console.error('[one-tap] sign-in failed:', err);
        setMessage('Google sign-in failed. Try the button below.');
      } finally {
        setBusy(false);
      }
    },
  });

  useEffect(() => {
    if (!open || !oneTapAvailable || oneTapTried) return;
    setOneTapTried(true);
    const t = setTimeout(() => promptOneTap(), 250);
    return () => clearTimeout(t);
  }, [open, oneTapAvailable, oneTapTried, promptOneTap]);

  if (!open) return null;

  const handleRedirectGoogle = async () => {
    setBusy(true);
    setMessage('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google redirect failed:', err);
      setMessage('Could not start Google sign-in. Try again.');
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      setMessage('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      setMessage('Check your inbox for a confirmation link.');
    } catch (err) {
      setMessage(err.message || 'Could not send link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface rounded-xl p-6 max-w-sm w-full border border-[#2a2a2a] text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-bold text-primary mb-2">{reason}</h3>

        <p className="text-sm text-muted mb-5">
          {oneTapAvailable && !emailMode
            ? 'Tap your Google account above, or use the button below.'
            : 'Guests can play solo. Sign in to play with other people and sync across devices.'}
        </p>

        {!emailMode ? (
          <>
            <button
              onClick={handleRedirectGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              {busy ? (
                <span className="spinner-small" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              onClick={() => setEmailMode(true)}
              className="mt-3 text-sm text-muted hover:text-primary transition"
            >
              Use email instead
            </button>
          </>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary mb-3"
            />
            <button onClick={handleEmail} disabled={busy} className="btn w-full">
              {busy ? 'Sending...' : 'Send magic link'}
            </button>
            <button
              onClick={() => { setEmailMode(false); setMessage(''); }}
              className="mt-3 text-sm text-muted hover:text-primary transition"
            >
              Back
            </button>
          </>
        )}

        {message && <div className="mt-3 text-xs text-muted">{message}</div>}

        <button
          onClick={onClose}
          className="mt-4 text-xs text-muted hover:text-text transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
