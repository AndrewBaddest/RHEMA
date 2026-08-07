import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Challenge() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [status, setStatus] = useState('waiting'); // 'waiting' | 'live' | 'ended'

  // ─── Helper: get next Sunday 9:00 PM EAT ──────────────────────
  const getNextSunday9pmEAT = () => {
    const now = new Date();
    const eatOffset = 3; // EAT is UTC+3
    const eatNow = new Date(now.getTime() + eatOffset * 60 * 60 * 1000);
    const day = eatNow.getUTCDay(); // 0 = Sunday
    const hours = eatNow.getUTCHours();
    const minutes = eatNow.getUTCMinutes();

    let target = new Date(eatNow);
    if (day === 0 && (hours < 21 || (hours === 21 && minutes === 0))) {
      // It's Sunday before 9 PM – target is today at 9 PM
      target.setUTCHours(21, 0, 0, 0);
    } else {
      // Otherwise, target is next Sunday at 9 PM
      let daysUntilSunday = (7 - day) % 7;
      if (daysUntilSunday === 0) daysUntilSunday = 7;
      target.setUTCDate(target.getUTCDate() + daysUntilSunday);
      target.setUTCHours(21, 0, 0, 0);
    }
    return target;
  };

  // ─── Update timer ──────────────────────────────────────────────
  const updateTimer = () => {
    const now = new Date();
    const eatOffset = 3;
    const eatNow = new Date(now.getTime() + eatOffset * 60 * 60 * 1000);
    const day = eatNow.getUTCDay();
    const hours = eatNow.getUTCHours();
    const minutes = eatNow.getUTCMinutes();

    // Check if it's Sunday 9:00–9:30 PM EAT (live window)
    const isSunday = day === 0;
    const isLive = isSunday && hours === 21 && minutes < 30;
    const isAfter = isSunday && (hours > 21 || (hours === 21 && minutes >= 30));

    if (isLive) {
      // Live – show time remaining in the 30‑minute window
      const elapsed = (eatNow.getTime() - new Date(eatNow).setUTCHours(21, 0, 0, 0)) / 1000;
      const remaining = 1800 - elapsed;
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        setTimeLeft({ days: 0, hours: 0, minutes: mins, seconds: secs });
        setStatus('live');
        return;
      }
    }

    if (isAfter || !isSunday) {
      // Not live – show time until next Sunday 9 PM
      const nextSunday = getNextSunday9pmEAT();
      const diffMs = nextSunday.getTime() - eatNow.getTime();
      if (diffMs > 0) {
        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hoursRem = Math.floor((totalSeconds % 86400) / 3600);
        const minutesRem = Math.floor((totalSeconds % 3600) / 60);
        const secondsRem = totalSeconds % 60;
        setTimeLeft({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
        setStatus('waiting');
      } else {
        // Should not happen, but fallback to next week
        const nextNext = new Date(nextSunday);
        nextNext.setUTCDate(nextNext.getUTCDate() + 7);
        const diff2 = nextNext.getTime() - eatNow.getTime();
        const totalSeconds = Math.floor(diff2 / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hoursRem = Math.floor((totalSeconds % 86400) / 3600);
        const minutesRem = Math.floor((totalSeconds % 3600) / 60);
        const secondsRem = totalSeconds % 60;
        setTimeLeft({ days, hours: hoursRem, minutes: minutesRem, seconds: secondsRem });
        setStatus('waiting');
      }
    }
  };

  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const { days, hours, minutes, seconds } = timeLeft;

  const isWaiting = status === 'waiting';
  const isLive = status === 'live';

  return (
    <div className="py-4 text-center">
      <h2 className="text-primary text-2xl font-bold mb-4">🌍 Global Challenge</h2>

      <div className="bg-surface rounded-xl p-8 border border-[#2a2a2a] max-w-md mx-auto">
        {/* Timer Display */}
        <div className="mb-4">
          {isLive ? (
            <>
              <div className="text-4xl font-bold text-success">🔴 LIVE NOW</div>
              <div className="text-3xl font-mono text-primary mt-2">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted">remaining in this week's challenge</div>
            </>
          ) : isWaiting ? (
            <>
              <div className="text-3xl font-mono text-primary">
                {days > 0 && `${days}d `}
                {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-muted mt-1">until the next Global Challenge</div>
              <div className="text-xs text-muted mt-1">Every Sunday at 9:00 PM EAT</div>
            </>
          ) : (
            <div className="text-3xl font-mono text-muted">⏳ Next challenge coming soon</div>
          )}
        </div>

        {/* Status message and support */}
        <div className="mt-4">
          {isLive ? (
            <p className="text-sm text-muted">
              The challenge is live! Participate now to earn a spot on the leaderboard.
            </p>
          ) : (
            <>
              <p className="text-muted text-sm mb-3">
                We're building an exciting global challenge where you can compete with others around the world!
              </p>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-sm">
                <p className="text-text font-medium">  While you wait...</p>
                <p className="text-muted text-sm mt-1">
                  You can help us build this feature faster by supporting the project.
                </p>
                <button
                  onClick={() => navigate('/donate')}
                  className="mt-3 btn !w-auto px-6 inline-flex items-center gap-2"
                >
                    Support Rhema
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <button
        className="mt-6 btn-secondary !w-auto px-6"
        onClick={() => navigate('/home')}
      >
          Back to Home
      </button>
    </div>
  );
}