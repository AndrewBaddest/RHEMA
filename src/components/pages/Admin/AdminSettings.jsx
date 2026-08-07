import { useStore } from '../../../lib/store';

export default function AdminSettings() {
  const settings = useStore((state) => state.settings);
  const updateSoundSetting = useStore((state) => state.updateSoundSetting);
  const updateQuizSetting = useStore((state) => state.updateQuizSetting);
  const updateReaderSetting = useStore((state) => state.updateReaderSetting);

  return (
    <div>
      <h2 className="text-primary text-2xl font-bold mb-6">⚙️ App Settings</h2>

      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a] space-y-4">
        <h3 className="text-primary text-lg font-semibold">🔊 Sound</h3>
        <div className="flex items-center justify-between">
          <span className="text-muted">Background Music (default)</span>
          <button
            onClick={() => updateSoundSetting('bgMusic', !settings.sound.bgMusic)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              settings.sound.bgMusic ? 'bg-primary text-black' : 'bg-[#333] text-muted'
            }`}
          >
            {settings.sound.bgMusic ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Sound Effects (default)</span>
          <button
            onClick={() => updateSoundSetting('soundEffects', !settings.sound.soundEffects)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              settings.sound.soundEffects ? 'bg-primary text-black' : 'bg-[#333] text-muted'
            }`}
          >
            {settings.sound.soundEffects ? 'On' : 'Off'}
          </button>
        </div>

        <h3 className="text-primary text-lg font-semibold pt-4">📝 Quiz</h3>
        <div className="flex items-center justify-between">
          <span className="text-muted">Timer per question (default)</span>
          <select
            value={settings.quiz.timer}
            onChange={(e) => updateQuizSetting('timer', Number(e.target.value))}
            className="bg-[#333] text-text px-3 py-1 rounded-lg border border-[#444] text-sm"
          >
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={45}>45s</option>
            <option value={60}>60s</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Questions per book quiz (default)</span>
          <select
            value={settings.quiz.questionsPerBook}
            onChange={(e) => updateQuizSetting('questionsPerBook', Number(e.target.value))}
            className="bg-[#333] text-text px-3 py-1 rounded-lg border border-[#444] text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>

        <h3 className="text-primary text-lg font-semibold pt-4">📖 Reader</h3>
        <div className="flex items-center justify-between">
          <span className="text-muted">Font size (default)</span>
          <select
            value={settings.reader.fontSize}
            onChange={(e) => updateReaderSetting('fontSize', e.target.value)}
            className="bg-[#333] text-text px-3 py-1 rounded-lg border border-[#444] text-sm"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </div>
  );
}