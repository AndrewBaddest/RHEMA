import { useStore } from '../../lib/store';
import { useSound } from '../../hooks/useSound';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, RefreshCw, Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Settings() {
  const navigate = useNavigate();
  // 👇 'enabled' now comes from the master switch via LanguageContext
  const { language, setLanguage, t, enabled } = useLanguage();
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

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-primary text-2xl font-bold">{t('settings')}</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate('/home')}>
          {t('back')}
        </button>
      </div>

      {/* Language Settings — hidden automatically when master switch is OFF */}
      {enabled && (
        <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] mb-4">
          <h3 className="text-primary text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe size={18} /> {t('language')}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('appLanguage')}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#333] text-text px-3 py-1 rounded-lg border border-[#444] text-sm transition-all duration-200 focus:outline-none focus:border-primary"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </div>
        </div>
      )}

      {/* Sound Settings */}
      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] mb-4">
        <h3 className="text-primary text-lg font-semibold mb-3">{t('sound')}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('backgroundMusic')}</span>
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
            <span className="text-sm">{t('soundEffects')}</span>
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
            <span className="text-sm">{t('globalMute')}</span>
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
        <h3 className="text-primary text-lg font-semibold mb-3">{t('quizSettings')}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('timerPerQuestion')}</span>
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
            <span className="text-sm">{t('questionsPerBook')}</span>
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
        <h3 className="text-primary text-lg font-semibold mb-3">{t('reader')}</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('fontSize')}</span>
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
        <h3 className="text-primary text-lg font-semibold mb-3">{t('data')}</h3>
        <div className="space-y-3">
          <button
            onClick={handleClearProgress}
            className="flex items-center gap-2 bg-error/20 text-error px-4 py-2 rounded-lg hover:bg-error/30 transition-all duration-200"
          >
            <RefreshCw size={16} />
            {t('clearProgress')}
          </button>
        </div>
      </div>
    </div>
  );
}