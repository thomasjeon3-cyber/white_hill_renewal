import React, { useRef } from 'react';
import { Sparkles, Edit3 } from 'lucide-react';
import { InteractiveFloorPlan } from './InteractiveFloorPlan';
import { SpaceData } from '../types/spaces';
import { useContent } from '../context/ContentContext';

interface RevealSectionProps {
  onSelectSpace: (space: SpaceData) => void;
  onEnter360: (space: SpaceData) => void;
}

export const RevealSection: React.FC<RevealSectionProps> = ({
  onSelectSpace,
  onEnter360,
}) => {
  const { content, isAdminMode, setIsAdminModalOpen, setActiveAdminTab } = useContent();
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      id="floorplan"
      ref={sectionRef}
      className="relative w-full bg-[#111111] py-20 sm:py-28 px-4 sm:px-8 lg:px-12 border-t border-white/10"
    >
      {/* Background Architectural Blueprint Watermark & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#C9A45C_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Admin quick edit button */}
      {isAdminMode && (
        <button
          onClick={() => {
            setActiveAdminTab('floorplan');
            setIsAdminModalOpen(true);
          }}
          className="absolute top-8 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A45C]/90 text-[#111111] text-xs font-semibold shadow-lg hover:bg-white transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>도면 / 핫스팟 편집</span>
        </button>
      )}

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C9A45C]/10 border border-[#C9A45C]/30 text-[#C9A45C] text-xs tracking-widest uppercase font-serif-display">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{content.floorplan.chapterTag || 'CHAPTER 02'}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif-display font-medium tracking-tight text-[#F5F2EA]">
            {content.floorplan.title}
          </h2>

          <p className="text-base sm:text-xl text-[#C9A45C] font-normal tracking-wide">
            {content.floorplan.subtitle}
          </p>

          <p className="text-xs sm:text-sm text-white/60 max-w-xl mx-auto leading-relaxed pt-1 whitespace-pre-line">
            {content.floorplan.description}
          </p>
        </div>

        {/* The Interactive Floor Plan Component */}
        <div className="w-full">
          <InteractiveFloorPlan
            onSelectSpace={onSelectSpace}
            onEnter360={onEnter360}
          />
        </div>
      </div>
    </section>
  );
};

