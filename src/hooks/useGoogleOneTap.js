import { useEffect, useRef, useState, useCallback } from 'react';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

/**
 * Google One Tap — shows device's Google accounts, user taps one.
 * onCredential(credentialJWT) fires when an account is chosen.
 */
export function useGoogleOneTap({ onCredential, enabled = true }) {
  const [available, setAvailable] = useState(false);
  const initializedRef = useRef(false);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn('[one-tap] VITE_GOOGLE_CLIENT_ID not set — disabled');
        return;
      }
      try {
        await loadGsiScript();
      } catch (err) {
        console.warn('[one-tap] GSI script load failed:', err.message);
        return;
      }
      if (cancelled || !window.google?.accounts?.id) return;

      if (!initializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => cbRef.current?.(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });
        initializedRef.current = true;
      }
      setAvailable(true);
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  const promptOneTap = useCallback(() => {
    if (!window.google?.accounts?.id) return false;
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.()) {
        console.log('[one-tap] not displayed:', notification.getNotDisplayedReason?.());
      } else if (notification.isSkippedMoment?.()) {
        console.log('[one-tap] skipped:', notification.getSkippedReason?.());
      }
    });
    return true;
  }, []);

  return { available, promptOneTap };
}