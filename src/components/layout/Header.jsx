import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useStore } from '../../lib/store';
import { initDevice } from '../../lib/utils';

export default function Header() {
  const location = useLocation();
  const path = location.pathname;
  const username = useStore((state) => state.username);
  const playerId = useStore((state) => state.playerId);
  const isAuthenticated = !!playerId;
  const deviceCode = initDevice();

  const badgeText = path === '/home' ? 'Progress' : `${username || 'Player'} ${deviceCode}`;

  return (
    <header className="bg-surface border-b-2 border-primary px-4 py-3 flex justify-between items-center sticky top-0 z-50">
      {/* Left side */}
      <div className="flex items-center gap-4 min-w-[80px]">
        {path === '/' ? (
          <Link to="/about" className="header-btn">About Us</Link>
        ) : path === '/about' || path === '/contact' ? (
          <Link to="/" className="header-btn">← Back</Link>
        ) : (
          <Link to="/" className="header-btn">Welcome</Link>
        )}
      </div>

      <h1 className="text-2xl font-bold text-primary tracking-wider">RHEMA</h1>

      {/* Right side */}
      <div className="flex items-center gap-3 min-w-[80px] justify-end">
        {path === '/about' ? (
          <a
            href="mailto:rhemabiblequiz@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header-btn"
          >
            Contact Us
          </a>
        ) : path === '/contact' ? null : path === '/' ? (
          <a
            href="mailto:rhemabiblequiz@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header-btn"
          >
            Contact Us
          </a>
        ) : (
          <>
            {/* Settings gear */}
            <Link to="/settings" className="header-btn p-2 rounded-full" aria-label="Settings">
              <Settings size={18} />
            </Link>
            {/* Progress badge */}
            {isAuthenticated && (
              <Link to="/progress" className="user-badge">
                {badgeText}
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}