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
  const { isAnonymous, loading, signInWithGoogleIdToken } = useAuth();

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
          navigate('/home');
        }
      } catch (err) {
        console.error('[auth] One Tap sign-in failed:', err);
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

      <div className="mt-3 text-center text-muted text-xs">
        Play and create an account to save your progress.
      </div>
    </div>
  );
}