import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import { ChevronDown, Sparkles, Edit3, Image as ImageIcon, Upload } from 'lucide-react';
import heroBgImage from '../assets/images/hero_intro_main.jpg';
import { useContent } from '../context/ContentContext';

interface HeroBackgroundProps {
  bgMode: 'image' | 'video';
  videoUrl?: string;
  bgImageUrl?: string;
  defaultPoster: string;
  imageScale: number;
}

/**
 * HeroBackground Component
 * - Isolated into React.memo to ensure scroll state updates NEVER re-render the video DOM element.
 * - Video is rendered on a dedicated GPU compositing layer without scroll-driven transforms.
 * - Strict conditional rendering: Image mode renders <img> only; Video mode renders <video> with smooth poster fade-in.
 * - Robust state handling for loading, error, autoplay rejection, and seamless looping.
 */
/**
 * SeamlessLoopVideoPlayer
 * High-performance dual-buffer video looping player.
 * Solves the native HTML5 video loop stutter / rewind freeze by alternating between two pre-buffered
 * video instances (A & B) right before the loop boundary (duration - 0.25s).
 * Provides hardware-accelerated playback with both WebM (VP9) and MP4 (H.264 faststart) sources.
 */
const SeamlessLoopVideoPlayer = memo<{
  videoUrl: string;
  posterImage: string;
}>(({ videoUrl, posterImage }) => {
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const switchingRef = useRef(false);

  // Derive WebM source if standard default video
  const webmUrl = videoUrl.includes('/assets/videos/intro_bg.mp4')
    ? videoUrl.replace(/\.mp4$/, '.webm')
    : undefined;

  // Initialize video elements and audio policies
  useEffect(() => {
    const vA = videoRefA.current;
    const vB = videoRefB.current;
    if (!vA || !vB) return;

    vA.muted = true;
    vA.defaultMuted = true;
    vB.muted = true;
    vB.defaultMuted = true;

    switchingRef.current = false;
    setActivePlayer('A');

    const tryPlay = () => {
      setIsPlaying(true);
      setHasError(false);
      vA.play().catch((err) => {
        console.warn('Autoplay handled:', err);
      });
    };

    if (vA.readyState >= 2) {
      tryPlay();
    } else {
      vA.addEventListener('canplay', tryPlay, { once: true });
      vA.addEventListener('loadeddata', tryPlay, { once: true });
    }

    vA.load();
    vB.load();

    const resumeIfPaused = () => {
      if (vA && vA.paused) vA.play().catch(() => {});
    };
    window.addEventListener('touchstart', resumeIfPaused, { once: true, passive: true });
    window.addEventListener('click', resumeIfPaused, { once: true, passive: true });

    return () => {
      vA.removeEventListener('canplay', tryPlay);
      vA.removeEventListener('loadeddata', tryPlay);
      window.removeEventListener('touchstart', resumeIfPaused);
      window.removeEventListener('click', resumeIfPaused);
    };
  }, [videoUrl]);

  // Viewport Intersection: Pause when scrolled far away, resume when in viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vA = videoRefA.current;
          const vB = videoRefB.current;
          if (entry.isIntersecting) {
            if (activePlayer === 'A' && vA && vA.paused) vA.play().catch(() => {});
            if (activePlayer === 'B' && vB && vB.paused) vB.play().catch(() => {});
          } else {
            if (vA && !vA.paused) vA.pause();
            if (vB && !vB.paused) vB.pause();
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [activePlayer]);

  // Fallback if boundary handover was bypassed by browser event throttling
  const handleEnded = (playerId: 'A' | 'B') => {
    const currentEl = playerId === 'A' ? videoRefA.current : videoRefB.current;
    const nextEl = playerId === 'A' ? videoRefB.current : videoRefA.current;
    switchingRef.current = false;
    if (nextEl) {
      nextEl.currentTime = 0;
      nextEl.play().catch(() => {});
      setActivePlayer(playerId === 'A' ? 'B' : 'A');
    } else if (currentEl) {
      currentEl.currentTime = 0;
      currentEl.play().catch(() => {});
    }
  };

  // Seamless Time Boundary Handover Handler
  const handleTimeUpdate = (playerId: 'A' | 'B') => {
    if (playerId !== activePlayer || switchingRef.current) return;
    const currentEl = playerId === 'A' ? videoRefA.current : videoRefB.current;
    const nextEl = playerId === 'A' ? videoRefB.current : videoRefA.current;

    if (!currentEl || !nextEl) return;
    const duration = currentEl.duration;

    // Handover triggers 0.28s before duration end to guarantee zero-latency transition
    if (Number.isFinite(duration) && duration > 0.6 && currentEl.currentTime >= duration - 0.28) {
      switchingRef.current = true;
      nextEl.currentTime = 0;
      const playPromise = nextEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setActivePlayer(playerId === 'A' ? 'B' : 'A');
            setTimeout(() => {
              switchingRef.current = false;
              if (currentEl) {
                currentEl.pause();
                currentEl.currentTime = 0;
              }
            }, 200);
          })
          .catch(() => {
            switchingRef.current = false;
          });
      }
    }
  };

  if (hasError) {
    return (
      <img
        src={posterImage}
        alt="평창연수원 화이트힐 인트로 메인 배경"
        className="absolute inset-0 w-full h-full object-cover object-center block select-none"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
      }}
    >
      {/* Fallback Poster (Zero black screen flash during boot) */}
      <div
        className={`absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none transition-opacity duration-500 ease-out ${
          isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url(${posterImage})`,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Video Instance A */}
      <video
        ref={videoRefA}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onTimeUpdate={() => handleTimeUpdate('A')}
        onEnded={() => handleEnded('A')}
        onPlay={() => setIsPlaying(true)}
        onError={() => setHasError(true)}
        className="absolute inset-0 w-full h-full object-cover object-center block select-none pointer-events-none"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          willChange: 'opacity',
          opacity: activePlayer === 'A' && isPlaying ? 1 : 0,
          transition: 'opacity 180ms ease-out',
        }}
      >
        {webmUrl && <source src={webmUrl} type="video/webm" />}
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Video Instance B (Pre-buffered seamless loop counterpart) */}
      <video
        ref={videoRefB}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onTimeUpdate={() => handleTimeUpdate('B')}
        onEnded={() => handleEnded('B')}
        onPlay={() => setIsPlaying(true)}
        onError={() => setHasError(true)}
        className="absolute inset-0 w-full h-full object-cover object-center block select-none pointer-events-none"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          willChange: 'opacity',
          opacity: activePlayer === 'B' && isPlaying ? 1 : 0,
          transition: 'opacity 180ms ease-out',
        }}
      >
        {webmUrl && <source src={webmUrl} type="video/webm" />}
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
});

SeamlessLoopVideoPlayer.displayName = 'SeamlessLoopVideoPlayer';

/**
 * HeroBackground Component
 * Wrapped with custom memo comparator:
 * In video mode, scroll-driven changes to imageScale will NEVER cause re-renders of the video layer.
 */
const HeroBackground = memo<HeroBackgroundProps>(
  ({ bgMode, videoUrl, bgImageUrl, defaultPoster, imageScale }) => {
    const posterImage = bgImageUrl || defaultPoster;
    const isVideoMode = bgMode === 'video' && Boolean(videoUrl);

    if (!isVideoMode) {
      return (
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{
            transform: `scale(${imageScale}) translate3d(0, 0, 0)`,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            willChange: 'transform',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <img
            src={posterImage}
            alt="평창연수원 화이트힐 인트로 메인 배경"
            className="absolute inset-0 w-full h-full object-cover object-center block select-none"
            referrerPolicy="no-referrer"
            loading="eager"
          />
        </div>
      );
    }

    return (
      <SeamlessLoopVideoPlayer
        videoUrl={videoUrl!}
        posterImage={posterImage}
      />
    );
  },
  (prevProps, nextProps) => {
    // If remaining in video mode, ignore imageScale changes to guarantee 60fps stutter-free playback!
    if (prevProps.bgMode === 'video' && nextProps.bgMode === 'video') {
      return (
        prevProps.videoUrl === nextProps.videoUrl &&
        prevProps.bgImageUrl === nextProps.bgImageUrl &&
        prevProps.defaultPoster === nextProps.defaultPoster
      );
    }
    return (
      prevProps.bgMode === nextProps.bgMode &&
      prevProps.videoUrl === nextProps.videoUrl &&
      prevProps.bgImageUrl === nextProps.bgImageUrl &&
      prevProps.defaultPoster === nextProps.defaultPoster &&
      prevProps.imageScale === nextProps.imageScale
    );
  }
);

HeroBackground.displayName = 'HeroBackground';

interface HeroSectionProps {
  onDiscoverClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onDiscoverClick }) => {
  const {
    content,
    updateImageBlob,
    isAdminMode,
    setIsAdminModalOpen,
    setActiveAdminTab,
  } = useContent();

  const [scrollY, setScrollY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optimized Passive rAF-Throttled Scroll Listener
  useEffect(() => {
    setIsLoaded(true);

    let ticking = false;
    let lastScrollY = 0;

    const updateScrollPosition = () => {
      const currentScroll = typeof window !== 'undefined'
        ? (window.scrollY ?? window.pageYOffset ?? document.documentElement?.scrollTop ?? 0)
        : 0;
      const safeY = Number.isFinite(currentScroll) ? Math.max(0, currentScroll) : 0;
      const heroHeight = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 900;

      // Only update state if change is relevant and within hero visibility window
      if (Math.abs(safeY - lastScrollY) >= 1.5 && safeY <= heroHeight * 1.3) {
        lastScrollY = safeY;
        setScrollY(safeY);
      } else if (safeY > heroHeight * 1.3 && lastScrollY < heroHeight * 1.3) {
        lastScrollY = safeY;
        setScrollY(heroHeight * 1.3);
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollPosition);
        ticking = true;
      }
    };

    updateScrollPosition();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await updateImageBlob(file);
        setUploadToast('첨부하신 이미지가 변환/보정 없이 100% 원본 그대로 적용되었습니다.');
        setTimeout(() => setUploadToast(null), 3000);
      } catch (err) {
        console.error('Failed to load image:', err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        await updateImageBlob(file);
        setUploadToast('첨부하신 이미지가 변환/보정 없이 100% 원본 그대로 적용되었습니다.');
        setTimeout(() => setUploadToast(null), 3000);
      } catch (err) {
        console.error('Failed to drop image:', err);
      }
    }
  };

  // Compute scroll progress for overlay darkening and text floatation
  const currentY = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  const rawHeight = typeof window !== 'undefined' && Number.isFinite(window.innerHeight) && window.innerHeight > 0
    ? window.innerHeight
    : 900;
  const maxScroll = Math.max(1, rawHeight);
  const rawRatio = currentY / maxScroll;
  const progress = Number.isFinite(rawRatio) ? Math.min(1, Math.max(0, rawRatio)) : 0;

  // 1. Slow scale for image mode only (video mode stays fixed on GPU layer)
  const imageScale = Number.isFinite(progress) ? 1.0 + progress * 0.12 : 1.0;

  // 2. Screen gently darkens as user scrolls down
  const darkOverlayOpacity = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress * 0.6))
    : 0;

  // 3. Narrative text floats upward and dims
  const textTranslateY = Number.isFinite(progress) ? progress * 60 : 0;
  const textOpacity = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, 1 - progress * 1.35))
    : 1;

  const currentBgImage = content.intro.bgImageUrl || heroBgImage;

  return (
    <section
      id="hero"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full h-[100vh] min-h-[720px] flex items-center justify-center overflow-hidden select-none bg-[#0a0a0a] transition-all ${
        isDragging ? 'ring-4 ring-inset ring-[#C9A45C]' : ''
      }`}
    >
      {/* Hidden file input for direct 1-click unadulterated original image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Drag & Drop Overlay Notice */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 text-[#E0C37E] backdrop-blur-sm pointer-events-none">
          <Upload className="w-16 h-16 animate-bounce text-[#C9A45C]" />
          <p className="text-xl font-medium">첨부할 이미지를 여기에 놓으세요</p>
          <p className="text-xs text-white/60">어떤 색감 보정이나 필터 변환 없이 원본 그대로 배경에 적용됩니다.</p>
        </div>
      )}

      {/* Toast Notification */}
      {uploadToast && (
        <div className="absolute top-20 z-50 px-5 py-2.5 rounded-full bg-[#111111]/95 border border-[#C9A45C] text-[#E0C37E] text-xs sm:text-sm font-medium shadow-2xl flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-[#C9A45C]" />
          <span>{uploadToast}</span>
        </div>
      )}

      {/* Fully Isolated & Memoized Hero Background Layer */}
      <HeroBackground
        bgMode={content.intro.bgMode}
        videoUrl={content.intro.videoUrl}
        bgImageUrl={content.intro.bgImageUrl}
        defaultPoster={heroBgImage}
        imageScale={isLoaded ? imageScale : 1.04}
      />

      {/* Dynamic Scroll Darkening Overlay (CSS opacity transition, decoupled from video) */}
      <div
        className="absolute inset-0 bg-[#0d0d0d] pointer-events-none transition-opacity duration-150"
        style={{
          opacity: darkOverlayOpacity,
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Top Quick Actions (Admin Mode Only) */}
      {isAdminMode && (
        <div className="absolute top-20 sm:top-24 right-4 sm:right-8 z-30 flex items-center gap-2 animate-fadeIn">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="첨부한 이미지를 보정/필터 없이 100% 원본 그대로 즉시 적용"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-[#E0C37E] hover:text-white text-xs border border-[#C9A45C]/50 shadow-lg backdrop-blur-md transition-all"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#C9A45C]" />
            <span>배경 이미지 원본 등록</span>
          </button>

          <button
            onClick={() => {
              setActiveAdminTab('intro');
              setIsAdminModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] text-xs font-semibold shadow-lg transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>INTRO 편집</span>
          </button>
        </div>
      )}

      {/* Hero Narrative Overlay Content (Decoupled transform/opacity) */}
      <div
        className="relative z-20 max-w-5xl mx-auto px-6 text-center flex flex-col items-center justify-between h-[82vh]"
        style={{
          transform: `translate3d(0, ${textTranslateY}px, 0)`,
          opacity: textOpacity,
          transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
          willChange: 'transform, opacity',
        }}
      >
        {/* Top Eyebrow Tag */}
        <div className="pt-20 sm:pt-24 flex items-center gap-3">
          <div className="h-[1px] w-8 sm:w-16 bg-[#C9A45C]/60" />
          <span className="flex items-center gap-1.5 text-xs sm:text-sm tracking-[0.28em] uppercase text-[#E0C37E] font-serif-display font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A45C]" />
            {content.intro.chapterTag}
          </span>
          <div className="h-[1px] w-8 sm:w-16 bg-[#C9A45C]/60" />
        </div>

        {/* Center Main Headline */}
        <div className="space-y-4 my-auto max-w-3xl">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.3] text-[#F5F2EA] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            <span className="font-serif-display text-[#E0C37E] block sm:inline font-semibold">
              {content.intro.buildingName}
            </span>{' '}
            {content.intro.titleLine1}
            <br />
            <span className="text-white/95">{content.intro.titleLine2}</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[#F5F2EA]/90 font-light tracking-widest max-w-xl mx-auto leading-relaxed pt-2 whitespace-pre-line drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            {content.intro.description}
          </p>
        </div>

        {/* Bottom Callout & Scroll Indicator */}
        <div className="pb-8 flex flex-col items-center gap-3">
          <button
            onClick={onDiscoverClick}
            id="hero-scroll-btn"
            className="group flex flex-col items-center gap-2.5 text-[#E0C37E] hover:text-white transition-all focus:outline-none"
            aria-label="Scroll to discover"
          >
            <span className="text-xs sm:text-sm font-serif-display tracking-[0.26em] uppercase font-medium">
              {content.intro.scrollButtonText}
            </span>
            <div className="w-8 h-8 rounded-full border border-[#C9A45C]/40 flex items-center justify-center group-hover:border-[#C9A45C] group-hover:bg-[#C9A45C]/10 transition-all">
              <ChevronDown className="w-4 h-4 animate-bounce text-[#C9A45C]" />
            </div>
          </button>
        </div>
      </div>

      {/* Seamless gradient seam at bottom blending into Floor Plan */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent pointer-events-none" />
    </section>
  );
};

