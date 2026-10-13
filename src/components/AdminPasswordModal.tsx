import React, { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { useContent } from '../context/ContentContext';

export const AdminPasswordModal: React.FC = () => {
  const { isPasswordModalOpen, setIsPasswordModalOpen, loginWithPassword, setIsAdminModalOpen } = useContent();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPasswordModalOpen) {
      setPassword('');
      setErrorMsg('');
      setIsSuccess(false);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isPasswordModalOpen]);

  if (!isPasswordModalOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('비밀번호를 입력해주세요.');
      inputRef.current?.focus();
      return;
    }

    const success = loginWithPassword(password);
    if (success) {
      setIsSuccess(true);
      setErrorMsg('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setIsAdminModalOpen(true);
      }, 400);
    } else {
      setErrorMsg('비밀번호가 올바르지 않습니다.');
      inputRef.current?.select();
    }
  };

  return (
    <div
      id="admin-password-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsPasswordModalOpen(false);
      }}
    >
      <div
        id="admin-password-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
        className="w-full max-w-md bg-[#161616] border border-[#C9A45C]/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#C9A45C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#C9A45C]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="close-password-modal-btn"
          type="button"
          onClick={() => setIsPasswordModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Lock Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A45C]/15 border border-[#C9A45C]/40 flex items-center justify-center mb-3 shadow-inner">
            {isSuccess ? (
              <ShieldCheck className="w-7 h-7 text-[#E0C37E] animate-bounce" />
            ) : (
              <Lock className="w-7 h-7 text-[#C9A45C]" />
            )}
          </div>
          <span className="text-xs font-mono tracking-widest text-[#C9A45C] uppercase font-medium">
            ADMIN SECURITY ACCESS
          </span>
          <h2 id="password-dialog-title" className="text-xl font-serif text-white mt-1">
            관리자 모드 인증
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
            건축 평면도, 인터랙티브 핫스팟, 360° 가상 투어 편집을 위해 비밀번호를 입력해주세요.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-password-input" className="block text-xs text-neutral-300 mb-1.5 font-medium">
              관리자 비밀번호
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                className={`w-full px-4 py-3 pr-11 bg-black/60 border ${
                  errorMsg ? 'border-red-500/80 focus:border-red-500' : 'border-neutral-700 focus:border-[#C9A45C]'
                } rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none transition-colors font-mono`}
              />
              <button
                type="button"
                id="toggle-password-visibility-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white transition-colors"
                aria-label={showPassword ? '비밀번호 가리기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {isSuccess && (
              <div className="flex items-center gap-1.5 mt-2 text-emerald-400 text-xs animate-fadeIn">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>인증되었습니다. 관리자 모드로 전환합니다...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              id="cancel-password-btn"
              onClick={() => setIsPasswordModalOpen(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-medium transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              id="confirm-password-btn"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>관리자 모드 진입</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
