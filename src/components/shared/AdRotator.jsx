import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Get favicon from Google (high‑res) ──────────────────────────
const getFaviconUrl = (domain, size = 256) => {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
};

// ─── Fetch Open Graph image (with localStorage cache) ────────────
const fetchOgImage = async (url, adId) => {
  const cacheKey = `og_cache_${adId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { image, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return image;
      }
    } catch (e) {}
  }

  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&meta`);
    const data = await response.json();
    const image = data?.data?.image?.url || null;
    if (image) {
      localStorage.setItem(cacheKey, JSON.stringify({ image, timestamp: Date.now() }));
      return image;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to fetch OG image for ${url}:`, error);
    return null;
  }
};

// ─── Ad Data ──────────────────────────────────────────────────────
const ADS = [
  // Slot 1 – All Nations International
  {
    id: 7,
    title: 'All Nations International',
    description: 'Reaching the neglected globally – the least, the last, and the lost.',
    link: 'https://allnations.international/',
    domain: 'allnations.international',
    brandColor: '#2ecc71',
  },
  // Slot 2 – Biblical eLearning
  {
    id: 1,
    title: 'Biblical e‑Learning',
    description: 'Explore faith‑based education and resources.',
    link: 'https://biblicalelearning.org/',
    domain: 'biblicalelearning.org',
    brandColor: '#4a6cf7',
  },
  // Slot 3 – Global Challenge
  {
    id: 6,
    title: 'Global Challenge',
    description: 'Making disciples and shaping leaders worldwide.',
    link: 'https://globalchallenge.org/',
    domain: 'globalchallenge.org',
    brandColor: '#2a9d8f',
  },
  // Slot 4 – AAE
  {
    id: 3,
    title: 'AAE – Authentic African Experience',
    description: 'Discover authentic African culture and experiences.',
    link: 'https://aaeauthenticafricanexperience.co.za/',
    domain: 'aaeauthenticafricanexperience.co.za',
    brandColor: '#f77f00',
    ogUrl: 'https://aaeauthenticafricanexperience.co.za/experiences/',
    logoUrl: 'https://aaeauthenticafricanexperience.co.za/wp-content/uploads/2024/05/AAE-LOGO.png',
  },
  // Slot 5 – Fletcher Seminary
  {
    id: 4,
    title: 'Fletcher Seminary',
    description: 'Equipping leaders through theological education.',
    link: 'https://www.fletcherseminary.org/',
    domain: 'fletcherseminary.org',
    brandColor: '#9b5de5',
    ogUrl: 'https://www.fletcherseminary.org/',
    logoUrl: 'https://www.fletcherseminary.org/wp-content/uploads/2025/06/Group-20.svg',
  },
  // Slot 6 – Integér Network
  {
    id: 2,
    title: 'Integer Network',
    description: 'Connecting and empowering communities.',
    link: 'https://www.integernetwork.com/',
    domain: 'integernetwork.com',
    brandColor: '#00b4d8',
    ogUrl: 'https://www.integernetwork.com/',
    logoUrl: 'https://static.wixstatic.com/media/a6a89f_648afa660f96433e8a740f5b16d87573~mv2.png/v1/fill/w_600,h_600,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Integer%20Network%20Logo.png',
  },
  // Slot 7 – Phaneroo
  {
    id: 10,
    title: 'Phaneroo',
    description: 'Apostolic ministry equipping believers for impact.',
    link: 'https://phaneroo.org/',
    domain: 'phaneroo.org',
    brandColor: '#0984e3',
    ogUrl: 'https://phaneroo.org/',
  },
  // Slot 8 – Intimate777
  {
    id: 9,
    title: 'Intimacy777',
    description: 'Deepen your intimacy with God through resources and community.',
    link: 'https://www.intimite777.com/',
    domain: 'intimite777.com',
    brandColor: '#e84393',
    ogUrl: 'https://www.intimite777.com/',
    logoUrl: 'https://d1yei2z3i6k35z.cloudfront.net/11609387/69ade4b997ca6_intimitelogo.jpg',
  },
  // Slot 9 – Quantum Enterprise UG
  {
    id: 5,
    title: 'Quantum Enterprise UG',
    description: 'Building the living systems of tomorrow.',
    link: 'https://quantumenterpriseug.vercel.app/',
    domain: 'quantumenterpriseug.vercel.app',
    brandColor: '#7b2ffc',
    logoUrl: 'https://www.google.com/s2/favicons?domain=quantumenterpriseug.vercel.app&sz=256',
  },
  // Slot 10 – Ad Space Available
  {
    id: 8,
    title: 'Ad Space Available',
    description: 'Promote your ministry, business, or event here. Contact us to book.',
    link: 'mailto:rhemabiblequiz@gmail.com',
    domain: null,
    emoji: '🚀',
    brandColor: '#f39c12',
    bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/2948/2948037.png',
  },
];

export default function AdRotator() {
  const [currentAd, setCurrentAd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logoError, setLogoError] = useState({});
  const [ogImage, setOgImage] = useState(null);
  const [ogError, setOgError] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Start with the first ad (All Nations)
  useEffect(() => {
    setCurrentAd(0);
  }, []);

  // ── Fetch OG image for the current ad ──────────────────────────
  useEffect(() => {
    const ad = ADS[currentAd];
    if (!ad || !ad.link || ad.link.startsWith('mailto:')) {
      setOgImage(null);
      setOgError(false);
      return;
    }

    const loadOg = async () => {
      try {
        const urlToFetch = ad.ogUrl || ad.link;
        const image = await fetchOgImage(urlToFetch, ad.id);
        if (image) {
          setOgImage(image);
          setOgError(false);
        } else {
          setOgImage(null);
          setOgError(true);
        }
      } catch (e) {
        setOgImage(null);
        setOgError(true);
      }
    };

    loadOg();
  }, [currentAd]);

  // ── Auto‑rotation ──────────────────────────────────────────────
  const startAutoRotate = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPaused) return;
    intervalRef.current = setInterval(() => {
      goToNext();
    }, 10000);
  };

  const stopAutoRotate = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    startAutoRotate();
    return () => stopAutoRotate();
  }, [isPaused]);

  // ── Navigation ──────────────────────────────────────────────────
  const goToNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentAd((prev) => (prev + 1) % ADS.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentAd((prev) => (prev - 1 + ADS.length) % ADS.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToAd = (index) => {
    if (isTransitioning || index === currentAd) return;
    setIsTransitioning(true);
    setCurrentAd(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
    stopAutoRotate();
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startAutoRotate();
  };

  const handleLogoError = (adId) => {
    setLogoError((prev) => ({ ...prev, [adId]: true }));
  };

  const ad = ADS[currentAd] || ADS[0];
  const isRealAd = ad.domain !== null;
  const faviconUrl = isRealAd ? getFaviconUrl(ad.domain, 256) : null;
  const initial = ad.title.charAt(0).toUpperCase();

  // ── Determine which logo to show ──────────────────────────────
  const logoUrl = ad.logoUrl && !logoError[ad.id] ? ad.logoUrl : null;
  const useFavicon = !logoUrl && faviconUrl && !logoError[ad.id];
  const useOgAsLogo = !logoUrl && !useFavicon && (ad.id === 2 || ad.id === 4) && ogImage && !ogError;

  // ─── Background style ──────────────────────────────────────────
  let bgStyle = {};
  let bgColor = ad.brandColor || '#000';

  // --- Integer Network (id:2) with dark blue background ---
  if (ad.id === 2) {
    if (ogImage && !ogError) {
      bgStyle = {
        backgroundColor: '#0d47a1',
        backgroundImage: `url(${ogImage})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    } else {
      bgStyle = { backgroundColor: '#0d47a1' };
    }
  }
  // --- Intimate777 (id:9) with same dark blue background ---
  else if (ad.id === 9) {
    if (ogImage && !ogError) {
      bgStyle = {
        backgroundColor: '#0d47a1',
        backgroundImage: `url(${ogImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    } else {
      bgStyle = { backgroundColor: '#0d47a1' };
    }
  }
  // --- Biblical eLearning (id:1) – three images ---
  else if (ad.id === 1) {
    bgStyle = {
      backgroundColor: bgColor,
      backgroundImage: `
        url(https://biblicalelearning.org/wp-content/uploads/2021/10/Ted_Hildebrandt_Photo_Lake_Louis_Hotel-200x200.jpg),
        url(https://biblicalelearning.org/wp-content/uploads/2025/06/MayYoung_Picture_600x600-200x200.jpg),
        url(https://biblicalelearning.org/wp-content/uploads/2026/05/Steve400Staff-300x300.jpg)
      `,
      backgroundSize: 'contain, contain, contain',
      backgroundPosition: 'left 25% center, center, right 25% center',
      backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
    };
  }
  // --- Fletcher Seminary (id:4) – cover with top alignment ---
  else if (ad.id === 4) {
    if (ogImage && !ogError) {
      bgStyle = {
        backgroundColor: bgColor,
        backgroundImage: `url(${ogImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
      };
    } else {
      bgStyle = {
        background: `linear-gradient(135deg, ${ad.brandColor}40, ${ad.brandColor}80)`,
      };
    }
  }
  // --- Phaneroo (id:10) & Global Challenge (id:6) – contain ---
  else if ((ad.id === 10 || ad.id === 6) && ogImage && !ogError) {
    bgStyle = {
      backgroundImage: `url(${ogImage})`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  // --- Custom gradient if provided ---
  else if (ad.bgGradient) {
    bgStyle = { background: ad.bgGradient };
  }
  // --- Fallback: use OG image with cover ---
  else if (ogImage && !ogError) {
    bgStyle = {
      backgroundImage: `url(${ogImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  const logoContainerClass = ad.id === 2
    ? 'flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden'
    : 'flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden';

  const imgClass = 'w-14 h-14 object-contain';

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden mb-4 group shadow-xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─── Background ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-center transition-all duration-700"
        style={bgStyle}
      >
        {/* Overlay – lighter for Integer Network */}
        {ad.id === 2 ? (
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-transparent"></div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent"></div>
        )}
        {!ogImage && !ad.bgGradient && ad.id !== 1 && ad.id !== 4 && (
          <div className={`absolute inset-0 bg-gradient-to-br from-[${ad.brandColor}]/40 to-black/80`}></div>
        )}
      </div>

      {/* Animated shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer"></div>

      {/* ─── Content ──────────────────────────────────────────────── */}
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
            ) : useFavicon ? (
              <img
                src={faviconUrl}
                alt={ad.title}
                className={imgClass}
                loading="lazy"
                onError={() => handleLogoError(ad.id)}
              />
            ) : useOgAsLogo ? (
              <img
                src={ogImage}
                alt={ad.title}
                className={imgClass}
                loading="lazy"
                onError={() => handleLogoError(ad.id)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${ad.brandColor}cc, ${ad.brandColor}66)` }}
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
            {isTransitioning ? '↻' : `${currentAd + 1}/${ADS.length}`}
          </div>
        </div>
      </a>

      {/* ─── Navigation ────────────────────────────────────────────── */}
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

      {/* ─── Dots ───────────────────────────────────────────────────── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {ADS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToAd(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentAd
                ? 'bg-primary w-5'
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to ad ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}