import React, { useState, useEffect } from 'react';
import { Menu, X, Compass, ArrowUpRight, Sliders } from 'lucide-react';
import { useContent } from '../context/ContentContext';

interface NavigationProps {
  activeSection: string;
  onOpenViewer: (spaceId?: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeSection, onOpenViewer }) => {
  const {
    content,
    isAdminMode,
    setIsAdminModalOpen,
    setIsPasswordModalOpen,
    diffCount,
  } = useContent();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'hero', label: '소개' },
    { id: 'floorplan', label: '평면도' },
    { id: 'spaces', label: '공간탐색' },
    { id: 'guide', label: '이용안내' },
  ];

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -70;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const toggleAdmin = () => {
    if (!isAdminMode) {
      setIsPasswordModalOpen(true);
    } else {
      setIsAdminModalOpen(true);
    }
  };

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        isScrolled
          ? 'bg-[#111111]/85 backdrop-blur-md border-b border-[#C9A45C]/20 shadow-2xl py-3.5'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        {/* Brand / Title */}
        <button
          onClick={() => scrollTo('hero')}
          className="group text-left focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#C9A45C] group-hover:scale-125 transition-transform" />
            <span className="font-serif-display tracking-[0.22em] text-sm sm:text-base font-semibold text-[#F5F2EA] group-hover:text-[#C9A45C] transition-colors">
              {content.brand.name}
            </span>
          </div>
          <p className="text-xs tracking-[0.16em] text-[#C9A45C]/80 uppercase ml-4.5">
            {content.brand.subName}
          </p>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`text-sm tracking-wider transition-all relative py-1 group ${
                  isActive
                    ? 'text-[#C9A45C] font-semibold'
                    : 'text-[#F5F2EA]/75 hover:text-[#F5F2EA]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#C9A45C]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right CTAs (360 Preview & Admin Mode) */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            id="nav-explore-btn"
            onClick={() => onOpenViewer()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C9A45C]/40 bg-[#C9A45C]/10 hover:bg-[#C9A45C]/20 text-[#C9A45C] text-xs tracking-wider transition-all duration-300 group"
          >
            <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            <span>360° 투어 시작</span>
            <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </button>

          {/* Admin Mode Trigger */}
          <button
            id="nav-admin-btn"
            onClick={toggleAdmin}
            title="화면 텍스트 및 비디오 관리자 편집 모드"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-wider transition-all relative ${
              isAdminMode
                ? 'bg-[#C9A45C] text-[#111111] shadow-md shadow-[#C9A45C]/20'
                : 'border border-white/20 text-white/70 hover:text-white hover:border-[#C9A45C]/50 hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isAdminMode ? '관리자 ON' : '관리자 모드'}</span>
            {diffCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 animate-pulse" />
            )}
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          id="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          className="lg:hidden p-2 text-[#F5F2EA] hover:text-[#C9A45C] transition-colors focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#111111]/98 border-b border-[#C9A45C]/20 px-6 py-6 space-y-4 backdrop-blur-xl animate-fadeIn">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="w-full text-left py-2.5 flex items-center justify-between text-base tracking-wider text-[#F5F2EA] hover:text-[#C9A45C] border-b border-white/5"
            >
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenViewer();
              }}
              className="w-full py-3 rounded-md bg-[#C9A45C] text-[#111111] font-semibold text-xs tracking-widest uppercase flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>360° 투어 시작</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                toggleAdmin();
              }}
              className="w-full py-2.5 rounded-md border border-[#C9A45C]/50 text-[#C9A45C] bg-[#C9A45C]/10 text-xs font-medium flex items-center justify-center gap-2"
            >
              <Sliders className="w-4 h-4" />
              <span>{isAdminMode ? '관리자 패널 열기' : '관리자 모드 실행'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
