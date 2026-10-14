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
 * Generate a nonce pair: raw (for Supabase) + SHA-256 hex (for Google).
 * Google puts the hashed nonce into the ID token; Supabase hashes the raw
 * nonce you give it and compares. If they don't match, Supabase rejects.
 */
async function generateNoncePair() {
  const rawNonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  );
  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(rawNonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { rawNonce, hashedNonce };
}

export function useGoogleOneTap({ onCredential, enabled = true }) {
  const [available, setAvailable] = useState(false);
  const initializedRef = useRef(false);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  // Current nonce for this session. Regenerated before each prompt.
  const nonceRef = useRef({ rawNonce: '', hashedNonce: '' });

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

      // Generate the first nonce pair
      nonceRef.current = await generateNoncePair();
      if (cancelled) return;

      if (!initializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            // Pass the RAW nonce to Supabase alongside the credential
            cbRef.current?.(response.credential, nonceRef.current.rawNonce);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
          nonce: nonceRef.current.hashedNonce, // Google embeds this into the token
        });
        initializedRef.current = true;
      }
      setAvailable(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const promptOneTap = useCallback(async () => {
    if (!window.google?.accounts?.id) return false;

    // Fresh nonce for every prompt attempt
    const pair = await generateNoncePair();
    nonceRef.current = pair;

    // Re-initialize with the new hashed nonce
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => {
        cbRef.current?.(response.credential, pair.rawNonce);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      nonce: pair.hashedNonce,
    });

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