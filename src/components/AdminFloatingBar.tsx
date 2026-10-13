import React from 'react';
import { Sliders, EyeOff, Sparkles, Edit3, GitCompare } from 'lucide-react';
import { useContent } from '../context/ContentContext';

export const AdminFloatingBar: React.FC = () => {
  const {
    isAdminMode,
    setIsAdminMode,
    setIsAdminModalOpen,
    setActiveAdminTab,
    setIsComparisonModalOpen,
    diffCount,
  } = useContent();

  if (!isAdminMode) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex items-center gap-2 p-1.5 pl-3 rounded-full bg-[#181818]/95 border border-[#C9A45C]/60 shadow-2xl backdrop-blur-md animate-fadeIn text-xs text-[#F5F2EA]">
      <div className="flex items-center gap-1.5 text-[#E0C37E] font-medium pr-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-xs tracking-wider uppercase">ADMIN ON</span>
      </div>

      <button
        onClick={() => {
          setIsComparisonModalOpen(true);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E0C37E]/20 hover:bg-[#E0C37E]/30 text-[#E0C37E] border border-[#C9A45C]/50 font-semibold transition-all shadow-sm cursor-pointer"
        title="퍼블리시 배포 버전과 현재 임시저장 내용 비교 및 영구 적용"
      >
        <GitCompare className="w-3.5 h-3.5 text-[#C9A45C]" />
        <span>퍼블리시 비교 & 적용</span>
        {diffCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
            {diffCount}
          </span>
        )}
      </button>

      <button
        onClick={() => {
          setActiveAdminTab('intro');
          setIsAdminModalOpen(true);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A45C] hover:bg-[#d6b470] text-[#111111] font-semibold transition-all shadow-sm cursor-pointer"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span>관리자 패널 열기</span>
      </button>

      <button
        onClick={() => {
          setIsAdminMode(false);
          setIsAdminModalOpen(false);
        }}
        title="관리자 모드 로그아웃"
        className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
      >
        <EyeOff className="w-4 h-4" />
        <span className="hidden sm:inline text-xs pr-1">로그아웃</span>
      </button>
    </div>
  );
};
