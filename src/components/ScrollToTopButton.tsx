import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useContent } from '../context/ContentContext';

interface ScrollToTopButtonProps {
  onScrollToTop?: () => void;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ onScrollToTop }) => {
  const { isAdminMode } = useContent();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;

      // Show button once user scrolls past 240px
      setIsVisible(scrollY > 240);

      if (totalHeight > 0) {
        const progress = Math.min(Math.max(scrollY / totalHeight, 0), 1);
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    if (onScrollToTop) {
      onScrollToTop();
    }
  };

  if (!isVisible) return null;

  // Circular progress calculations for 46px button
  const size = 48;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - scrollProgress * circumference;

  return (
    <div
      className={`fixed right-5 sm:right-7 z-40 transition-all duration-300 ${
        isAdminMode ? 'bottom-22' : 'bottom-6 sm:bottom-8'
      }`}
    >
      <button
        onClick={handleClick}
        aria-label="최상단 소개 탭으로 이동"
        title="최상단 소개 탭으로 이동"
        className="group relative flex flex-col items-center justify-center w-12 h-12 rounded-full bg-[#161616]/90 hover:bg-[#1f1d19] border border-[#C9A45C]/50 hover:border-[#E0C37E] text-[#C9A45C] hover:text-[#F5F2EA] shadow-xl hover:shadow-[0_0_20px_rgba(201,164,92,0.45)] backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C9A45C]/60"
      >
        {/* SVG Circular Scroll Progress Ring */}
        <svg
          className="absolute inset-0 -rotate-90 pointer-events-none"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(201, 164, 92, 0.15)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#C9A45C"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-150 ease-out"
          />
        </svg>

        {/* Inner Content: Up Arrow & TOP Label */}
        <div className="relative z-10 flex flex-col items-center justify-center -space-y-0.5">
          <ArrowUp className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
          <span className="text-[9px] font-mono font-bold tracking-wider leading-none text-[#E0C37E] group-hover:text-white">
            TOP
          </span>
        </div>
      </button>
    </div>
  );
};
