import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { VerticalProgress } from './components/VerticalProgress';
import { HeroSection } from './components/HeroSection';
import { RevealSection } from './components/RevealSection';
import { SpaceExploration } from './components/SpaceExploration';
import { Panorama360Viewer } from './components/Panorama360Viewer';
import { ContentProvider, useContent } from './context/ContentContext';
import { SPACES_DATA } from './data/spacesData';
import { SpaceData } from './types/spaces';
import { ScrollToTopButton } from './components/ScrollToTopButton';

function MainApp() {
  const { content } = useContent();
  const [activeSection, setActiveSection] = useState('hero');
  const [selectedSpace, setSelectedSpace] = useState<SpaceData>(() => {
    return (content.spaces?.items?.[0] as unknown as SpaceData) || SPACES_DATA[0];
  });
  const [is360ViewerOpen, setIs360ViewerOpen] = useState(false);
  const [active360Space, setActive360Space] = useState<SpaceData>(() => {
    return (content.spaces?.items?.[0] as unknown as SpaceData) || SPACES_DATA[0];
  });

  // Ensure homepage always starts locked to the top INTRO ('hero') section on refresh and initial visit
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Immediately snap to top without animation
    window.scrollTo(0, 0);
    setActiveSection('hero');

    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      setActiveSection('hero');
    });

    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      setActiveSection('hero');
    }, 80);

    const handleBeforeUnload = () => {
      window.scrollTo(0, 0);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Section observer to update activeSection on scroll
  useEffect(() => {
    const sectionIds = ['hero', 'floorplan', 'spaces', 'guide'];

    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 120) {
        setActiveSection('hero');
        return;
      }

      const scrollPosition = scrollY + 200;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to target section
  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection('hero');
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -60;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Handle opening 360 viewer with cinematic transition
  const handleOpen360 = (space?: SpaceData) => {
    const defaultSpace = (content.spaces?.items?.[0] as unknown as SpaceData) || SPACES_DATA[0];
    const targetSpace = space || selectedSpace || defaultSpace;
    const liveSpace = (content.spaces?.items || []).find((s) => s.id === targetSpace.id);
    setActive360Space((liveSpace as unknown as SpaceData) || targetSpace);
    setIs360ViewerOpen(true);
  };

  const handleSelectSpace = (space: SpaceData) => {
    setSelectedSpace(space);
    // Scroll smoothly to the space exploration editorial card
    scrollToSection('spaces');
  };

  return (
    <div className="relative min-h-screen bg-[#111111] text-[#F5F2EA] font-sans selection:bg-[#C9A45C]/30 selection:text-white">
      {/* Top Floating Navigation */}
      <Navigation
        activeSection={activeSection}
        onOpenViewer={() => handleOpen360()}
      />

      {/* Side Vertical Progress Indicator */}
      <VerticalProgress
        activeSection={activeSection}
        onSelectSection={scrollToSection}
      />

      {/* Chapter 01. INTRO (Hero, Question Mark Reveal, Scroll-Scale) */}
      <HeroSection onDiscoverClick={() => scrollToSection('floorplan')} />

      {/* Chapter 02. 평면도 (CAD Blueprint Drafting Sequence, Hotspots, Spatial Details) */}
      <RevealSection
        onSelectSpace={handleSelectSpace}
        onEnter360={(space) => handleOpen360(space)}
      />

      {/* Chapter 03. 공간탐색 (Editorial Space Selection & Future 360° Panorama Integration) */}
      <SpaceExploration
        selectedSpace={selectedSpace}
        onSelectSpace={setSelectedSpace}
        onEnter360={(space) => handleOpen360(space)}
      />

      {/* Chapter 04. 이용안내 (Employee User Guide) */}
      <section
        id="guide"
        className="w-full bg-[#111111] py-20 px-6 sm:px-10 lg:px-16 border-t border-[#C9A45C]/20"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A45C]/10 border border-[#C9A45C]/30 text-[#C9A45C] text-xs font-serif-display uppercase tracking-widest">
              <span>USER GUIDE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif-display font-medium text-[#F5F2EA]">
              이용안내
            </h2>
            <p className="text-sm sm:text-base text-white/70 max-w-2xl">
              한솔섬유 임직원을 위한 평창연수원(화이트힐) 리모델링 안내 웹 이용 가이드입니다. 
              360° 가상 투어와 층별 평면도를 통해 새로워진 연수원 공간을 손쉽게 둘러보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#171717] rounded-xl p-6 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#C9A45C]/20 flex items-center justify-center text-[#C9A45C] font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-semibold text-[#F5F2EA]">360° 파노라마 투어</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                마우스 드래그 또는 모바일 화면 터치로 상하좌우 360° 자유롭게 시점을 회전할 수 있습니다. 휠 스크롤이나 핀치 제스처로 확대·축소가 가능합니다.
              </p>
            </div>

            <div className="bg-[#171717] rounded-xl p-6 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#C9A45C]/20 flex items-center justify-center text-[#C9A45C] font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-semibold text-[#F5F2EA]">핫스팟 및 공간 이동</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                360° 화면 속 원형 핫스팟 아이콘을 클릭하면 인접한 다음 공간으로 매끄러운 줌 효과와 함께 즉시 이동합니다.
              </p>
            </div>

            <div className="bg-[#171717] rounded-xl p-6 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#C9A45C]/20 flex items-center justify-center text-[#C9A45C] font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-semibold text-[#F5F2EA]">평면도 및 레이더</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                평면도 섹션에서 층별 도면 레이어를 단계별로 확인하고, 360° 뷰어 내부의 미니 평면도 레이더로 현재 위치와 시야각을 실시간 파악할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Architectural Footer */}
      <footer className="w-full bg-[#0d0d0d] border-t border-white/10 py-12 px-6 text-xs text-white/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#C9A45C]" />
            <span className="font-serif-display text-[#F5F2EA] tracking-widest uppercase font-semibold text-sm">
              {content.brand.name}
            </span>
            <span className="text-white/40 text-xs ml-1">{content.brand.subName}</span>
          </div>

          <p className="text-xs tracking-wider text-white/40">
            {content.brand.copyright}
          </p>

          <div className="flex items-center gap-3 text-xs text-[#C9A45C]/80 flex-wrap">
            <button onClick={() => scrollToSection('hero')} className="hover:text-white transition-colors cursor-pointer">소개</button>
            <span>•</span>
            <button onClick={() => scrollToSection('floorplan')} className="hover:text-white transition-colors cursor-pointer">평면도</button>
            <span>•</span>
            <button onClick={() => scrollToSection('spaces')} className="hover:text-white transition-colors cursor-pointer">공간탐색</button>
            <span>•</span>
            <button onClick={() => scrollToSection('guide')} className="hover:text-white transition-colors cursor-pointer">이용안내</button>
          </div>
        </div>
      </footer>

      {/* Fullscreen 360 Panoramic Equirectangular Interactive Viewer */}
      <Panorama360Viewer
        isOpen={is360ViewerOpen}
        initialSpace={active360Space}
        onClose={() => setIs360ViewerOpen(false)}
      />

      {/* Scroll-To-Top Button (스크롤로 화면이 넘어갈 때 최상단 소개 탭으로 한 번에 이동) */}
      <ScrollToTopButton onScrollToTop={() => setActiveSection('hero')} />
    </div>
  );
}

export default function App() {
  return (
    <ContentProvider>
      <MainApp />
    </ContentProvider>
  );
}
