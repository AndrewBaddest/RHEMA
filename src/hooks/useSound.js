import { useEffect, useRef } from 'react';
import { useUIStore } from '../lib/store';

// ── Singleton audio instance ────────────────────────────────────
let bgAudio = null;
let isBgInitialized = false;

export function useSound() {
  const isMuted = useUIStore((state) => state.isMuted);
  const toggleMute = useUIStore((state) => state.toggleMute);
  const sounds = useRef({});

  // ── Initialize audio only once ────────────────────────────────
  useEffect(() => {
    if (isBgInitialized) return;
    isBgInitialized = true;

    bgAudio = new Audio('/audio/bg-music.mp3');
    bgAudio.loop = true;
    bgAudio.volume = 0.2; // even lower to blend with other audio
    bgAudio.preload = 'auto';

    // Preload sound effects
    sounds.current = {
      correct: new Audio('/audio/correct.mp3'),
      wrong: new Audio('/audio/wrong.mp3'),
      gameover: new Audio('/audio/game-over.mp3'),
    };

    // Unlock audio on first user interaction (click/tap)
    const unlock = () => {
      // Only start if we have a pending start request
      if (bgAudio && bgAudio.paused && bgAudio._shouldStart) {
        bgAudio.play().catch(() => {});
        bgAudio._shouldStart = false;
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      if (bgAudio) {
        bgAudio.pause();
        bgAudio.currentTime = 0;
        bgAudio._shouldStart = false;
      }
    };
  }, []);

  // ── Watch mute state ────────────────────────────────────────────
  useEffect(() => {
    if (!bgAudio) return;
    if (isMuted) {
      if (!bgAudio.paused) bgAudio.pause();
    } else {
      // If muted is off and we have a pending start, play
      if (bgAudio.paused && bgAudio._shouldStart) {
        bgAudio.play().catch(() => {});
        bgAudio._shouldStart = false;
      }
    }
  }, [isMuted]);

  // ── Start background music (call once after login) ──────────────
  const startBackground = () => {
    if (!bgAudio) return;
    if (isMuted) {
      // If muted, just mark that we want to start later
      bgAudio._shouldStart = true;
      return;
    }
    if (bgAudio.paused) {
      bgAudio._shouldStart = false;
      bgAudio.currentTime = 0;
      bgAudio.play().catch((err) => console.warn('Playback failed:', err));
    }
  };

  const pauseBackground = () => {
    if (bgAudio && !bgAudio.paused) {
      bgAudio.pause();
    }
  };

  const playEffect = (type) => {
    if (isMuted) return;
    const sound = sounds.current[type];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  const handleToggleMute = () => {
    toggleMute();
    // The mute effect (above) will pause/play automatically.
  };

  return {
    isMuted,
    toggleMute: handleToggleMute,
    startBackground,   // call this only after login
    pauseBackground,
    playEffect,
  };
}