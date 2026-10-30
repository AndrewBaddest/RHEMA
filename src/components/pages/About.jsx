import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Heart } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPromptRef = useRef(null);

  // Check if the app is already installed (running in standalone mode)
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Listen for the browser's install prompt
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
      // Trigger the native browser prompt
      promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result.outcome === 'accepted') {
        setIsStandalone(true);
        deferredPromptRef.current = null;
      }
    } else {
      // If the event isn't ready (or it's iOS), use a native alert instead of ugly text
      alert("Your browser hasn't enabled the install prompt yet. Please use your browser's menu (⋮) and select 'Add to Home Screen'.");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Rhema - Bible Quiz',
      text: 'Explore the Bible through interactive quizzes and reading!',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard! Share it with your friends.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Share failed:', err);
    }
  };

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-primary text-2xl font-bold">About Rhema</h2>
        <button className="btn-secondary !w-auto !py-2 !px-4 text-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-muted text-left">
        <p>
          <strong className="text-text">Rhema</strong> – The Greek word for the <em>"spoken word"</em> of God. Our Bible Quiz Game is designed to make reading the Bible more fun and interactive for people of all ages and backgrounds.
        </p>
        <p><strong className="text-text">Target:</strong> People of all ages and backgrounds interested in exploring the Bible in a way that's engaging, interactive, and fun!</p>
        <p><strong className="text-text">Our Story:</strong> Our team of Bible enthusiasts, educators, and tech experts came together with a shared vision: to create a platform that makes Bible study enjoyable and accessible for everyone. We believe that learning about God's Word should be an exciting adventure, not a chore.</p>
        <p><strong className="text-text">Our Mission:</strong> Inspire a love for the Bible and its teachings by providing innovative and interactive tools for learning.</p>
        <p><strong className="text-text">Our Values:</strong> Faith, Fun, Community, Innovation.</p>
      </div>

      <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
        <h3 className="text-primary text-lg font-semibold mb-3">Download & Support</h3>

        <div className="flex flex-wrap gap-3">
          {/* Install Button */}
          <button
            className={`btn-success !w-auto px-6 flex items-center gap-2 ${isStandalone ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleInstall}
            disabled={isStandalone}
          >
            {isStandalone ? 'App Installed' : 'Install App'}
          </button>

          {/* Share Button */}
          <button
            className="btn-secondary !w-auto px-6 flex items-center gap-2"
            onClick={handleShare}
          >
            <Share2 size={18} /> Share
          </button>

          {/* Donate Button */}
          <button
            className="btn !w-auto px-6 flex items-center gap-2"
            onClick={() => navigate('/donate')}
          >
            <Heart size={18} /> Donate
          </button>
        </div>
      </div>
    </div>
  );
}