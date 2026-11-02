import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext'; // 👈 Added

export default function About() {
  const navigate = useNavigate();
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPromptRef = useRef(null);
  const { t } = useLanguage(); // 👈 Added

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
    setIsStandalone(standalone);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    
    const handleAppInstalled = () => {
      setIsStandalone(true);
      deferredPromptRef.current = null;
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isStandalone) return;

    const promptEvent = deferredPromptRef.current;
    if (promptEvent) {
      promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result.outcome === 'accepted') {
        setIsStandalone(true);
        deferredPromptRef.current = null;
      }
    } else {
      alert(t('installPromptAlert'));
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Rhema - Bible Quiz',
      text: 'Explore the Bible through interactive Quizzes',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert(t('linkCopied'));
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Share failed:', err);
    }
  };

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-primary text-2xl font-bold">{t('aboutRhema')}</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          {t('back')}
        </button>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-muted text-left">
        <p>{t('aboutText1')}</p>
        <p><strong className="text-text">{t('aboutTarget')}</strong> {t('aboutTargetText')}</p>
        <p><strong className="text-text">{t('aboutStory')}</strong> {t('aboutStoryText')}</p>
        <p><strong className="text-text">{t('aboutMission')}</strong> {t('aboutMissionText')}</p>
        <p><strong className="text-text">{t('aboutValues')}</strong> {t('aboutValuesText')}</p>
      </div>

      <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
        <h3 className="text-primary text-lg font-semibold mb-3">{t('downloadSupport')}</h3>

        <div className="flex flex-wrap gap-3">
          <button
            className={`btn-success !w-auto px-6 flex items-center gap-2 ${isStandalone ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleInstall}
            disabled={isStandalone}
          >
            {isStandalone ? t('appInstalled') : t('installApp')}
          </button>

          <button
            className="btn-secondary !w-auto px-6 flex items-center gap-2"
            onClick={handleShare}
          >
            <Share2 size={18} /> {t('share')}
          </button>

          <button
            className="btn !w-auto px-6 flex items-center gap-2"
            onClick={() => navigate('/donate')}
          >
            <Heart size={18} /> {t('donate')}
          </button>
        </div>
      </div>
    </div>
  );
}