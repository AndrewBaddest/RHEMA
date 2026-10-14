import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────
const LOGO_ERROR_CACHE_KEY = 'ad_logo_errors_v1';
const SEEN_ADS_KEY = 'rhema_ads_seen';
const SESSION_KEY = 'rhema_ad_session';
const ROTATE_INTERVAL_MS = 10000;
const TRANSITION_MS = 300;
const IMPRESSION_DELAY_MS = 1500;

// ─── Session identity ─────────────────────────────────────────────
function getSessionId() {
  if (typeof sessionStorage === 'undefined') return 'no-session';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = (crypto.randomUUID && crypto.randomUUID()) ||
          `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try { sessionStorage.setItem(SESSION_KEY, sid); } catch {}
  }
  return sid;
}

function getSeenAds() {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_ADS_KEY) || '[]');
  } catch {
    return [];
  }
}

function markAdSeen(adId) {
  try {
    const seen = getSeenAds();
    if (!seen.includes(adId)) {
      seen.push(adId);
      sessionStorage.setItem(SEEN_ADS_KEY, JSON.stringify(seen));
    }
  } catch {}
}

// ─── Impression / click tracking (fire-and-forget) ────────────────
async function recordImpression(adId, userId) {
  if (getSeenAds().includes(adId)) return; // one per ad per session
  markAdSeen(adId);
  try {
    await supabase.from('ad_impressions').insert({
      ad_id: adId,
      user_id: userId || null,
      session_id: getSessionId(),
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  } catch (err) {
    console.warn('[ads] impression insert failed:', err?.message || err);
  }
}

function recordClick(adId, userId) {
  // Fire-and-forget; the <a target="_blank"> keeps our page alive so the
  // request completes.
  supabase
    .from('ad_clicks')
    .insert({
      ad_id: adId,
      user_id: userId || null,
      session_id: getSessionId(),
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    })
    .then(() => {})
    .catch((err) => {
      console.warn('[ads] click insert failed:', err?.message || err);
    });
}

// ─── Fetch ads from DB, cached for the page lifetime ─────────────
let adsCache = null;
let adsFetchPromise = null;

function isActiveNow(ad) {
  const now = Date.now();
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return false;
  if (ad.ends_at && new Date(ad.ends_at).getTime() < now) return false;
  return true;
}

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
      // Scheduling filter applied client-side — the query is cheap and
      // already cached, so we don't complicate the SQL.
      adsCache = (data || []).filter(isActiveNow);
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

// ─── Weighted pick — next ad chosen proportional to `weight` ─────
function pickWeightedIndex(ads, excludeIndex) {
  if (!ads.length) return 0;
  const candidates = ads
    .map((ad, idx) => ({ idx, w: Math.max(1, ad.weight || 1) }))
    .filter((c) => c.idx !== excludeIndex);

  if (candidates.length === 0) return excludeIndex || 0;

  const total = candidates.reduce((sum, c) => sum + c.w, 0);
  let r = Math.random() * total;
  for (const c of candidates) {
    r -= c.w;
    if (r <= 0) return c.idx;
  }
  return candidates[candidates.length - 1].idx;
}

// ─── Ad 1 special case: three-portrait background ────────────────
const BIBLICAL_ELEARNING_BACKGROUNDS = [
  '/ads/ad-1-bg-1.jpg',
  '/ads/ad-1-bg-2.jpg',
  '/ads/ad-1-bg-3.jpg',
];

export default function AdRotator() {
  const { user } = useAuth();
  const [ads, setAds] = useState(null);
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

  // ─── Refs ─────────────────────────────────────────────────────
  const intervalRef = useRef(null);
  const transitioningTimeoutRef = useRef(null);
  const impressionTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const isPausedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const currentAdRef = useRef(0);
  const adsRef = useRef(null);
  const userRef = useRef(user);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isTransitioningRef.current = isTransitioning; }, [isTransitioning]);
  useEffect(() => { currentAdRef.current = currentAd; }, [currentAd]);
  useEffect(() => { adsRef.current = ads; }, [ads]);
  useEffect(() => { userRef.current = user; }, [user?.id]);

  // ─── Fetch ads ────────────────────────────────────────────────
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
      if (impressionTimerRef.current) clearTimeout(impressionTimerRef.current);
      intervalRef.current = null;
      transitioningTimeoutRef.current = null;
      impressionTimerRef.current = null;
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

  // ─── Navigation ───────────────────────────────────────────────
  const goToNext = useCallback(() => {
    if (!beginTransition() || adCount === 0) return;
    setCurrentAd((prev) => pickWeightedIndex(adsRef.current || [], prev));
  }, [beginTransition, adCount]);

  const goToPrev = useCallback(() => {
    if (!beginTransition() || adCount === 0) return;
    // Manual previous — sequential, feels right for deliberate navigation
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

  // ─── Impression tracking ─────────────────────────────────────
  // Fires one impression per ad per browser session, 1.5s after the ad
  // becomes visible. If the user rotates away before 1.5s, no count.
  useEffect(() => {
    if (!ads || ads.length === 0) return;
    const ad = ads[currentAd];
    if (!ad) return;

    if (impressionTimerRef.current) clearTimeout(impressionTimerRef.current);
    impressionTimerRef.current = setTimeout(() => {
      const stillCurrent = adsRef.current?.[currentAdRef.current];
      if (stillCurrent && stillCurrent.id === ad.id) {
        recordImpression(ad.id, userRef.current?.id);
      }
    }, IMPRESSION_DELAY_MS);

    return () => {
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
        impressionTimerRef.current = null;
      }
    };
  }, [currentAd, ads]);

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

  // ─── Loading / empty states ───────────────────────────────────
  if (ads === null) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden mb-4 h-[100px] bg-surface/50 border border-[#2a2a2a] animate-pulse" />
    );
  }

  if (ads.length === 0) {
    return null;
  }

  // ─── Derived values ───────────────────────────────────────────
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

  const handleAdClick = () => {
    recordClick(ad.id, user?.id);
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden mb-4 group shadow-xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="absolute inset-0 bg-center transition-all duration-700"
        style={bgStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent"></div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer"></div>

      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleAdClick}
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

      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-r-lg p-1.5 pl-2 pr-3 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary opacity-0 group-hover:opacity-100 sm:opacity-100 z-20 backdrop-blur-sm"
        aria-label="Previous ad"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-l-lg p-1.5 pr-2 pl-3 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary opacity-0 group-hover:opacity-100 sm:opacity-100 z-20 backdrop-blur-sm"
        aria-label="Next ad"
      >
        <ChevronRight size={20} />
      </button>

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