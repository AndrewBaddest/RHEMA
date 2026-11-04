import { useEffect, useState } from 'react';
import { useUIStore, useStore } from '../lib/store';

// ─────────────────────────────────────────────────────────────────
// MODULE-LEVEL SINGLETONS
// One background track for the whole tab, survives navigation.
// ─────────────────────────────────────────────────────────────────
const BG_URL = '/audio/bg-music.mp3';
const BG_VOLUME = 0.55;
const LS_WANTED = 'rhema_bg_wanted';   // 👈 persists "user wants music" across reloads

let bgAudio = null;
let initialized = false;
let listenerAttached = false;

// Session flag — set by startBackground() after auth, cleared by pauseBackground()
let shouldStart = false;

// Mirrors of store state — module-level so unlock handler never sees stale closure
let mutedRef = false;
let bgMusicRef = true;
let sfxRef = true;

// True only when play() was rejected by autoplay policy AND we still want to play
let blocked = false;

const subs = new Set();

function notify() {
  const snap = {
    playing: !!bgAudio && !bgAudio.paused,
    blocked,
    shouldStart,
    muted: mutedRef,
    bgMusic: bgMusicRef,
  };
  subs.forEach((fn) => { try { fn(snap); } catch (_) {} });
}

function shouldActuallyPlay() {
  return shouldStart && bgMusicRef && !mutedRef;
}

function tryPlay() {
  if (!bgAudio || !shouldActuallyPlay()) return;
  if (!bgAudio.paused) return;
  const p = bgAudio.play();
  if (!p || typeof p.then !== 'function') return;
  p.then(
    () => { blocked = false; notify(); },
    (err) => {
      if (err?.name === 'NotAllowedError') {
        // Autoplay policy — expected. Unlock listener will retry on first gesture.
        blocked = true;
        notify();
      } else {
        console.warn('[audio] background failed:', err);
      }
    }
  );
}

function ensureInit() {
  if (initialized) return;
  initialized = true;

  // 👇 Restore user's music intent from previous session (survives refresh)
  try { shouldStart = localStorage.getItem(LS_WANTED) === '1'; } catch (_) {}

  bgAudio = new Audio(BG_URL);
  bgAudio.loop = true;
  bgAudio.volume = BG_VOLUME;
  bgAudio.preload = 'auto';
  bgAudio.addEventListener('play', () => { blocked = false; notify(); });
  bgAudio.addEventListener('pause', notify);
  bgAudio.addEventListener('error', () => {
    console.warn('[audio] background error:', bgAudio?.error);
  });

  // 👇 Attempt playback immediately. On cold load this will be blocked by
  //    autoplay policy — that's expected. The unlock listener below will
  //    retry on the first pointerdown/keydown anywhere on the page.
  if (shouldStart) setTimeout(tryPlay, 0);
}

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;

  // Persistent — never cleaned up. Fires on every gesture, only acts if
  // we're waiting for play permission.
  const handler = () => {
    if (shouldActuallyPlay() && bgAudio?.paused) tryPlay();
  };
  document.addEventListener('pointerdown', handler, { passive: true });
  document.addEventListener('keydown', handler, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') handler();
  });
}

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────
export function useSound() {
  ensureInit();
  ensureListener();

  const isMuted = useUIStore((s) => s.isMuted);
  const toggleMuteAction = useUIStore((s) => s.toggleMute);

  const bgMusic = useStore((s) => s.settings?.sound?.bgMusic ?? true);
  const soundEffects = useStore((s) => s.settings?.sound?.soundEffects ?? true);

  // Reacts to all three flags. Updates module refs, then reconciles
  // the audio element to match shouldActuallyPlay().
  useEffect(() => {
    mutedRef = isMuted;
    bgMusicRef = bgMusic;
    sfxRef = soundEffects;
    if (!bgAudio) return;

    const want = shouldActuallyPlay();
    if (want && bgAudio.paused) {
      tryPlay();
    } else if (!want && !bgAudio.paused) {
      bgAudio.pause();
    }
    notify();
  }, [isMuted, bgMusic, soundEffects]);

  const startBackground = () => {
    shouldStart = true;
    // 👇 Persist intent so it survives refresh
    try { localStorage.setItem(LS_WANTED, '1'); } catch (_) {}
    if (!shouldActuallyPlay()) { notify(); return; }
    tryPlay();
  };

  const pauseBackground = () => {
    shouldStart = false;
    // 👇 Persist "user doesn't want music"
    try { localStorage.setItem(LS_WANTED, '0'); } catch (_) {}
    blocked = false;
    if (bgAudio && !bgAudio.paused) bgAudio.pause();
    notify();
  };

  const resumeBackground = () => { tryPlay(); };

  const playEffect = (_type) => {
    if (mutedRef || !sfxRef) return;
    // Effects not wired yet — will respect sfxRef when enabled
  };

  const toggleMute = () => { toggleMuteAction(); };

  return { isMuted, toggleMute, startBackground, pauseBackground, resumeBackground, playEffect };
}

// ─────────────────────────────────────────────────────────────────
// OPTIONAL: reactive status for "tap to enable sound" banner
// ─────────────────────────────────────────────────────────────────
export function useSoundStatus() {
  const [status, setStatus] = useState(() => ({
    playing: !!bgAudio && !bgAudio.paused,
    blocked,
    shouldStart,
    muted: mutedRef,
    bgMusic: bgMusicRef,
  }));

  useEffect(() => {
    const fn = (s) => setStatus(s);
    subs.add(fn);
    return () => { subs.delete(fn); };
  }, []);

  return status;
}