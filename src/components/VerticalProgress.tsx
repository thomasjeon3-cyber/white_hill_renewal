import React from 'react';

interface VerticalProgressProps {
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
}

export const VerticalProgress: React.FC<VerticalProgressProps> = ({
  activeSection,
  onSelectSection
}) => {
  const sections = [
    { id: 'hero', label: '소개' },
    { id: 'floorplan', label: '평면도' },
    { id: 'spaces', label: '공간탐색' },
    { id: 'guide', label: '이용안내' },
  ];

  return (
    <aside
      id="vertical-progress-indicator"
      aria-label="Section navigation"
      className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 z-40 flex-col gap-6"
    >
      {/* Subtle connecting vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-white/10 -z-10" />

      {sections.map((sec) => {
        const isActive = activeSection === sec.id;
        return (
          <button
            key={sec.id}
            onClick={() => onSelectSection(sec.id)}
            className="group flex items-center gap-3 text-left focus:outline-none transition-all cursor-pointer"
          >
            {/* Marker Dot / Line */}
            <span
              className={`block rounded-full transition-all duration-500 ${
                isActive
                  ? 'w-3.5 h-3.5 bg-[#C9A45C] ring-4 ring-[#C9A45C]/20 shadow-[0_0_12px_rgba(201,164,92,0.8)]'
                  : 'w-2 h-2 bg-white/30 group-hover:bg-[#C9A45C]/70'
              }`}
            />

            {/* Label */}
            <div className="flex items-baseline gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
              <span
                className={`text-xs font-serif-display tracking-wider whitespace-nowrap transition-colors ${
                  isActive ? 'text-[#F5F2EA] font-semibold' : 'text-white/60'
                }`}
              >
                {sec.label}
              </span>
            </div>
          </button>
        );
      })}
    </aside>
  );
};
