import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Guards an action behind a "must be signed in with Google/email" check.
 *
 * Usage in Challenge.jsx (or anywhere):
 *
 *   const { requireAuth, promptOpen, reason, closePrompt } = useRequireAuth();
 *
 *   const handleStart = () => requireAuth(
 *     () => { actualWork(); },
 *     'Sign in to play with others'
 *   );
 *
 *   // Render <SignInPrompt open={promptOpen} reason={reason} onClose={closePrompt} />
 *   // anywhere in the JSX tree (usually at the bottom of the component).
 */
export function useRequireAuth() {
  const { user, isAnonymous, loading } = useAuth();
  const [promptOpen, setPromptOpen] = useState(false);
  const [reason, setReason] = useState('Sign in to continue');

  const requireAuth = useCallback(
    (action, customReason) => {
      if (loading) return; // wait for auth to settle

      const signedIn = !!user && !isAnonymous;
      if (signedIn) {
        action?.();
        return;
      }

      setReason(customReason || 'Sign in to play with others');
      setPromptOpen(true);
    },
    [user, isAnonymous, loading]
  );

  const closePrompt = useCallback(() => setPromptOpen(false), []);

  return { requireAuth, promptOpen, reason, closePrompt };
}