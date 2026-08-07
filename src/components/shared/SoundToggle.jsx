import { useSound } from '../../hooks/useSound';
import { Volume2, VolumeX } from 'lucide-react';

export default function SoundToggle() {
  const { isMuted, toggleMute } = useSound();

  return (
    <button
      onClick={toggleMute}
      className="sound-btn"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}