import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Heart } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();
  const [installStatus, setInstallStatus] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPromptRef = useRef(null);

  // Check if already installed
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) {
      setInstallStatus('  App is already installed');
    }
  }, []);

  // Listen for beforeinstallprompt – store in ref, not state
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallStatus('  Tap "Install" to add Rhema to your home screen.');
    };

    const handleAppInstalled = () => {
      setInstallStatus('  App installed successfully!');
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

  // ─── Install Handler ────────────────────────────────────────────
  const handleInstall = async () => {
    if (isStandalone) {
      setInstallStatus('App is installed');
      return;
    }

    const promptEvent = deferredPromptRef.current;

    if (promptEvent) {
      // Show the native install prompt
      promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result.outcome === 'accepted') {
        setInstallStatus('  App installed successfully!');
        setIsStandalone(true);
        deferredPromptRef.current = null;
      } else {
        setInstallStatus('  Installation declined. You can try again later.');
        // Keep the event for later (user might try again)
      }
    } else {
      // No stored event – fallback message
      setInstallStatus('  Tap the browser menu (⋮) and select "Install App" or "Add to Home Screen"');
      // On some browsers, the event hasn't fired yet. Try to trigger it by navigating? Not possible.
      // You can also try to dynamically create a link to the manifest? Not needed.
    }
  };

  // ─── Share Handler ──────────────────────────────────────────────
  const handleShare = async () => {
    const shareData = {
      title: 'Rhema - Bible Quiz & Reading',
      text: 'Explore the Bible through interactive quizzes and reading!',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setInstallStatus('  Link copied to clipboard! Share it with your friends.');
        setTimeout(() => setInstallStatus(''), 3000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Share failed:', err);
      }
    }
  };

  const handleDonate = () => {
    navigate('/donate');
  };

  return (
    <div className="py-2">
      <h2 className="text-primary text-2xl font-bold mb-4">About Rhema</h2>

      <p className="text-muted leading-relaxed mb-3">
        <strong>Rhema</strong> – The Greek word for the <em>"spoken word"</em> of God. Our Bible Quiz Game is designed to make reading the Bible more fun and interactive for people of all ages and backgrounds.
      </p>
      <p className="text-muted leading-relaxed mb-3">
        <strong>Target:</strong> People of all ages and backgrounds interested in exploring the Bible in a way that's engaging, interactive, and fun!
      </p>
      <p className="text-muted leading-relaxed mb-3">
        <strong>Company Profile:</strong> We're passionate about helping people of all ages and backgrounds explore the Bible in a way that's engaging, interactive, and fun! Our App is designed to make Scripture come alive through games, quizzes, and community discussions.
      </p>
      <p className="text-muted leading-relaxed mb-3">
        <strong>Our Story:</strong> Our team of Bible enthusiasts, educators, and tech experts came together with a shared vision: to create a platform that makes Bible study enjoyable and accessible for everyone. We believe that learning about God's Word should be an exciting adventure, not a chore.
      </p>
      <p className="text-muted leading-relaxed mb-3">
        <strong>Our Mission:</strong> Inspire a love for the Bible and its teachings by providing innovative and interactive tools for learning.
      </p>
      <p className="text-muted leading-relaxed mb-3">
        <strong>Our Values:</strong> Faith, Fun, Community, Innovation.
      </p>

      {/* ─── Download / Install / Share / Donate ────────────────── */}
      <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
        <h3 className="text-primary text-lg font-semibold mb-3">  Download & Support</h3>

        <div className="flex flex-wrap gap-3">
          {/* Install Button */}
          <button
            className={`btn-success !w-auto px-6 flex items-center gap-2 ${isStandalone ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleInstall}
            disabled={isStandalone}
          >
             {isStandalone ? 'Installed' : 'Install App'}
          </button>

          {/* Share Button */}
          <button
            className="btn-secondary !w-auto px-6 flex items-center gap-2"
            onClick={handleShare}
          >
            <Share2 size={18} /> Share
          </button>

          {/* Support Button */}
          <button
            className="btn !w-auto px-6 flex items-center gap-2"
            onClick={handleDonate}
          >
            <Heart size={18} /> Support
          </button>
        </div>

        {/* Status Message */}
        <div className="text-center text-muted text-sm mt-3 py-2 bg-[#1a1a1a] rounded-lg">
          {installStatus || (isStandalone
            ? '  Rhema is installed on your device.'
            : 'Tap "Install App" to add Rhema to your home screen.')}
        </div>
      </div>
    </div>
  );
}