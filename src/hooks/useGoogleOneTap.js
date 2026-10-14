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

async function generateNoncePair() {
  const rawNonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  );
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(rawNonce)
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { rawNonce, hashedNonce };
}

// Module-level: only ONE initialize() call per page, no matter how many
// hook instances mount (StrictMode double-mount, multiple components).
let gsiInitialized = false;

export function useGoogleOneTap({ onCredential, enabled = true }) {
  const [available, setAvailable] = useState(false);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const nonceRef = useRef({ rawNonce: '', hashedNonce: '' });

  useEffect(() => {
    if (!enabled) return;
    // Synchronous guard — StrictMode's second invocation of this effect
    // hits this and bails before doing anything.
    if (gsiInitialized) {
      setAvailable(true);
      return;
    }

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

      // One nonce per page load is fine. Google just needs the hashed
      // nonce to match what Supabase later compares against.
      if (!nonceRef.current.rawNonce) {
        nonceRef.current = await generateNoncePair();
        if (cancelled) return;
      }

      gsiInitialized = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          console.log(
            '[one-tap] GSI callback fired, credential length:',
            response?.credential?.length
          );
          cbRef.current?.(response.credential, nonceRef.current.rawNonce);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        nonce: nonceRef.current.hashedNonce,
      });

      if (!cancelled) setAvailable(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const promptOneTap = useCallback(() => {
    if (!window.google?.accounts?.id) return false;
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.()) {
        console.log(
          '[one-tap] not displayed:',
          notification.getNotDisplayedReason?.()
        );
      } else if (notification.isSkippedMoment?.()) {
        console.log('[one-tap] skipped:', notification.getSkippedReason?.());
      }
    });
    return true;
  }, []);

  return { available, promptOneTap };
}