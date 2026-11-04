import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext'; // 👈 Added

export default function Header() {
  const location = useLocation();
  const path = location.pathname;
  const { user, isAnonymous, loading, profile } = useAuth();
  const { t } = useLanguage(); // 👈 Added

  const displayName = profile.displayName || t('player');
  const showBadge = !loading && !!user;

  const badgeText = path === '/home' ? t('progress') : displayName;

  return (
    <header className="bg-surface border-b-2 border-primary px-4 py-3 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-4 min-w-[100px]">
        {path === '/' ? (
          <Link to="/about" className="header-btn">{t('about')}</Link>
        ) : path === '/about' || path === '/contact' ? (
          <Link to="/" className="header-btn">{t('back')}</Link>
        ) : (
          <Link to="/" className="header-btn">{t('welcome')}</Link>
        )}
      </div>

      <h1 className="text-2xl font-bold text-primary tracking-wider">RHEMA</h1>

      <div className="flex items-center gap-3 min-w-[100px] justify-end">
        {path === '/about' ? (
          <a
            href="mailto:rhemabiblequiz@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header-btn"
          >
            {t("contactUs")}
          </a>
        ) : path === '/contact' ? null : path === '/' ? (
          <Link to="/donate" className="header-btn">{t("donate")}</Link>
        ) : (
          <>
            <Link
              to="/settings"
              className="header-btn p-2 rounded-full"
              aria-label={t('settings')}
            >
              <Settings size={18} />
            </Link>
            {showBadge && (
              <Link
                to="/progress"
                className="user-badge flex items-center gap-1"
                title={isAnonymous ? 'Playing as guest' : 'Signed in'}
              >
                {badgeText}
                {isAnonymous && (
                  <span className="text-[10px] text-muted ml-1">· {t('guest')}</span>
                )}
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}