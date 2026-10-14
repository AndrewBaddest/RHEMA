import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../lib/store';
import { useSound } from '../../hooks/useSound';
import { useAuth } from '../../context/AuthContext';
import { useGoogleOneTap } from '../../hooks/useGoogleOneTap';

export default function Auth() {
  const navigate = useNavigate();
  const setToast = useUIStore((state) => state.setToast);
  const { startBackground } = useSound();
  const { isAnonymous, loading, signInWithGoogle, signInWithGoogleIdToken } = useAuth();

  const navigatedRef = useRef(false);
  const oneTapFiredRef = useRef(false);
  const shouldPromptOneTap = !loading && isAnonymous;

  const { available: oneTapAvailable, promptOneTap } = useGoogleOneTap({
    enabled: shouldPromptOneTap,
    onCredential: async (credential, nonce) => {
      try {
        await signInWithGoogleIdToken(credential, nonce);
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          setToast('✅ Signed in with Google', 'success');
        }
      } catch (err) {
        console.error('[auth] One Tap sign-in failed:', err);
        setToast('❌ Google sign-in failed. Try the button below.', 'error');
      }
    },
  });

  // Auto-fire One Tap shortly after mount, once GSI is ready.
  useEffect(() => {
    if (!shouldPromptOneTap || !oneTapAvailable || oneTapFiredRef.current) return;
    oneTapFiredRef.current = true;
    const t = setTimeout(() => promptOneTap(), 300);
    return () => clearTimeout(t);
  }, [shouldPromptOneTap, oneTapAvailable, promptOneTap]);

  // Already signed in → redirect to /home.
  useEffect(() => {
    if (loading) return;
    if (!isAnonymous && !navigatedRef.current) {
      navigatedRef.current = true;
      navigate('/home');
    }
  }, [isAnonymous, loading, navigate]);

  const handlePlay = () => {
    startBackground();
    setToast('👋 Welcome to Rhema!', 'success');
    navigate('/home');
  };

  const handleGoogleRedirect = async () => {
    try {
      await signInWithGoogle();
      // Browser redirects to Google; nothing after this line runs.
    } catch (err) {
      console.error('[auth] Google redirect failed:', err);
      setToast('❌ Could not start Google sign-in.', 'error');
    }
  };

  return (
    <div>
      <h2 className="text-center text-2xl font-bold mb-4">Welcome to Rhema</h2>

      <div className="mission-box">
        <div className="text-center text-sm text-muted mb-2">Our Mission</div>
        <p className="text-sm leading-relaxed text-center">
          We're passionate about helping people of all ages and backgrounds
          explore the Bible in a way that's{' '}
          <strong className="text-primary">engaging</strong>,{' '}
          <strong className="text-primary">interactive</strong>, and{' '}
          <strong className="text-primary">fun</strong>!
        </p>
        <div className="mt-3 pt-3 border-t border-primary/15 text-center text-sm text-muted italic">
          "Your word is a lamp to my feet and a light to my path." —{' '}
          <span className="text-primary not-italic font-medium">Psalm 119:105</span>
        </div>
      </div>

      <button type="button" className="btn" onClick={handlePlay}>
        ▶ Play
      </button>

      <div className="mt-4 flex flex-col gap-3">
        <div className="text-center text-sm text-muted">or</div>

        <button
          onClick={handleGoogleRedirect}
          className="btn-google w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition border border-[#333] text-text"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="mt-3 text-center text-muted text-xs">
        Play and create an account to save your progress.
      </div>
    </div>
  );
}