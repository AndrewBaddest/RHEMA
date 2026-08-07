import { useStore } from '../../lib/store';
import { useSound } from '../../hooks/useSound';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const updateSoundSetting = useStore((s) => s.updateSoundSetting);
  const updateQuizSetting = useStore((s) => s.updateQuizSetting);
  const updateReaderSetting = useStore((s) => s.updateReaderSetting);
  const resetProgress = useStore((s) => s.resetProgress);
  const { toggleMute, isMuted } = useSound();

  const handleClearProgress = () => {
    if (confirm('Are you sure you want to clear all your progress? This cannot be undone.')) {
      resetProgress();
      alert('Progress cleared.');
    }
  };

  const handleSync = () => {
    alert('  Sync is currently disabled. Please connect to a database.');
  };

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-primary text-2xl font-bold">  Settings</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate('/home')}>
          ← Back
        </button>
      </div>

      {/* Sound Settings */}
      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] mb-4">
        <h3 className="text-primary text-lg font-semibold mb-3">  Sound</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Background Music</span>
            <button
              onClick={() => updateSoundSetting('bgMusic', !settings.sound.bgMusic)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
                settings.sound.bgMusic ? 'bg-primary text-black' : 'bg-[#333] text-muted'
              }`}
            >
              {settings.sound.bgMusic ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Sound Effects</span>
            <button
              onClick={() => updateSoundSetting('soundEffects', !settings.sound.soundEffects)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
                settings.sound.soundEffects ? 'bg-primary text-black' : 'bg-[#333] text-muted'
              }`}
            >
              {settings.sound.soundEffects ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Global Mute</span>
            <button
              onClick={toggleMute}
              className="sound-btn transition-transform duration-200 hover:scale-105"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Settings */}
      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] mb-4">
        <h3 className="text-primary text-lg font-semibold mb-3">  Quiz</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Timer per question</span>
            <select
              value={settings.quiz.timer}
              onChange={(e) => updateQuizSetting('timer', Number(e.target.value))}
              className="bg-[#333] text-text px-3 py-1 rounded-lg border border-[#444] text-sm transition-all duration-200 focus:outline-none focus:border-primary"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Questions per book quiz</span>
            <select
              value={settings.quiz.questionsPerBook}
              onChange={(e) => updateQuizSetting('questionsPerBook', Number(e.target.value))}
              className="bg-[#333] text-text px-3 py-1 rounded-lg border border-[#444] text-sm transition-all duration-200 focus:outline-none focus:border-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reader Settings */}
      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] mb-4">
        <h3 className="text-primary text-lg font-semibold mb-3">  Reader</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">Font size</span>
          <select
            value={settings.reader.fontSize}
            onChange={(e) => updateReaderSetting('fontSize', e.target.value)}
            className="bg-[#333] text-text px-3 py-1 rounded-lg border border-[#444] text-sm transition-all duration-200 focus:outline-none focus:border-primary"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>

      {/* Data Settings */}
      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
        <h3 className="text-primary text-lg font-semibold mb-3">  Data</h3>
        <div className="space-y-3">
          <button
            onClick={handleClearProgress}
            className="flex items-center gap-2 bg-error/20 text-error px-4 py-2 rounded-lg hover:bg-error/30 transition-all duration-200"
          >
            <RefreshCw size={16} />
            Clear all progress
          </button>
          <button
            onClick={handleSync}
            className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-all duration-200"
          >
            <RefreshCw size={16} />
            Sync with cloud (coming soon)
          </button>
          <p className="text-muted text-xs mt-1">
            Progress is currently stored locally. Sync will be available when connected to a database.
          </p>
        </div>
      </div>
    </div>
  );
}