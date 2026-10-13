import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Compass, ZoomIn, ZoomOut, RotateCcw, Eye, ArrowRight, Layers, Sliders, Move } from 'lucide-react';
import floorPlanImage from '../assets/images/floor_plan_color_1788931491740.jpg';
import { SpaceData } from '../types/spaces';
import { SPACES_DATA } from '../data/spacesData';
import { useContent } from '../context/ContentContext';

interface InteractiveFloorPlanProps {
  revealStage?: number;
  onSelectSpace: (space: SpaceData) => void;
  onEnter360: (space: SpaceData) => void;
}

export const InteractiveFloorPlan: React.FC<InteractiveFloorPlanProps> = ({
  onSelectSpace,
  onEnter360,
}) => {
  const {
    content,
    isAdminMode,
    setIsAdminModalOpen,
    setActiveAdminTab,
    updateHotspotPosition,
  } = useContent();

  const floorPlanImageSrc = content.floorplan.imageUrl || floorPlanImage;

  // Merge static coordinate data with live editable content
  const spaces: SpaceData[] = content.spaces.items.map((item) => {
    const staticSp = SPACES_DATA.find((sp) => sp.id === item.id);
    return {
      id: item.id,
      spaceNumber: item.spaceNumber,
      name: item.name,
      koreanName: item.koreanName,
      category: item.category as any,
      tagline: item.tagline || staticSp?.tagline || '',
      description: item.description,
      architecturalHighlights: item.architecturalHighlights || staticSp?.architecturalHighlights || [],
      dimensionsCAD: item.dimensionsCAD,
      floorplan: {
        x: item.floorplan?.x ?? staticSp?.floorplan.x ?? 50,
        y: item.floorplan?.y ?? staticSp?.floorplan.y ?? 50,
        width: item.floorplan?.width ?? staticSp?.floorplan.width ?? 20,
        height: item.floorplan?.height ?? staticSp?.floorplan.height ?? 20,
      },
      highlightPolygon: item.highlightPolygon || staticSp?.highlightPolygon,
      panoramaUrl: item.panoramaUrl !== undefined ? item.panoramaUrl : (staticSp?.panoramaUrl ?? null),
      connectedSpaceIds: item.connectedSpaceIds || (staticSp?.connectedSpaceIds ?? []),
      panoramaHotspots: item.panoramaHotspots || staticSp?.panoramaHotspots,
    };
  });

  const [hoveredSpace, setHoveredSpace] = useState<SpaceData | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<SpaceData | null>(spaces[0]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingSpaceId, setDraggingSpaceId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const floorplanWrapperRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number>(0);
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Keep selectedSpace up-to-date with content edits
  const activeSelected = (selectedSpace
    ? spaces.find((s) => s.id === selectedSpace.id)
    : null) || spaces[0];

  const activeHovered = hoveredSpace
    ? spaces.find((s) => s.id === hoveredSpace.id) || hoveredSpace
    : null;

  const activeSpace = activeHovered || activeSelected;

  // Zoom helpers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(3.0, Math.round((prev + 0.2) * 10) / 10));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.2) * 10) / 10));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Wheel zoom handler on the stage
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => {
      const next = Math.max(0.5, Math.min(3.0, Math.round((prev + delta) * 10) / 10));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Mouse pan & hotspot dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingSpaceId) return;
    // Start pan
    setIsPanning(true);
    setPanStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Hotspot dragging (Admin Mode)
    if (draggingSpaceId && floorplanWrapperRef.current) {
      const rect = floorplanWrapperRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const rawX = ((e.clientX - rect.left) / rect.width) * 100;
        const rawY = ((e.clientY - rect.top) / rect.height) * 100;
        const x = Math.max(0, Math.min(100, Math.round(rawX * 10) / 10));
        const y = Math.max(0, Math.min(100, Math.round(rawY * 10) / 10));
        updateHotspotPosition(draggingSpaceId, x, y);
      }
      return;
    }

    // 2. Stage Panning
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggingSpaceId) {
      setDraggingSpaceId(null);
    }
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setHoveredSpace(null);
    if (draggingSpaceId) {
      setDraggingSpaceId(null);
    }
  };

  // Mobile Touch Handlers (1-finger pan, 2-finger pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (draggingSpaceId) return;

    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      });
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
      touchStartPanRef.current = { ...panOffset };
      touchStartCenterRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // 1-finger pan
    if (e.touches.length === 1 && isPanning) {
      setPanOffset({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
      });
    }
    // 2-finger pinch-to-zoom
    else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);

      if (touchStartDistRef.current > 0) {
        const factor = currentDist / touchStartDistRef.current;
        setZoomLevel((prev) => {
          const next = Math.max(0.5, Math.min(3.0, Math.round(prev * factor * 100) / 100));
          return next;
        });
        touchStartDistRef.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchStartDistRef.current = 0;
  };

  const handleHotspotClick = (space: SpaceData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (draggingSpaceId) return;
    setSelectedSpace(space);
    onSelectSpace(space);
  };

  const handleEnter360Click = (space: SpaceData, e: React.MouseEvent) => {
    e.stopPropagation();
    onEnter360(space);
  };

  return (
    <div
      id="floorplan-showcase"
      className="relative w-full rounded-2xl bg-[#0d0d0d] border border-[#C9A45C]/25 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden"
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111]/90 backdrop-blur-md border border-[#C9A45C]/35 text-xs shadow-lg">
          <Layers className="w-3.5 h-3.5 text-[#C9A45C]" />
          <span className="font-serif-display tracking-widest text-[#F5F2EA] uppercase text-xs font-medium">
            평창연수원 컬러 평면도
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A45C] animate-pulse" />
        </div>

        {/* Action Controls: Admin Edit & Zoom Buttons */}
        <div className="flex items-center gap-2">
          {isAdminMode && (
            <button
              onClick={() => {
                setActiveAdminTab('floorplan');
                setIsAdminModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A45C]/20 border border-[#C9A45C] hover:bg-[#C9A45C]/30 text-[#E0C37E] text-xs font-medium transition-all shadow-lg"
            >
              <Sliders className="w-3.5 h-3.5 text-[#C9A45C]" />
              <span>도면 / 핫스팟 편집</span>
            </button>
          )}

          {/* Zoom In / Out / Reset Controls */}
          <div className="flex items-center gap-1 bg-[#111111]/90 backdrop-blur-md border border-white/15 rounded-lg p-1 shadow-lg">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-white/80 hover:text-[#C9A45C] hover:bg-white/10 rounded transition-colors"
              title="도면 확대 (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-[#E0C37E] px-1.5 min-w-[38px] text-center select-none font-semibold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-white/80 hover:text-[#C9A45C] hover:bg-white/10 rounded transition-colors"
              title="도면 축소 (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-white/80 hover:text-[#C9A45C] hover:bg-white/10 rounded transition-colors text-xs flex items-center gap-1 px-2"
              title="화면에 맞추기 (FIT / 100%)"
              aria-label="Reset zoom and center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline font-mono">FIT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Floor Plan Canvas Stage (Fit to container, Pan & Zoom) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
        className={`relative w-full h-[460px] sm:h-[580px] lg:h-[660px] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none bg-[#090909] ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: `radial-gradient(#C9A45C 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Transform Box for Pan & Zoom */}
        <div
          className="relative transition-transform duration-100 ease-out will-change-transform flex items-center justify-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* Architectural Floor Plan Inner Box (Matches Image Bounds 1:1) */}
          <div
            ref={floorplanWrapperRef}
            className="relative inline-block max-w-[95vw] sm:max-w-[1020px] rounded-lg overflow-hidden bg-white shadow-[0_12px_45px_rgba(0,0,0,0.9)] border border-white/15"
          >
            {/* The Actual 2D Architectural Floor Plan Image (Fit Contain without cut-off) */}
            <img
              src={floorPlanImageSrc}
              alt="한솔섬유 평창연수원 리모델링 2D 컬러 평면도"
              referrerPolicy="no-referrer"
              className="max-h-[420px] sm:max-h-[520px] lg:max-h-[590px] w-auto h-auto object-contain block pointer-events-none transition-all duration-300"
            />

            {/* Interactive Hotspot Layer (Always Active, 1:1 Placement on Image) */}
            <div className="absolute inset-0 z-20">
              {spaces.map((space) => {
                const isHovered = hoveredSpace?.id === space.id;
                const isSelected = selectedSpace?.id === space.id;
                const isDragging = draggingSpaceId === space.id;
                const isCurrentActive = isHovered || isSelected || isDragging;

                return (
                  <div
                    key={space.id}
                    style={{
                      left: `${space.floorplan.x}%`,
                      top: `${space.floorplan.y}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group ${
                      isAdminMode ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                  >
                    {/* Hotspot Pulse Pin */}
                    <button
                      onClick={(e) => handleHotspotClick(space, e)}
                      onMouseDown={(e) => {
                        if (isAdminMode) {
                          e.stopPropagation();
                          setDraggingSpaceId(space.id);
                        }
                      }}
                      onMouseEnter={() => setHoveredSpace(space)}
                      onMouseLeave={() => setHoveredSpace(null)}
                      aria-label={`Select ${space.koreanName}`}
                      className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-300 focus:outline-none ${
                        isCurrentActive ? 'scale-125' : 'scale-100 hover:scale-110'
                      }`}
                    >
                      {/* Animated expanding wave */}
                      <span
                        className={`absolute w-full h-full rounded-full bg-[#C9A45C] opacity-75 animate-ping ${
                          isCurrentActive ? 'opacity-90' : 'opacity-35'
                        }`}
                      />

                      {/* Golden gradient numbered pin */}
                      <span
                        className={`relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-mono font-bold tracking-tight shadow-xl transition-all ${
                          isCurrentActive
                            ? 'bg-[#E0C37E] text-[#111111] ring-2 ring-white shadow-[0_0_18px_rgba(224,195,126,0.95)]'
                            : 'bg-[#111111] text-[#E0C37E] border border-[#C9A45C]/90 hover:bg-[#C9A45C] hover:text-[#111111]'
                        }`}
                      >
                        {space.spaceNumber}
                      </span>
                    </button>

                    {/* Hotspot Floating Tooltip Label */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 rounded bg-black/90 backdrop-blur-md border border-[#C9A45C]/40 text-xs font-mono text-white whitespace-nowrap pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity shadow-lg">
                      {space.koreanName || space.name.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pan Helper Hint (bottom-left) */}
        <div className="absolute bottom-3 left-4 z-20 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-xs text-white/60 pointer-events-none">
          <Move className="w-3.5 h-3.5 text-[#C9A45C]" />
          <span>마우스 드래그로 화면 이동 / 휠 또는 버튼으로 확대·축소</span>
        </div>
      </div>

      {/* Bottom Interactive Space Detail Bar */}
      {activeSpace && (
        <div className="border-t border-[#C9A45C]/20 bg-[#141414] px-5 sm:px-8 py-4 sm:py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#C9A45C]/20 text-[#C9A45C] font-mono text-xs font-semibold">
                SPACE {activeSpace.spaceNumber}
              </span>
              <span className="text-xs text-white/50 font-serif-display uppercase tracking-widest">
                {activeSpace.name}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#F5F2EA]">
              {activeSpace.koreanName}
            </h3>
            <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
              {activeSpace.description}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onSelectSpace(activeSpace)}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-lg border border-white/20 hover:border-[#C9A45C] text-[#F5F2EA] hover:text-[#C9A45C] text-xs font-medium tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>상세보기</span>
            </button>
            <button
              onClick={(e) => handleEnter360Click(activeSpace, e)}
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#C9A45C] to-[#E0C37E] hover:from-[#b89347] hover:to-[#d2b36b] text-[#111111] font-semibold text-xs tracking-wider uppercase shadow-[0_4px_16px_rgba(201,164,92,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>360°로 둘러보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
