import React, { useState } from 'react';
import {
  X,
  Sparkles,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  FileCode,
} from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { ContentDiffItem } from '../types/content';

export const PublishComparisonModal: React.FC = () => {
  const {
    content,
    isComparisonModalOpen,
    setIsComparisonModalOpen,
    diffList,
    diffCount,
    saveToPublishedSource,
    exportJSON,
    importJSON,
  } = useContent();

  const [activeCategory, setActiveCategory] = useState<string>('changed-only');
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [jsonPasteOpen, setJsonPasteOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonPasteError, setJsonPasteError] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isComparisonModalOpen) return null;

  const categories = [
    { id: 'changed-only', label: `변경 사항만 (${diffCount}건)` },
    { id: 'all', label: `전체 항목 (${diffList.length}건)` },
    { id: '브랜드', label: '브랜드' },
    { id: '도입부', label: '도입부' },
    { id: '평면도', label: '평면도' },
    { id: '공간탐색', label: '공간탐색' },
    { id: '360° 파노라마', label: '360° 파노라마' },
  ];

  const filteredDiffs = diffList.filter((item) => {
    if (activeCategory === 'changed-only') return item.hasChanged;
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const handleApplyToPublished = async () => {
    setIsApplying(true);
    setApplyResult(null);
    try {
      const res = await saveToPublishedSource();
      setApplyResult(res);
    } catch (err: any) {
      setApplyResult({
        success: false,
        message: err?.message || '퍼블리시 코드 적용 중 오류가 발생했습니다.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopyCurrentJSON = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleApplyPastedJson = async () => {
    setJsonPasteError('');
    if (!jsonInput.trim()) {
      setJsonPasteError('JSON 데이터를 입력해주세요.');
      return;
    }
    const success = importJSON(jsonInput.trim());
    if (!success) {
      setJsonPasteError('유효하지 않은 JSON 형식이거나 필수 필드가 누락되었습니다.');
      return;
    }
    // Now apply to published source
    setIsApplying(true);
    try {
      const res = await saveToPublishedSource();
      setApplyResult({
        success: true,
        message: '붙여넣은 설정이 브라우저와 퍼블리시 소스코드에 모두 적용되었습니다!',
      });
      setJsonInput('');
      setJsonPasteOpen(false);
    } catch (err: any) {
      setJsonPasteError('소스코드 저장 실패: ' + err?.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#141414] border border-[#C9A45C]/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A45C]/20 border border-[#C9A45C]/50 flex items-center justify-center text-[#C9A45C]">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif-display font-semibold text-white tracking-wide">
                  퍼블리시 버전 vs 임시저장 내용 비교 & 적용
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#C9A45C]/20 text-[#E0C37E] border border-[#C9A45C]/30">
                  DIFF SYNC
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                현재 브라우저 미리보기에 저장된 데이터와 실제 배포용 소스코드(publishedContent.json)를 비교합니다.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsComparisonModalOpen(false)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Alert & Quick Action Card */}
          <div className="p-5 rounded-xl bg-[#1c1c1c] border border-[#C9A45C]/40 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {diffCount > 0 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-sm font-semibold text-amber-300">
                      퍼블리시에 미반영된 수정사항 {diffCount}건이 있습니다!
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-300">
                      임시저장된 모든 내용이 퍼블리시 소스코드와 100% 일치합니다.
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
                {diffCount > 0
                  ? '미리보기에서 저장한 내용은 브라우저 로컬 저장소에 보관되어 있어, 배포(Publish) 시 새로운 방문자에게는 반영되지 않았습니다. 아래 [퍼블리시 버전에 영구 적용하기] 버튼을 누르면 소스코드에 즉시 저장되어 재배포 시 완벽히 반영됩니다.'
                  : '현재 소스코드(publishedContent.json)가 브라우저의 최신 상태와 동기화되어 있습니다. 언제든 추가 수정 후 다시 영구 반영할 수 있습니다.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleApplyToPublished}
                disabled={isApplying}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#C9A45C] to-[#E0C37E] hover:from-[#d6b470] hover:to-[#ebd08f] text-[#111111] font-bold text-xs sm:text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>소스코드에 저장 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>현재 임시저장 내용을 퍼블리시에 영구 적용</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success or Error Alert */}
          {applyResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 animate-fadeIn ${
                applyResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {applyResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-semibold">{applyResult.message}</p>
                {applyResult.success && (
                  <p className="text-xs text-emerald-300/80">
                    이제 AI Studio에서 <strong>[Publish]</strong>(퍼블리시)를 다시 진행하시면, 지금까지
                    미리보기를 통해 저장했던 모든 공간 제원, 텍스트, 평면도 설정이 실제 배포된 사이트에 그대로
                    반영됩니다!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Filter Categories */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#C9A45C] text-[#111111] font-semibold shadow'
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Diff Items List */}
          {filteredDiffs.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white/5 border border-white/10 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-semibold text-white">해당 항목에 차이점이 없습니다.</h4>
              <p className="text-xs text-white/60">
                선택한 필터 기준에서 퍼블리시 버전과 임시저장 내용이 동일합니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredDiffs.map((diff) => (
                <div
                  key={diff.id}
                  className={`p-4 rounded-xl border transition-all ${
                    diff.hasChanged
                      ? 'bg-[#1b1915] border-[#C9A45C]/50 shadow-md'
                      : 'bg-white/[0.02] border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-white/80 border border-white/10">
                        {diff.category}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-white">{diff.label}</span>
                      <span className="text-[11px] font-mono text-white/40 hidden sm:inline">
                        ({diff.path})
                      </span>
                    </div>

                    {diff.hasChanged ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        수정됨 (미반영)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        일치함
                      </span>
                    )}
                  </div>

                  {/* Side by side comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Published Value */}
                    <div className="p-3 rounded-lg bg-black/40 border border-rose-500/20 space-y-1">
                      <div className="flex items-center justify-between text-rose-300/80 font-medium text-[11px]">
                        <span>기존 퍼블리시 (배포용 코드)</span>
                        <span className="font-mono text-[10px] text-white/40">BEFORE</span>
                      </div>
                      <p className="text-white/70 whitespace-pre-line break-words font-mono text-[11px]">
                        {diff.publishedValue}
                      </p>
                    </div>

                    {/* Local Value */}
                    <div className="p-3 rounded-lg bg-black/40 border border-[#C9A45C]/40 space-y-1">
                      <div className="flex items-center justify-between text-[#E0C37E] font-medium text-[11px]">
                        <span>현재 임시저장 (미리보기 반영본)</span>
                        <span className="font-mono text-[10px] text-[#C9A45C]">AFTER</span>
                      </div>
                      <p className="text-white whitespace-pre-line break-words font-mono text-[11px]">
                        {diff.localValue}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Collapsible: Direct JSON Paste & Backup tools */}
          <div className="border border-white/10 rounded-xl bg-black/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setJsonPasteOpen(!jsonPasteOpen)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-white/80">
                <FileCode className="w-4 h-4 text-[#C9A45C]" />
                <span>JSON 직접 붙여넣기 또는 백업 가져오기/내보내기 도구</span>
              </div>
              <span className="text-xs text-[#C9A45C]">{jsonPasteOpen ? '접기 ▲' : '열기 ▼'}</span>
            </button>

            {jsonPasteOpen && (
              <div className="p-5 border-t border-white/10 space-y-4 bg-black/50">
                <p className="text-xs text-white/60">
                  이전에 내보낸 JSON 백업이 있거나, 수동으로 JSON 설정을 주입하여 퍼블리시 버전에 저장하려면
                  아래에 붙여넣고 [적용]을 누르세요.
                </p>

                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setJsonPasteError('');
                  }}
                  rows={6}
                  placeholder="{\n  &quot;brand&quot;: { ... },\n  &quot;intro&quot;: { ... },\n  &quot;floorplan&quot;: { ... },\n  &quot;spaces&quot;: { ... }\n}"
                  className="w-full p-3 rounded-lg bg-black/80 border border-white/20 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#C9A45C]"
                />

                {jsonPasteError && (
                  <p className="text-xs text-rose-400 font-medium">{jsonPasteError}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCurrentJSON}
                      className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJson ? '복사됨!' : '현재 JSON 복사'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={exportJSON}
                      className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON 파일 다운로드</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPastedJson}
                    disabled={isApplying}
                    className="px-4 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#d6b470] text-[#111111] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    붙여넣은 JSON 적용 및 퍼블리시 소스 저장
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#161616]">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Info className="w-4 h-4 text-[#C9A45C] shrink-0" />
            <span>
              영구 적용 후 AI Studio 빌드 도구가 소스코드(publishedContent.json)를 새 버전으로 패키징합니다.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsComparisonModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              onClick={handleApplyToPublished}
              disabled={isApplying}
              className="px-5 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#d6b470] text-[#111111] font-semibold text-xs tracking-wider transition-all shadow cursor-pointer disabled:opacity-50"
            >
              {isApplying ? '저장 중...' : '퍼블리시 소스코드에 영구 적용'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
