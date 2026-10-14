import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────
const LOGO_ERROR_CACHE_KEY = 'ad_logo_errors_v1';
const ROTATE_INTERVAL_MS = 10000;
const TRANSITION_MS = 300;

// ─── Fetch ads from DB, cached for the page lifetime ─────────────
let adsCache = null;
let adsFetchPromise = null;

async function fetchAdsFromDb() {
  if (adsCache) return adsCache;
  if (adsFetchPromise) return adsFetchPromise;

  adsFetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('active', true)
        .order('id', { ascending: true });

      if (error) {
        console.warn('[ads] fetch failed:', error.message);
        return null;
      }
      adsCache = data || [];
      return adsCache;
    } catch (err) {
      console.warn('[ads] fetch exception:', err);
      return null;
    } finally {
      adsFetchPromise = null;
    }
  })();

  return adsFetchPromise;
}

// ─── Ad 1 special case: three-portrait background ────────────────
// Served from /public/ads — no external hosts.
const BIBLICAL_ELEARNING_BACKGROUNDS = [
  '/ads/ad-1-bg-1.jpg',
  '/ads/ad-1-bg-2.jpg',
  '/ads/ad-1-bg-3.jpg',
];

export default function AdRotator() {
  const [ads, setAds] = useState(null);         // null = loading
  const [currentAd, setCurrentAd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [logoError, setLogoError] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LOGO_ERROR_CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  });

  // ─── Refs (fresh values inside timers) ────────────────────────
  const intervalRef = useRef(null);
  const transitioningTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const isPausedRef = useRef(false);
  const isTransitioningRef = useRef(false);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isTransitioningRef.current = isTransitioning; }, [isTransitioning]);

  // ─── Fetch ads on mount ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchAdsFromDb();
      if (cancelled || !mountedRef.current) return;
      setAds(data || []);
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Mount / unmount cleanup ──────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (transitioningTimeoutRef.current) clearTimeout(transitioningTimeoutRef.current);
      intervalRef.current = null;
      transitioningTimeoutRef.current = null;
    };
  }, []);

  // ─── Transition helper ────────────────────────────────────────
  const beginTransition = useCallback(() => {
    if (isTransitioningRef.current) return false;
    isTransitioningRef.current = true;
    setIsTransitioning(true);

    if (transitioningTimeoutRef.current) clearTimeout(transitioningTimeoutRef.current);
    transitioningTimeoutRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }, TRANSITION_MS);

    return true;
  }, []);

  const adCount = ads?.length || 0;

  const goToNext = useCallback(() => {
    if (!beginTransition() || adCount === 0) return;
    setCurrentAd((prev) => (prev + 1) % adCount);
  }, [beginTransition, adCount]);

  const goToPrev = useCallback(() => {
    if (!beginTransition() || adCount === 0) return;
    setCurrentAd((prev) => (prev - 1 + adCount) % adCount);
  }, [beginTransition, adCount]);

  const goToAd = useCallback(
    (index) => {
      if (index === currentAd) return;
      if (!beginTransition()) return;
      setCurrentAd(index);
    },
    [currentAd, beginTransition]
  );

  // ─── Auto-rotation ────────────────────────────────────────────
  useEffect(() => {
    if (adCount === 0) return;
    intervalRef.current = setInterval(() => {
      if (isPausedRef.current || isTransitioningRef.current) return;
      goToNext();
    }, ROTATE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [goToNext, adCount]);

  // ─── Logo error handler ──────────────────────────────────────
  const handleLogoError = useCallback((adId) => {
    setLogoError((prev) => {
      if (prev[adId]) return prev;
      const next = { ...prev, [adId]: true };
      try {
        localStorage.setItem(LOGO_ERROR_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  // ─── Render: loading placeholder ─────────────────────────────
  if (ads === null) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden mb-4 h-[100px] bg-surface/50 border border-[#2a2a2a] animate-pulse" />
    );
  }

  // ─── Render: no ads available ────────────────────────────────
  if (ads.length === 0) {
    return null;
  }

  // ─── Derived values for current ad ───────────────────────────
  const ad = ads[currentAd] || ads[0];
  const isRealAd = !!ad.domain;
  const initial = ad.title.charAt(0).toUpperCase();
  const isBiblicalELearning = ad.slug === 'biblical-elearning';

  const logoUrl = ad.logo_url && !logoError[ad.id] ? ad.logo_url : null;
  const bannerUrl = ad.banner_url && !logoError[ad.id] ? ad.banner_url : null;

  // ─── Background style ────────────────────────────────────────
  let bgStyle = {};
  const brandColor = ad.brand_color || '#000';

  if (isBiblicalELearning) {
    // Special three-portrait layout
    bgStyle = {
      backgroundColor: brandColor,
      backgroundImage: BIBLICAL_ELEARNING_BACKGROUNDS.map((u) => `url(${u})`).join(', '),
      backgroundSize: 'contain, contain, contain',
      backgroundPosition: 'left 25% center, center, right 25% center',
      backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
    };
  } else if (bannerUrl) {
    bgStyle = {
      backgroundColor: brandColor,
      backgroundImage: `url(${bannerUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  } else if (ad.bg_gradient) {
    bgStyle = { background: ad.bg_gradient };
  } else {
    bgStyle = {
      background: `linear-gradient(135deg, ${brandColor}40, ${brandColor}80)`,
    };
  }

  const logoContainerClass =
    'flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden';
  const imgClass = 'w-14 h-14 object-contain';

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden mb-4 group shadow-xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-center transition-all duration-700"
        style={bgStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent"></div>
      </div>

      {/* Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer"></div>

      {/* Content */}
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-full rounded-2xl p-5 px-10 md:px-12 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className={logoContainerClass}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={ad.title}
                className={imgClass}
                loading="lazy"
                onError={() => handleLogoError(ad.id)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${brandColor}cc, ${brandColor}66)`,
                }}
              >
                {ad.emoji || initial}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-base md:text-lg truncate drop-shadow-lg">
              {ad.title}
            </h4>
            <p className="text-white/80 text-xs md:text-sm truncate drop-shadow-md">
              {ad.description}
            </p>
          </div>

          <div className="text-xs text-white/50 flex-shrink-0 hidden sm:block drop-shadow-md">
            {isTransitioning ? '↻' : `${currentAd + 1}/${ads.length}`}
          </div>
        </div>
      </a>

      {/* Prev */}
      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-r-lg p-1.5 pl-2 pr-3 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary opacity-0 group-hover:opacity-100 sm:opacity-100 z-20 backdrop-blur-sm"
        aria-label="Previous ad"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Next */}
      <button
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-l-lg p-1.5 pr-2 pl-3 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary opacity-0 group-hover:opacity-100 sm:opacity-100 z-20 backdrop-blur-sm"
        aria-label="Next ad"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {ads.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToAd(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentAd ? 'bg-primary w-5' : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to ad ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}