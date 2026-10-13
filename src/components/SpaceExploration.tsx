import React, { useRef, useState, useEffect } from 'react';
import { Compass, Sparkles, Check, ArrowRight, Eye, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { SpaceData } from '../types/spaces';
import { SPACES_DATA } from '../data/spacesData';
import { useContent } from '../context/ContentContext';

interface SpaceExplorationProps {
  selectedSpace: SpaceData;
  onSelectSpace: (space: SpaceData) => void;
  onEnter360: (space: SpaceData) => void;
}

export const SpaceExploration: React.FC<SpaceExplorationProps> = ({
  selectedSpace,
  onSelectSpace,
  onEnter360,
}) => {
  const { content, isAdminMode, setIsAdminModalOpen, setActiveAdminTab } = useContent();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Merge static space metadata with live editable texts and custom hotspots
  const spaces: SpaceData[] = content.spaces.items.map((item) => {
    const sp = SPACES_DATA.find((s) => s.id === item.id);
    return {
      id: item.id,
      spaceNumber: item.spaceNumber || '00',
      name: item.name,
      koreanName: item.koreanName,
      category: (item.category as any) || (sp?.category || 'LIVING'),
      tagline: item.tagline || (sp?.tagline || ''),
      description: item.description || (sp?.description || ''),
      architecturalHighlights: item.architecturalHighlights || (sp?.architecturalHighlights || []),
      dimensionsCAD: item.dimensionsCAD || (sp?.dimensionsCAD || ''),
      floorplan: item.floorplan || (sp?.floorplan || { x: 50, y: 50, width: 20, height: 20 }),
      highlightPolygon: item.highlightPolygon || sp?.highlightPolygon,
      panoramaUrl: item.panoramaUrl !== undefined ? item.panoramaUrl : (sp?.panoramaUrl || null),
      connectedSpaceIds: item.connectedSpaceIds || (sp?.connectedSpaceIds || []),
      panoramaHotspots: item.panoramaHotspots || sp?.panoramaHotspots,
    };
  });

  const activeSpace = spaces.find((s) => s.id === selectedSpace.id) || spaces[0];
  const activeIndex = spaces.findIndex((s) => s.id === activeSpace.id);

  // Filter valid highlights (max 4, only non-empty registered texts)
  const validHighlights = (activeSpace.architecturalHighlights || [])
    .map((h) => (typeof h === 'string' ? h.trim() : ''))
    .filter((h) => h.length > 0)
    .slice(0, 4);

  // Navigate to previous/next space
  const handlePrevSpace = () => {
    const prevIdx = (activeIndex - 1 + spaces.length) % spaces.length;
    onSelectSpace(spaces[prevIdx]);
  };

  const handleNextSpace = () => {
    const nextIdx = (activeIndex + 1) % spaces.length;
    onSelectSpace(spaces[nextIdx]);
  };

  // Check horizontal scroll limits
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [spaces.length]);

  // When active space changes, scroll its pill into center view smoothly
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector(`[data-space-id="${activeSpace.id}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    checkScroll();
  }, [activeSpace.id]);

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -280 : 280;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 320);
  };

  return (
    <section
      id="spaces"
      className="relative w-full bg-[#141414] py-24 sm:py-32 px-4 sm:px-8 lg:px-12 border-t border-[#C9A45C]/20"
    >
      {/* Admin quick edit button */}
      {isAdminMode && (
        <button
          onClick={() => {
            setActiveAdminTab('spaces');
            setIsAdminModalOpen(true);
          }}
          className="absolute top-8 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A45C]/90 text-[#111111] text-xs font-semibold shadow-lg hover:bg-white transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>공간 상세 텍스트 편집</span>
        </button>
      )}

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A45C]/10 border border-[#C9A45C]/30 text-[#C9A45C] text-xs font-serif-display uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{content.spaces.chapterTag}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif-display font-medium text-[#F5F2EA]">
              {content.spaces.title}
            </h2>
            <p className="text-sm sm:text-base text-white/70 max-w-xl whitespace-pre-line">
              {content.spaces.subtitle}
            </p>
          </div>

            {/* Quick Space Stepper for easy navigation across 13+ spaces */}
          <div className="flex items-center gap-2 bg-[#1b1b1b] border border-[#C9A45C]/30 rounded-full px-3 py-1.5 self-start md:self-auto shadow-md">
            <button
              type="button"
              onClick={handlePrevSpace}
              className="flex items-center gap-1 text-xs text-white/80 hover:text-[#C9A45C] transition-colors p-1 rounded-full hover:bg-white/5"
              aria-label="이전 공간으로 넘기기"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline font-sans text-xs">이전 공간</span>
            </button>
            <span className="font-mono text-xs text-[#E0C37E] font-semibold px-2 border-x border-white/10">
              {String(activeIndex + 1).padStart(2, '0')} / {String(spaces.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={handleNextSpace}
              className="flex items-center gap-1 text-xs text-white/80 hover:text-[#C9A45C] transition-colors p-1 rounded-full hover:bg-white/5"
              aria-label="다음 공간으로 넘기기"
            >
              <span className="hidden sm:inline font-sans text-xs">다음 공간</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Space Horizontal Selector Pills with Arrow Navigation */}
        <div className="relative flex items-center gap-2">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            disabled={!canScrollLeft}
            aria-label="이전 공간 목록 스크롤"
            className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center border transition-all duration-200 ${
              canScrollLeft
                ? 'bg-[#1a1a1a] text-[#C9A45C] border-[#C9A45C]/40 hover:bg-[#C9A45C] hover:text-[#111111] shadow-lg cursor-pointer'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-30'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Track */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth no-scrollbar flex-1"
          >
            {spaces.map((space) => {
              const isSelected = activeSpace.id === space.id;
              return (
                <button
                  key={space.id}
                  data-space-id={space.id}
                  onClick={() => onSelectSpace(space)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs whitespace-nowrap transition-all duration-300 shrink-0 ${
                    isSelected
                      ? 'bg-[#C9A45C] text-[#111111] font-semibold shadow-[0_0_16px_rgba(201,164,92,0.4)]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-[#111111]' : 'bg-[#C9A45C]'
                    }`}
                  />
                  <span className="font-mono text-xs">SPACE {space.spaceNumber}</span>
                  <span className="font-serif-display text-xs">{space.koreanName}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            disabled={!canScrollRight}
            aria-label="다음 공간 목록 스크롤"
            className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center border transition-all duration-200 ${
              canScrollRight
                ? 'bg-[#1a1a1a] text-[#C9A45C] border-[#C9A45C]/40 hover:bg-[#C9A45C] hover:text-[#111111] shadow-lg cursor-pointer'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-30'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Space Editorial Showcase Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-[#171717] rounded-2xl p-6 sm:p-10 border border-white/10 shadow-2xl">
          {/* Left Column: Architectural Story & Specs */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Space Number, Category & Navigation Arrows */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded bg-[#C9A45C]/20 text-[#C9A45C] font-mono text-xs font-bold">
                    SPACE {activeSpace.spaceNumber}
                  </span>
                  <span className="text-xs font-mono text-white/50 uppercase tracking-widest">
                    CATEGORY: {activeSpace.category}
                  </span>
                </div>

                {/* Arrow navigation inside card */}
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full border border-white/10">
                  <button
                    type="button"
                    onClick={handlePrevSpace}
                    className="p-1 rounded-full text-white/70 hover:text-[#C9A45C] hover:bg-white/10 transition-colors"
                    title="이전 공간으로 넘기기"
                    aria-label="이전 공간으로 넘기기"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-[#E0C37E] font-medium px-1.5">
                    {activeIndex + 1} / {spaces.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextSpace}
                    className="p-1 rounded-full text-white/70 hover:text-[#C9A45C] hover:bg-white/10 transition-colors"
                    title="다음 공간으로 넘기기"
                    aria-label="다음 공간으로 넘기기"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Space Names */}
              <div>
                <h3 className="text-2xl sm:text-4xl font-serif-display font-medium text-[#F5F2EA] leading-tight">
                  {activeSpace.name}
                </h3>
                <p className="text-lg sm:text-xl text-[#C9A45C] font-normal pt-1">
                  {activeSpace.koreanName}
                </p>
              </div>

              {/* Tagline */}
              <div className="border-l-2 border-[#C9A45C] pl-4 py-1 italic text-sm sm:text-base text-white/90">
                "{activeSpace.tagline}"
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-white/70 leading-relaxed pt-2">
                {activeSpace.description}
              </p>

              {/* Architectural Highlights (Max 4, rendered only for registered non-empty text items) */}
              {validHighlights.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-serif-display text-white/50 uppercase tracking-wider">
                    ARCHITECTURAL UPGRADES
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {validHighlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-white/80">
                        <div className="w-4 h-4 rounded-full bg-[#C9A45C]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-[#C9A45C]" />
                        </div>
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
              {activeSpace.panoramaUrl ? (
                <button
                  onClick={() => onEnter360(activeSpace)}
                  className="px-6 py-3 rounded-lg bg-[#C9A45C] hover:bg-[#E0C37E] text-[#111111] font-semibold text-xs tracking-widest uppercase transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(201,164,92,0.3)] cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>360°로 둘러보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    disabled
                    className="px-6 py-3 rounded-lg bg-white/10 text-white/35 font-semibold text-xs tracking-widest uppercase flex items-center gap-2 cursor-not-allowed border border-white/10"
                  >
                    <Compass className="w-4 h-4" />
                    <span>360°로 둘러보기</span>
                  </button>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                    촬영 예정
                  </span>
                </div>
              )}

              <div className="text-xs font-mono text-white/50">
                연결 동선: {activeSpace.connectedSpaceIds.length}개 공간 직결
              </div>
            </div>
          </div>

          {/* Right Column: [ LARGE PLACEHOLDER / FUTURE 360° ] */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="relative w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-[#0c0c0c] to-[#1a1a1a] border-2 border-dashed border-[#C9A45C]/35 flex flex-col items-center justify-center p-6 text-center overflow-hidden group">
              {/* Subtle architectural radial glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,164,92,0.1)_0%,transparent_70%)] pointer-events-none" />

              {/* Architectural Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

              {/* Status Badge */}
              <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-[#C9A45C]/40 text-[#C9A45C] text-xs font-mono tracking-widest uppercase mb-4">
                <Compass className="w-3 h-3 animate-spin text-[#C9A45C]" style={{ animationDuration: '8s' }} />
                <span>360° 파노라마 뷰</span>
              </div>

              {/* Center Box Content */}
              <div className="relative z-10 space-y-3 max-w-md">
                <div className="text-2xl sm:text-3xl font-serif-display font-medium tracking-wider text-[#F5F2EA]">
                  {selectedSpace.panoramaUrl ? '360° 공간 탐색' : '360° 가상 투어'}
                </div>

                <div className="font-mono text-xs text-[#C9A45C] tracking-[0.2em] font-semibold">
                  {selectedSpace.panoramaUrl ? '360° 사진 등록 완료' : '촬영 예정'}
                </div>

                <div className="w-16 h-[1px] bg-[#C9A45C]/50 mx-auto my-3" />

                <p className="text-sm text-white/70 leading-relaxed px-4">
                  {selectedSpace.panoramaUrl
                    ? '실제 360° 파노라마 공간이 준비되어 있습니다. 클릭하여 풀스크린 가상 투어를 시작하세요.'
                    : '본 공간은 평창연수원 리모델링 완공 후 고화질 360° 파노라마 사진이 등록되어 자유로운 내부 가상 투어가 활성화됩니다.'}
                </p>

                {/* Interactive Launch Button */}
                <div className="pt-4">
                  {selectedSpace.panoramaUrl ? (
                    <button
                      onClick={() => onEnter360(selectedSpace)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#C9A45C] bg-[#C9A45C]/15 hover:bg-[#C9A45C] text-[#F5F2EA] hover:text-[#111111] text-xs font-semibold tracking-wider uppercase transition-all duration-300 shadow-lg cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>360°로 둘러보기</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>촬영 예정 (현재 준비 중)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom metadata tags */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono text-white/40">
                <span>360° 파노라마 구면 투어</span>
                <span>마우스 드래그 & 터치 지원</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
