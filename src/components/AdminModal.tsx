import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  Download,
  Upload,
  Video,
  FileText,
  Sliders,
  Check,
  Building,
  Layers,
  MapPin,
  HelpCircle,
  AlertCircle,
  Image as ImageIcon,
  Plus,
  Trash2,
  Move,
  Crosshair,
  Compass,
  Lock,
  KeyRound,
  ExternalLink,
  Link,
  Eye,
  EyeOff,
  Code,
  Copy,
  Target,
  Navigation as NavIcon,
  GitCompare,
} from 'lucide-react';
import floorPlanDefaultImage from '../assets/images/floor_plan_color_1788931491740.jpg';
import { useContent } from '../context/ContentContext';
import { PanoramaHotspot } from '../types/spaces';
import { PanoramaHotspotStudio } from './PanoramaHotspotStudio';

export const AdminModal: React.FC = () => {
  const {
    content,
    updateField,
    updateSpaceItem,
    updateStepItem,
    updateVideoBlob,
    updateImageBlob,
    clearCustomImage,
    updateFloorplanImageBlob,
    clearCustomFloorplanImage,
    updatePanoramaImage,
    setPanoramaUrl,
    clearPanoramaImage,
    changeAdminPassword,
    verifyAdminPassword,
    addHotspot,
    updateHotspotPosition,
    removeHotspot,
    resetToDefault,
    exportJSON,
    importJSON,
    isAdminModalOpen,
    setIsAdminModalOpen,
    activeAdminTab,
    setActiveAdminTab,
    setIsComparisonModalOpen,
    diffCount,
  } = useContent();

  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('lounge');
  const [selectedPanoramaSpaceId, setSelectedPanoramaSpaceId] = useState<string>('lounge');
  const [selectedHotspotIdx, setSelectedHotspotIdx] = useState<number>(0);
  const [customPanoramaUrlInput, setCustomPanoramaUrlInput] = useState<string>('');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const floorplanFileInputRef = useRef<HTMLInputElement>(null);
  const panoramaFileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  // Password change state
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(null);
  const [activeCanvasHotspotId, setActiveCanvasHotspotId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newHotspotCoord, setNewHotspotCoord] = useState<{ x: number; y: number } | null>(null);
  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [newHotspotForm, setNewHotspotForm] = useState({
    spaceNumber: '',
    koreanName: '',
    name: '',
    category: 'LIVING',
    dimensionsCAD: '4,000mm × 3,000mm',
    description: '새롭게 추가된 공간입니다.',
  });

  if (!isAdminModalOpen) return null;

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await updateImageBlob(file);
        updateField('intro', 'bgMode', 'image');
        showToast('배경 이미지가 보정/변환 없이 100% 원본 그대로 적용되었습니다.');
      } catch (err) {
        console.error('Image upload failed:', err);
        showToast('이미지 적용에 실패했습니다.');
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await updateVideoBlob(file);
        updateField('intro', 'bgMode', 'video');
        showToast('배경 비디오가 성공적으로 교체 및 적용되었습니다.');
      } catch (err) {
        console.error('Video upload failed:', err);
        showToast('비디오 로드에 실패했습니다.');
      }
    }
  };

  const handleFloorplanImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast('평면도 이미지를 처리하여 저장하는 중입니다...');
        await updateFloorplanImageBlob(file);
        showToast('평면도 사진이 100% 원본 그대로 성공적으로 교체되었습니다.');
      } catch (err) {
        console.error('Floorplan upload failed:', err);
        showToast('평면도 이미지 적용에 실패했습니다.');
      }
    }
  };

  const handlePanoramaImageUpload = async (spaceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast('360° 파노라마 이미지를 저장소에 업로드하는 중입니다...');
        await updatePanoramaImage(spaceId, file);
        showToast('360° 파노라마 이미지가 성공적으로 등록되었습니다.');
        // reset input
        if (e.target) e.target.value = '';
      } catch (err) {
        console.error('Panorama upload failed:', err);
        showToast('파노라마 이미지 등록에 실패했습니다.');
      }
    }
  };

  const handleSavePanoramaUrl = (spaceId: string) => {
    if (!customPanoramaUrlInput.trim()) return;
    setPanoramaUrl(spaceId, customPanoramaUrlInput.trim());
    showToast('파노라마 이미지 URL이 적용되었습니다.');
    setCustomPanoramaUrlInput('');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPassword(pwdCurrent)) {
      setPwdError('현재 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (pwdNew.length < 4) {
      setPwdError('새 비밀번호는 4자리 이상이어야 합니다.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    changeAdminPassword(pwdNew);
    setPwdSuccess('관리자 비밀번호가 성공적으로 변경되었습니다.');
    setPwdError('');
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    showToast('관리자 비밀번호가 변경되었습니다.');
  };

  const handlePinMouseDown = (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingHotspotId(spaceId);
    setActiveCanvasHotspotId(spaceId);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingHotspotId) return;
    const targetRef = imageWrapperRef.current || canvasRef.current;
    if (!targetRef) return;
    const rect = targetRef.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
    updateHotspotPosition(draggingHotspotId, x, y);
  };

  const handleCanvasMouseUp = () => {
    if (draggingHotspotId) {
      setDraggingHotspotId(null);
      showToast('핫스팟 좌표가 저장되었습니다.');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingHotspotId) return;
    const targetRef = imageWrapperRef.current || canvasRef.current;
    if (!targetRef) return;
    const rect = targetRef.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
    setNewHotspotCoord({ x, y });
    const nextNum = String(content.spaces.items.length + 1).padStart(2, '0');
    setNewHotspotForm({
      spaceNumber: nextNum,
      koreanName: `신규 공간 ${nextNum}`,
      name: `NEW SPACE ${nextNum}`,
      category: 'LIVING',
      dimensionsCAD: '4,000mm × 3,000mm',
      description: '새롭게 추가된 공간입니다.',
    });
    setIsAddingHotspot(true);
  };

  const handleCreateHotspot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotspotCoord) return;
    const newId = addHotspot({
      spaceNumber: newHotspotForm.spaceNumber.trim() || String(content.spaces.items.length + 1).padStart(2, '0'),
      koreanName: newHotspotForm.koreanName.trim() || '신규 공간',
      name: newHotspotForm.name.trim() || 'NEW SPACE',
      category: newHotspotForm.category || 'LIVING',
      dimensionsCAD: newHotspotForm.dimensionsCAD || '4,000mm × 3,000mm',
      description: newHotspotForm.description || '새롭게 정의된 공간입니다.',
      x: newHotspotCoord.x,
      y: newHotspotCoord.y,
      width: 20,
      height: 20,
    });
    setIsAddingHotspot(false);
    setNewHotspotCoord(null);
    setActiveCanvasHotspotId(newId);
    showToast(`[${newHotspotForm.spaceNumber}] ${newHotspotForm.koreanName} 핫스팟이 생성되었습니다.`);
  };

  const handleDeleteHotspot = (id: string, name: string) => {
    if (content.spaces.items.length <= 1) {
      showToast('최소 1개 이상의 공간 핫스팟이 유지되어야 합니다.');
      return;
    }
    removeHotspot(id);
    setDeleteConfirmId(null);
    const remaining = content.spaces.items.filter((s) => s.id !== id);
    if (activeCanvasHotspotId === id) {
      setActiveCanvasHotspotId(remaining.length > 0 ? remaining[0].id : null);
    }
    if (selectedSpaceId === id) {
      setSelectedSpaceId(remaining.length > 0 ? remaining[0].id : '');
    }
    showToast(`'${name}' 핫스팟이 성공적으로 삭제되었습니다.`);
  };

  const currentFloorplanImage = content.floorplan.imageUrl || floorPlanDefaultImage;
  const selectedCanvasSpace = content.spaces.items.find((s) => s.id === (activeCanvasHotspotId || selectedSpaceId)) || content.spaces.items[0];

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const success = importJSON(text);
          if (success) {
            showToast('텍스트 설정이 성공적으로 복원되었습니다.');
          } else {
            showToast('유효하지 않은 JSON 파일 형식입니다.');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const currentSpace = content.spaces.items.find((s) => s.id === selectedSpaceId) || content.spaces.items[0];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[850px] bg-[#141414] border border-[#C9A45C]/40 rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#F5F2EA]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#191919]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C9A45C]/20 border border-[#C9A45C]/40 flex items-center justify-center text-[#C9A45C]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif-display font-semibold tracking-wider text-[#F5F2EA]">
                  관리자 텍스트 & 미디어 에디터
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE SYNC ON
                </span>
              </div>
              <p className="text-xs text-white/50">
                입력하신 모든 변경사항은 즉시 화면에 실시간으로 반영 및 자동 저장됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-[#181818] border-b border-white/10 overflow-x-auto text-xs scrollbar-none">
          <button
            onClick={() => setActiveAdminTab('intro')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-all font-medium whitespace-nowrap ${
              activeAdminTab === 'intro'
                ? 'bg-[#C9A45C] text-[#111111] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>01. INTRO & 비디오</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('floorplan')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-all font-medium whitespace-nowrap ${
              activeAdminTab === 'floorplan'
                ? 'bg-[#C9A45C] text-[#111111] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>02. 평면도 & 단계별 해설</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('spaces')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-all font-medium whitespace-nowrap ${
              activeAdminTab === 'spaces'
                ? 'bg-[#C9A45C] text-[#111111] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>03. 공간탐색 & 상세스펙</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('panorama')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-all font-medium whitespace-nowrap ${
              activeAdminTab === 'panorama'
                ? 'bg-[#C9A45C] text-[#111111] shadow font-semibold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>04. 360° 파노라마 투어</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('brand')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-all font-medium whitespace-nowrap ${
              activeAdminTab === 'brand'
                ? 'bg-[#C9A45C] text-[#111111] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>브랜드 & 푸터</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('data')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-all font-medium whitespace-nowrap ${
              activeAdminTab === 'data'
                ? 'bg-[#C9A45C] text-[#111111] shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>데이터 & 보안 관리</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAdminModalOpen(false);
              setIsComparisonModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md transition-all font-semibold whitespace-nowrap bg-gradient-to-r from-[#C9A45C]/20 to-[#E0C37E]/20 text-[#E0C37E] border border-[#C9A45C]/40 hover:bg-[#C9A45C]/30 ml-auto cursor-pointer"
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
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#121212]">
          
          {/* TAB 1: INTRO */}
          {activeAdminTab === 'intro' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Image / Video Mode Switcher */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <span className="text-xs font-semibold text-[#E0C37E] block">INTRO 배경 표시 방식</span>
                  <span className="text-[11px] text-white/60">첨부하신 고해상도 건축 이미지를 선명하게 보여줄지, 비디오 루프를 재생할지 선택합니다.</span>
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/60 border border-white/15">
                  <button
                    type="button"
                    onClick={() => updateField('intro', 'bgMode', 'image')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      content.intro.bgMode !== 'video'
                        ? 'bg-[#C9A45C] text-[#111111] font-semibold shadow'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    🖼️ 원본 이미지 표시
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('intro', 'bgMode', 'video')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      content.intro.bgMode === 'video'
                        ? 'bg-[#C9A45C] text-[#111111] font-semibold shadow'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    🎥 비디오 루프 재생
                  </button>
                </div>
              </div>

              {/* Image Controls: 100% Raw Uncorrupted Image Support */}
              <div className="p-4 rounded-lg bg-[#C9A45C]/10 border border-[#C9A45C]/30 flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-[#C9A45C] mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#E0C37E]">배경 이미지 직접 등록 (보정/필터 없는 100% 무손실 원본)</h4>
                  <p className="text-xs text-white/70 leading-relaxed">
                    첨부해주신 <strong className="text-[#E0C37E]">평창연수원 도입부main.png</strong> 파일이나 소장 중인 원본 이미지를 직접 선택하세요. 어떤 AI 재구성, 화질 저하, 색감 필터링 없이 픽셀 100% 원본 그대로 화면에 완벽하게 표출됩니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <label className="block text-xs font-medium text-[#C9A45C] uppercase tracking-wider mb-2">
                    현재 적용된 배경 이미지 미리보기
                  </label>
                  <div className="relative aspect-video w-full rounded-md overflow-hidden bg-black border border-white/20">
                    <img
                      src={content.intro.bgImageUrl || '/assets/images/hero_intro_main.jpg'}
                      alt="현재 배경 이미지"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        내 컴퓨터에서 원본 이미지 파일 선택 (.png, .jpg, .webp)
                      </label>
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full py-2.5 px-4 rounded-md bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>내 PC에서 첨부 이미지 파일 선택하여 즉시 적용</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        또는 이미지 파일 경로 직접 입력
                      </label>
                      <input
                        type="text"
                        value={content.intro.bgImageUrl || ''}
                        onChange={(e) => {
                          updateField('intro', 'bgImageUrl', e.target.value);
                          updateField('intro', 'bgMode', 'image');
                        }}
                        placeholder="/assets/images/평창연수원 도입부main.png"
                        className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C9A45C]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearCustomImage();
                        showToast('기본 이미지로 복원되었습니다.');
                      }}
                      className="text-xs text-white/50 hover:text-[#C9A45C] text-left underline underline-offset-2 transition-colors"
                    >
                      기본 이미지로 되돌리기
                    </button>
                    <span className="text-[11px] text-white/40">화면 드래그 앤 드롭 지원</span>
                  </div>
                </div>
              </div>

              {/* Video Configuration Accordion */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-white/80">동영상 비디오 재생 설정</h4>
                    <p className="text-[11px] text-white/50">
                      비디오 모드를 활성화했을 때 재생되는 동영상 파일(.mp4)입니다.
                    </p>
                  </div>
                </div>

              {/* Video Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <label className="block text-xs font-medium text-[#C9A45C] uppercase tracking-wider mb-2">
                    현재 적용된 비디오 미리보기
                  </label>
                  <div className="relative aspect-video w-full rounded-md overflow-hidden bg-black border border-white/20">
                    <video
                      key={content.intro.videoUrl}
                      src={content.intro.videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        비디오 파일 직접 선택 (MP4 / WebM)
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleVideoUpload}
                        accept="video/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-4 rounded-md bg-[#C9A45C]/20 hover:bg-[#C9A45C]/30 border border-[#C9A45C]/50 text-[#E0C37E] text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>내 컴퓨터에서 비디오 파일 업로드</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        또는 비디오 URL 직접 입력
                      </label>
                      <input
                        type="text"
                        value={content.intro.videoUrl}
                        onChange={(e) => updateField('intro', 'videoUrl', e.target.value)}
                        placeholder="/assets/videos/intro_bg.mp4"
                        className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C9A45C]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateField('intro', 'videoUrl', '/assets/videos/intro_bg.mp4');
                      showToast('기본 비디오(/assets/videos/intro_bg.mp4)로 복원되었습니다.');
                    }}
                    className="text-xs text-white/50 hover:text-[#C9A45C] text-left underline underline-offset-2 transition-colors"
                  >
                    기본 비디오로 되돌리기
                  </button>
                </div>
              </div>
            </div>

            {/* Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    상단 챕터 태그 (Chapter Tag)
                  </label>
                  <input
                    type="text"
                    value={content.intro.chapterTag}
                    onChange={(e) => updateField('intro', 'chapterTag', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    건물 명칭 포인트 (골드 하이라이트)
                  </label>
                  <input
                    type="text"
                    value={content.intro.buildingName}
                    onChange={(e) => updateField('intro', 'buildingName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-[#E0C37E] font-serif-display focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    메인 타이틀 1행
                  </label>
                  <input
                    type="text"
                    value={content.intro.titleLine1}
                    onChange={(e) => updateField('intro', 'titleLine1', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    메인 타이틀 2행
                  </label>
                  <input
                    type="text"
                    value={content.intro.titleLine2}
                    onChange={(e) => updateField('intro', 'titleLine2', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    헤드라인 아래 상세 서술 설명문 (줄바꿈 가능)
                  </label>
                  <textarea
                    rows={2}
                    value={content.intro.description}
                    onChange={(e) => updateField('intro', 'description', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    하단 스크롤 버튼 문구
                  </label>
                  <input
                    type="text"
                    value={content.intro.scrollButtonText}
                    onChange={(e) => updateField('intro', 'scrollButtonText', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLOOR PLAN */}
          {activeAdminTab === 'floorplan' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Section 1: Floor Plan Image Replacement */}
              <div className="p-5 rounded-xl bg-white/[0.04] border border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#E0C37E] flex items-center gap-2 font-serif-display">
                    <ImageIcon className="w-4 h-4 text-[#C9A45C]" />
                    <span>평면도 사진 교체 (Floor Plan Blueprint Asset)</span>
                  </h4>
                  {content.floorplan.imageUrl ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#C9A45C]/20 border border-[#C9A45C]/50 text-[#E0C37E] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A45C] animate-pulse" />
                      사용자 지정 평면도 적용 중 (IndexedDB 영구보관)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 border border-white/20 text-white/60">
                      기본 시스템 도면 사용 중
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Current Image Preview */}
                  <div className="md:col-span-1 rounded-lg overflow-hidden border border-white/20 bg-black/60 aspect-[4/3] relative flex items-center justify-center group">
                    <img
                      src={currentFloorplanImage}
                      alt="현재 적용된 평면도"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center text-xs text-white">
                      100% 원본 렌더링
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="md:col-span-2 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">
                          내 컴퓨터에서 새 평면도 이미지 파일 선택 (JPG, PNG, WebP, SVG)
                        </label>
                        <input
                          type="file"
                          ref={floorplanFileInputRef}
                          onChange={handleFloorplanImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => floorplanFileInputRef.current?.click()}
                          className="w-full py-2.5 px-4 rounded-md bg-[#C9A45C]/20 hover:bg-[#C9A45C]/30 border border-[#C9A45C]/50 text-[#E0C37E] text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>내 컴퓨터에서 평면도 사진 파일 업로드</span>
                        </button>
                        <p className="text-[11px] text-white/50 mt-1">
                          * 첨부한 이미지는 왜곡/필터 없이 100% 원본 해상도로 저장되어 평면도 섹션에 즉시 반영됩니다.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">
                          또는 평면도 이미지 경로/URL 직접 입력
                        </label>
                        <input
                          type="text"
                          value={content.floorplan.imageUrl || ''}
                          onChange={(e) => updateField('floorplan', 'imageUrl', e.target.value)}
                          placeholder="/assets/images/floor_plan_color_1788931491740.jpg 또는 https://..."
                          className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          clearCustomFloorplanImage();
                          showToast('기본 평면도로 복원되었습니다.');
                        }}
                        className="text-xs text-white/50 hover:text-[#C9A45C] underline underline-offset-2 transition-colors"
                      >
                        기본 평면도로 되돌리기
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Interactive Hotspot Visual Canvas & Positioning */}
              <div className="p-5 rounded-xl bg-white/[0.04] border border-[#C9A45C]/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#E0C37E] flex items-center gap-2 font-serif-display">
                      <Crosshair className="w-4 h-4 text-[#C9A45C]" />
                      <span>평면도 핫스팟 생성 및 위치 드래그 변경 (Visual Hotspot Studio)</span>
                    </h4>
                    <p className="text-xs text-white/60 mt-0.5">
                      • <strong>위치 이동</strong>: 도면 위의 골드 핀을 마우스로 잡고 원하는 위치로 드래그하세요.
                      <br />
                      • <strong>새 핫스팟 생성</strong>: 도면의 빈 영역을 마우스로 클릭하면 해당 좌표에 새 핫스팟이 생성됩니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewHotspotCoord({ x: 50, y: 50 });
                        const nextNum = String(content.spaces.items.length + 1).padStart(2, '0');
                        setNewHotspotForm({
                          spaceNumber: nextNum,
                          koreanName: `신규 공간 ${nextNum}`,
                          name: `NEW SPACE ${nextNum}`,
                          category: 'LIVING',
                          dimensionsCAD: '4,000mm × 3,000mm',
                          description: '새롭게 추가된 공간입니다.',
                        });
                        setIsAddingHotspot(true);
                      }}
                      className="py-1.5 px-3 rounded bg-[#C9A45C] hover:bg-[#d6b36a] text-[#111111] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      <span>새 핫스팟 추가</span>
                    </button>
                  </div>
                </div>

                {/* New Hotspot Creation Form Card (Modal/Drawer) */}
                {isAddingHotspot && newHotspotCoord && (
                  <form
                    onSubmit={handleCreateHotspot}
                    className="p-4 rounded-lg bg-[#1f1a14] border border-[#C9A45C] space-y-3 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between border-b border-[#C9A45C]/30 pb-2">
                      <span className="text-xs font-bold text-[#E0C37E] flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#C9A45C]" />
                        <span>선택 좌표 [X: {newHotspotCoord.x}%, Y: {newHotspotCoord.y}%]에 새 핫스팟 생성</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingHotspot(false)}
                        className="text-white/50 hover:text-white text-xs"
                      >
                        ✕ 취소
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">공간 번호 (01, 02..)</label>
                        <input
                          type="text"
                          required
                          value={newHotspotForm.spaceNumber}
                          onChange={(e) => setNewHotspotForm({ ...newHotspotForm, spaceNumber: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-white/20 text-xs font-mono text-[#E0C37E] focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">공간 명칭 (한글)</label>
                        <input
                          type="text"
                          required
                          value={newHotspotForm.koreanName}
                          onChange={(e) => setNewHotspotForm({ ...newHotspotForm, koreanName: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">공간 명칭 (영문)</label>
                        <input
                          type="text"
                          required
                          value={newHotspotForm.name}
                          onChange={(e) => setNewHotspotForm({ ...newHotspotForm, name: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-white/20 text-xs font-serif-display text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">카테고리</label>
                        <select
                          value={newHotspotForm.category}
                          onChange={(e) => setNewHotspotForm({ ...newHotspotForm, category: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-white/20 text-xs text-[#C9A45C] focus:outline-none focus:border-[#C9A45C]"
                        >
                          <option value="LIVING">LIVING (공용/휴게)</option>
                          <option value="SUITE">SUITE (객실/휴식)</option>
                          <option value="WELLNESS">WELLNESS (웰니스/테라피)</option>
                          <option value="SERVICE">SERVICE (편의시설)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">CAD 실측 규격</label>
                        <input
                          type="text"
                          value={newHotspotForm.dimensionsCAD}
                          onChange={(e) => setNewHotspotForm({ ...newHotspotForm, dimensionsCAD: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-2 px-4 rounded bg-[#C9A45C] hover:bg-[#d6b36a] text-[#111111] text-xs font-bold transition-colors shadow"
                        >
                          ✓ 이 위치에 생성 확정
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* The Interactive Floorplan Canvas (Fit within edit area) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span className="flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-[#C9A45C]" />
                      도면 클릭 시 신규 핫스팟 생성 / 핀 드래그하여 실시간 위치 이동
                    </span>
                    {draggingHotspotId && (
                      <span className="text-[#E0C37E] font-mono animate-pulse">
                        ● 드래그하여 위치 변경 중...
                      </span>
                    )}
                  </div>

                  <div
                    ref={canvasRef}
                    className="relative w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/20 shadow-2xl select-none flex items-center justify-center p-3 sm:p-5"
                    style={{ minHeight: '360px', maxHeight: '540px' }}
                  >
                    {/* Subtle grid backdrop */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-15"
                      style={{
                        backgroundImage: `radial-gradient(#C9A45C 1px, transparent 1px)`,
                        backgroundSize: '24px 24px',
                      }}
                    />

                    {/* Image Wrapper: Exactly matches the rendered floorplan image size */}
                    <div
                      ref={imageWrapperRef}
                      onClick={handleCanvasClick}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className="relative inline-block max-h-[460px] sm:max-h-[500px] max-w-full rounded-lg overflow-hidden bg-white shadow-2xl cursor-crosshair group"
                    >
                      {/* Floorplan Background Image - Fit Contain */}
                      <img
                        src={currentFloorplanImage}
                        alt="Floor Plan Visual Canvas"
                        referrerPolicy="no-referrer"
                        className="max-h-[460px] sm:max-h-[500px] max-w-full w-auto h-auto object-contain block pointer-events-none transition-all duration-200"
                      />

                      {/* Subtle CAD Grid Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-20"
                        style={{
                          backgroundImage: `linear-gradient(to right, rgba(201, 164, 92, 0.2) 1px, transparent 1px),
                                            linear-gradient(to bottom, rgba(201, 164, 92, 0.2) 1px, transparent 1px)`,
                          backgroundSize: '10% 10%',
                        }}
                      />

                      {/* Hotspot Pins Layer (1:1 with Floor Plan Image) */}
                      {content.spaces.items.map((sp) => {
                        const posX = sp.floorplan?.x ?? 50;
                        const posY = sp.floorplan?.y ?? 50;
                        const isSelected = activeCanvasHotspotId === sp.id;
                        const isDragging = draggingHotspotId === sp.id;

                        return (
                          <div
                            key={sp.id}
                            style={{
                              left: `${posX}%`,
                              top: `${posY}%`,
                            }}
                            onMouseDown={(e) => handlePinMouseDown(sp.id, e)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCanvasHotspotId(sp.id);
                              setSelectedSpaceId(sp.id);
                            }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing transition-transform ${
                              isDragging ? 'scale-125 z-30' : isSelected ? 'scale-115 z-25' : 'hover:scale-110'
                            }`}
                          >
                            <div
                              className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-mono text-xs font-bold shadow-xl transition-all ${
                                isSelected || isDragging
                                  ? 'bg-[#E0C37E] text-[#111111] ring-4 ring-[#C9A45C]/70 shadow-[0_0_20px_rgba(224,195,126,0.95)]'
                                  : 'bg-[#111111] text-[#E0C37E] border-2 border-[#C9A45C] hover:bg-[#C9A45C] hover:text-[#111111]'
                              }`}
                            >
                              {sp.spaceNumber}
                            </div>

                            {/* Pin Label with Coordinates */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded bg-black/95 border border-[#C9A45C]/40 text-[9px] font-mono text-white whitespace-nowrap pointer-events-none shadow-lg">
                              {sp.koreanName} ({posX}%, {posY}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Section 3: Selected Hotspot Name, Category & Coordinate Precision Editor */}
                {selectedCanvasSpace && (
                  <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-[#C9A45C]/30 space-y-4 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#C9A45C] text-[#111] font-mono font-bold text-xs flex items-center justify-center">
                          {selectedCanvasSpace.spaceNumber}
                        </span>
                        <h4 className="text-sm font-bold text-[#E0C37E]">
                          [{selectedCanvasSpace.spaceNumber}] 핫스팟 명칭 및 속성 편집
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedCanvasSpace.id}
                          onChange={(e) => {
                            setActiveCanvasHotspotId(e.target.value);
                            setSelectedSpaceId(e.target.value);
                          }}
                          className="px-2.5 py-1.5 rounded bg-[#1f1f1f] border border-white/20 text-xs text-[#E0C37E] focus:outline-none"
                        >
                          {content.spaces.items.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              [{sp.spaceNumber}] {sp.koreanName}
                            </option>
                          ))}
                        </select>

                        {/* Delete Button */}
                        {deleteConfirmId === selectedCanvasSpace.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteHotspot(selectedCanvasSpace.id, selectedCanvasSpace.koreanName)}
                              className="px-2.5 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow"
                            >
                              정말 삭제
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(selectedCanvasSpace.id)}
                            className="px-2.5 py-1.5 rounded bg-red-900/30 hover:bg-red-900/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-1 transition-colors"
                            title="이 핫스팟 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>삭제</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hotspot Name & Details Inputs (Real-time update) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">공간 번호</label>
                        <input
                          type="text"
                          value={selectedCanvasSpace.spaceNumber}
                          onChange={(e) =>
                            updateSpaceItem(selectedCanvasSpace.id, { spaceNumber: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded bg-black/60 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#E0C37E] font-medium mb-1">
                          공간 명칭 (한글) *
                        </label>
                        <input
                          type="text"
                          value={selectedCanvasSpace.koreanName}
                          onChange={(e) =>
                            updateSpaceItem(selectedCanvasSpace.id, { koreanName: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded bg-black/60 border border-[#C9A45C]/50 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#E0C37E] font-medium mb-1">
                          공간 명칭 (영문) *
                        </label>
                        <input
                          type="text"
                          value={selectedCanvasSpace.name}
                          onChange={(e) =>
                            updateSpaceItem(selectedCanvasSpace.id, { name: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded bg-black/60 border border-[#C9A45C]/50 text-xs font-serif-display text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">카테고리</label>
                        <select
                          value={selectedCanvasSpace.category}
                          onChange={(e) =>
                            updateSpaceItem(selectedCanvasSpace.id, { category: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded bg-black/60 border border-white/20 text-xs text-[#C9A45C] focus:outline-none focus:border-[#C9A45C]"
                        >
                          <option value="LIVING">LIVING (공용/휴게)</option>
                          <option value="SUITE">SUITE (객실/휴식)</option>
                          <option value="WELLNESS">WELLNESS (웰니스/테라피)</option>
                          <option value="SERVICE">SERVICE (편의시설)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">CAD 실측 규격</label>
                        <input
                          type="text"
                          value={selectedCanvasSpace.dimensionsCAD}
                          onChange={(e) =>
                            updateSpaceItem(selectedCanvasSpace.id, { dimensionsCAD: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded bg-black/60 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">태그라인 (부제목)</label>
                        <input
                          type="text"
                          value={selectedCanvasSpace.tagline || ''}
                          onChange={(e) =>
                            updateSpaceItem(selectedCanvasSpace.id, { tagline: e.target.value })
                          }
                          placeholder="예: 14.4M 초광폭 파노라마 거실"
                          className="w-full px-3 py-1.5 rounded bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-white/70 mb-1">공간 상세 설명</label>
                        <textarea
                          rows={2}
                          value={selectedCanvasSpace.description}
                          onChange={(e) =>
                            updateSpaceItem(selectedCanvasSpace.id, { description: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>
                    </div>

                    {/* Fine-Tuning Coordinate Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                      {/* X Coordinate Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="text-white/70 font-medium">
                            X 좌표 (가로 위치 0% ~ 100%)
                          </label>
                          <span className="font-mono text-[#E0C37E] font-bold">
                            {selectedCanvasSpace.floorplan?.x ?? 50}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={selectedCanvasSpace.floorplan?.x ?? 50}
                            onChange={(e) =>
                              updateHotspotPosition(
                                selectedCanvasSpace.id,
                                parseFloat(e.target.value),
                                selectedCanvasSpace.floorplan?.y ?? 50
                              )
                            }
                            className="w-full accent-[#C9A45C]"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={selectedCanvasSpace.floorplan?.x ?? 50}
                            onChange={(e) =>
                              updateHotspotPosition(
                                selectedCanvasSpace.id,
                                parseFloat(e.target.value) || 0,
                                selectedCanvasSpace.floorplan?.y ?? 50
                              )
                            }
                            className="w-16 px-2 py-1 rounded bg-black/60 border border-white/20 text-xs font-mono text-white text-center focus:outline-none focus:border-[#C9A45C]"
                          />
                        </div>
                      </div>

                      {/* Y Coordinate Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="text-white/70 font-medium">
                            Y 좌표 (세로 위치 0% ~ 100%)
                          </label>
                          <span className="font-mono text-[#E0C37E] font-bold">
                            {selectedCanvasSpace.floorplan?.y ?? 50}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={selectedCanvasSpace.floorplan?.y ?? 50}
                            onChange={(e) =>
                              updateHotspotPosition(
                                selectedCanvasSpace.id,
                                selectedCanvasSpace.floorplan?.x ?? 50,
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full accent-[#C9A45C]"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={selectedCanvasSpace.floorplan?.y ?? 50}
                            onChange={(e) =>
                              updateHotspotPosition(
                                selectedCanvasSpace.id,
                                selectedCanvasSpace.floorplan?.x ?? 50,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 px-2 py-1 rounded bg-black/60 border border-white/20 text-xs font-mono text-white text-center focus:outline-none focus:border-[#C9A45C]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: Hotspots Management List (View & Delete) */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#E0C37E] flex items-center gap-2 font-serif-display">
                      <Layers className="w-4 h-4 text-[#C9A45C]" />
                      <span>설정된 핫스팟 목록 ({content.spaces.items.length}개)</span>
                    </h4>
                    <span className="text-[11px] text-white/50">
                      삭제 버튼을 클릭하면 평면도에서 즉시 삭제됩니다
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {content.spaces.items.map((sp) => {
                      const isCurrent = activeCanvasHotspotId === sp.id;
                      const isConfirming = deleteConfirmId === sp.id;

                      return (
                        <div
                          key={sp.id}
                          onClick={() => {
                            setActiveCanvasHotspotId(sp.id);
                            setSelectedSpaceId(sp.id);
                          }}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isCurrent
                              ? 'bg-[#C9A45C]/15 border-[#C9A45C]'
                              : 'bg-white/5 border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-[#111] border border-[#C9A45C] text-[#E0C37E] font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {sp.spaceNumber}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {sp.koreanName}
                              </p>
                              <p className="text-[10px] text-white/50 font-serif-display truncate">
                                {sp.name} · ({sp.floorplan?.x ?? 50}%, {sp.floorplan?.y ?? 50}%)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isConfirming ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHotspot(sp.id, sp.koreanName)}
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow"
                                >
                                  확인
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px]"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(sp.id)}
                                className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 hover:text-red-200 transition-colors"
                                title="핫스팟 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 5: Floorplan Meta Texts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      챕터 라벨
                    </label>
                    <input
                      type="text"
                      value={content.floorplan.chapterTag}
                      onChange={(e) => updateField('floorplan', 'chapterTag', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      메인 타이틀
                    </label>
                    <input
                      type="text"
                      value={content.floorplan.title}
                      onChange={(e) => updateField('floorplan', 'title', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      영문 서브타이틀
                    </label>
                    <input
                      type="text"
                      value={content.floorplan.subtitle}
                      onChange={(e) => updateField('floorplan', 'subtitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-[#E0C37E] font-serif-display focus:outline-none focus:border-[#C9A45C]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      도면 소개 설명문
                    </label>
                    <textarea
                      rows={2}
                      value={content.floorplan.description}
                      onChange={(e) => updateField('floorplan', 'description', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SPACES */}
          {activeAdminTab === 'spaces' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    챕터 라벨
                  </label>
                  <input
                    type="text"
                    value={content.spaces.chapterTag}
                    onChange={(e) => updateField('spaces', 'chapterTag', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    메인 타이틀
                  </label>
                  <input
                    type="text"
                    value={content.spaces.title}
                    onChange={(e) => updateField('spaces', 'title', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    섹션 소개글
                  </label>
                  <textarea
                    rows={2}
                    value={content.spaces.subtitle}
                    onChange={(e) => updateField('spaces', 'subtitle', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>
              </div>

              {/* Space Selector & Specific Space Editor */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#E0C37E] flex items-center gap-2 font-serif-display">
                    <MapPin className="w-4 h-4 text-[#C9A45C]" />
                    <span>공간별 세부 정보 및 제원 편집</span>
                  </h4>

                  <select
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    className="px-3 py-1.5 rounded bg-[#1f1f1f] border border-[#C9A45C]/50 text-xs text-[#E0C37E] font-medium focus:outline-none"
                  >
                    {content.spaces.items.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        [{sp.spaceNumber}] {sp.koreanName}
                      </option>
                    ))}
                  </select>
                </div>

                {currentSpace && (
                  <div className="p-5 rounded-lg bg-white/5 border border-white/10 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-white/60 mb-1">
                          공간 명칭 (한글)
                        </label>
                        <input
                          type="text"
                          value={currentSpace.koreanName}
                          onChange={(e) =>
                            updateSpaceItem(currentSpace.id, { koreanName: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-white/60 mb-1">
                          공간 명칭 (영문)
                        </label>
                        <input
                          type="text"
                          value={currentSpace.name}
                          onChange={(e) =>
                            updateSpaceItem(currentSpace.id, { name: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-white font-serif-display focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-white/60 mb-1">
                          카테고리 태그
                        </label>
                        <input
                          type="text"
                          value={currentSpace.category}
                          onChange={(e) =>
                            updateSpaceItem(currentSpace.id, { category: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-[#C9A45C] focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-white/60 mb-1">
                          CAD 실측 규격
                        </label>
                        <input
                          type="text"
                          value={currentSpace.dimensionsCAD}
                          onChange={(e) =>
                            updateSpaceItem(currentSpace.id, { dimensionsCAD: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-white/60 mb-1">
                          한 줄 슬로건 (Tagline)
                        </label>
                        <input
                          type="text"
                          value={currentSpace.tagline}
                          onChange={(e) =>
                            updateSpaceItem(currentSpace.id, { tagline: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-[#E0C37E] focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-white/60 mb-1">
                          상세 설계 철학 및 설명
                        </label>
                        <textarea
                          rows={3}
                          value={currentSpace.description}
                          onChange={(e) =>
                            updateSpaceItem(currentSpace.id, { description: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-white/90 focus:outline-none focus:border-[#C9A45C]"
                        />
                      </div>
                    </div>

                    {/* Hotspot Coordinates on Floorplan */}
                    <div className="p-3.5 rounded-lg bg-black/40 border border-[#C9A45C]/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#E0C37E] flex items-center gap-1.5">
                          <Crosshair className="w-3.5 h-3.5 text-[#C9A45C]" />
                          <span>평면도 핫스팟 위치 좌표 [X: {currentSpace.floorplan?.x ?? 50}%, Y: {currentSpace.floorplan?.y ?? 50}%]</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCanvasHotspotId(currentSpace.id);
                            setActiveAdminTab('floorplan');
                          }}
                          className="text-[11px] text-[#C9A45C] hover:underline"
                        >
                          → 평면도 시각적 캔버스에서 위치 드래그하기
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">X 좌표 (0% ~ 100%)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.1"
                              value={currentSpace.floorplan?.x ?? 50}
                              onChange={(e) =>
                                updateHotspotPosition(
                                  currentSpace.id,
                                  parseFloat(e.target.value),
                                  currentSpace.floorplan?.y ?? 50
                                )
                              }
                              className="w-full accent-[#C9A45C]"
                            />
                            <span className="text-xs font-mono text-[#E0C37E] w-12 text-right">
                              {currentSpace.floorplan?.x ?? 50}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Y 좌표 (0% ~ 100%)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.1"
                              value={currentSpace.floorplan?.y ?? 50}
                              onChange={(e) =>
                                updateHotspotPosition(
                                  currentSpace.id,
                                  currentSpace.floorplan?.x ?? 50,
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full accent-[#C9A45C]"
                            />
                            <span className="text-xs font-mono text-[#E0C37E] w-12 text-right">
                              {currentSpace.floorplan?.y ?? 50}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 360 Panorama VR Image Section for currentSpace */}
                    <div className="p-4 rounded-lg bg-black/40 border border-[#C9A45C]/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#E0C37E] flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-[#C9A45C]" />
                          <span>360° 파노라마 가상 투어 이미지 등록</span>
                        </span>
                        {currentSpace.panoramaUrl ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            VR 파노라마 등록됨
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/60">
                            3D CAD 시뮬레이터 모드
                          </span>
                        )}
                      </div>

                      {currentSpace.panoramaUrl ? (
                        <div className="space-y-3">
                          <div className="relative aspect-[21/9] rounded-lg overflow-hidden border border-[#C9A45C]/40 group bg-black">
                            <img
                              src={currentSpace.panoramaUrl}
                              alt={`${currentSpace.koreanName} 360 파노라마`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-80" />
                            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white">
                              <span className="font-mono text-[11px] text-[#E0C37E]">Equirectangular 360° VR</span>
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer px-2.5 py-1 rounded bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111] font-semibold text-[11px] transition-colors">
                                  <span>이미지 교체</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handlePanoramaImageUpload(currentSpace.id, e)}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`'${currentSpace.koreanName}'의 360° 파노라마 이미지를 삭제하시겠습니까?`)) {
                                      clearPanoramaImage(currentSpace.id);
                                      showToast('파노라마 이미지가 삭제되었습니다.');
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded bg-red-500/30 hover:bg-red-500/50 text-red-200 border border-red-500/40 text-[11px] transition-colors"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-lg border border-dashed border-[#C9A45C]/40 bg-[#161616]">
                          <div className="w-10 h-10 rounded-lg bg-[#C9A45C]/15 border border-[#C9A45C]/30 flex items-center justify-center text-[#C9A45C] shrink-0">
                            <Compass className="w-5 h-5" />
                          </div>
                          <div className="flex-1 text-center sm:text-left">
                            <span className="text-xs text-white font-medium block">
                              360도 파노라마 사진(2:1 비율 권장)을 업로드하세요
                            </span>
                            <span className="text-[11px] text-white/50 block mt-0.5">
                              등록 즉시 360도 VR 가상 투어 뷰어에서 360도로 회전하며 볼 수 있습니다.
                            </span>
                          </div>
                          <label className="cursor-pointer px-3.5 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow">
                            <Upload className="w-3.5 h-3.5" />
                            <span>파노라마 등록</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePanoramaImageUpload(currentSpace.id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Highlights Points (Max 4) */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <label className="block text-xs font-medium text-[#C9A45C]">
                          건축 특화 포인트 (최대 4개)
                        </label>
                        <span className="text-[11px] text-white/50">
                          * 텍스트가 입력된 항목에만 체크 아이콘이 표시되며, 빈 칸은 자동 제외됩니다.
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[0, 1, 2, 3].map((idx) => {
                          const hl = currentSpace.architecturalHighlights?.[idx] ?? '';
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[10px] text-white/40 font-mono">0{idx + 1}</span>
                              <input
                                type="text"
                                value={hl}
                                placeholder={`특화 포인트 0${idx + 1} (입력 시에만 체크 표시)`}
                                onChange={(e) => {
                                  const base = [...(currentSpace.architecturalHighlights || [])];
                                  while (base.length <= idx) {
                                    base.push('');
                                  }
                                  base[idx] = e.target.value;
                                  updateSpaceItem(currentSpace.id, {
                                    architecturalHighlights: base.slice(0, 4),
                                  });
                                }}
                                className="w-full px-2.5 py-1.5 rounded bg-black/50 border border-white/20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#C9A45C]"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: 360° PANORAMA TOUR */}
          {activeAdminTab === 'panorama' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#1c1810] to-[#141414] border border-[#C9A45C]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A45C]/20 border border-[#C9A45C]/40 flex items-center justify-center text-[#C9A45C] shrink-0 mt-0.5">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>360도 파노라마 가상 투어 이미지 관리</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#C9A45C]/20 text-[#E0C37E] border border-[#C9A45C]/30">
                        EQUIRECTANGULAR 2:1
                      </span>
                    </h3>
                    <p className="text-xs text-white/60 mt-1 max-w-2xl leading-relaxed">
                      각 공간별로 360° 파노라마 사진(JPG, PNG, WebP)을 등록할 수 있습니다. 등록된 이미지는 IndexedDB에 100% 원본으로 영구 보관되며, 가상 투어 뷰어에서 360도 자유 회전 및 줌으로 탐색할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Spaces Selection Carousel / Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/70">
                    관리할 공간 선택 (총 {content.spaces.items.length}개 공간)
                  </span>
                  <span className="text-[11px] text-[#C9A45C] font-mono">
                    등록 완료:{' '}
                    {content.spaces.items.filter((s) => s.panoramaUrl).length} / {content.spaces.items.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {content.spaces.items.map((space) => {
                    const isSelected = space.id === selectedPanoramaSpaceId;
                    const hasPanorama = Boolean(space.panoramaUrl);

                    return (
                      <button
                        key={space.id}
                        type="button"
                        onClick={() => {
                          setSelectedPanoramaSpaceId(space.id);
                          setCustomPanoramaUrlInput(space.panoramaUrl || '');
                        }}
                        className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#221e16] border-[#C9A45C] shadow-lg shadow-[#C9A45C]/15 ring-1 ring-[#C9A45C]'
                            : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/[0.07]'
                        }`}
                      >
                        {/* Thumbnail / Status icon */}
                        <div className="w-full aspect-video rounded-lg overflow-hidden mb-2 relative bg-black/60 border border-white/10">
                          {hasPanorama ? (
                            <img
                              src={space.panoramaUrl!}
                              alt={space.koreanName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/30 text-[10px]">
                              <Compass className="w-5 h-5 text-white/20 mb-1" />
                              <span>시뮬레이터 모드</span>
                            </div>
                          )}

                          {hasPanorama ? (
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white font-mono text-[9px] font-bold shadow">
                              VR 등록됨
                            </span>
                          ) : (
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white/60 font-mono text-[9px] border border-white/15">
                              미등록
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#C9A45C] font-mono">
                            <span>SPACE {space.spaceNumber}</span>
                            <span>•</span>
                            <span>{space.category}</span>
                          </div>
                          <h4 className="text-xs font-semibold text-white truncate mt-0.5">
                            {space.koreanName}
                          </h4>
                          <span className="text-[10px] text-white/50 truncate block font-serif-display">
                            {space.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Space Detail & Panorama Upload Studio */}
              {(() => {
                const targetSpace =
                  content.spaces.items.find((s) => s.id === selectedPanoramaSpaceId) ||
                  content.spaces.items[0];
                if (!targetSpace) return null;

                return (
                  <div className="p-5 rounded-xl bg-black/50 border border-[#C9A45C]/40 space-y-5 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#C9A45C] text-[#111111] font-mono font-bold text-[10px]">
                            {targetSpace.spaceNumber}
                          </span>
                          <h3 className="text-base font-serif-display font-semibold text-white">
                            {targetSpace.koreanName} ({targetSpace.name})
                          </h3>
                        </div>
                        <p className="text-xs text-white/60 mt-0.5">
                          {targetSpace.tagline || targetSpace.description}
                        </p>
                      </div>

                      {targetSpace.panoramaUrl && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`'${targetSpace.koreanName}'의 파노라마 이미지를 삭제하시겠습니까?`)) {
                                clearPanoramaImage(targetSpace.id);
                                showToast('파노라마 이미지가 삭제되었습니다.');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/20 text-xs transition-colors"
                          >
                            이미지 삭제
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preview or Drop Area */}
                    {targetSpace.panoramaUrl ? (
                      <div className="space-y-3">
                        <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full rounded-xl overflow-hidden border border-[#C9A45C]/50 shadow-2xl bg-black group">
                          <img
                            src={targetSpace.panoramaUrl}
                            alt={`${targetSpace.koreanName} 360 Panorama`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#C9A45C]/40 text-[#E0C37E] text-xs font-mono flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-[#C9A45C]" />
                            <span>360° 파노라마 뷰어 연동 완료</span>
                          </div>

                          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs text-white">
                              <span className="font-semibold block">{targetSpace.koreanName} 파노라마 실사 뷰</span>
                              <span className="text-white/60 text-[11px]">360° 뷰어 화면에서 자유롭게 둘러보실 수 있습니다.</span>
                            </div>

                            <label className="cursor-pointer px-4 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] font-bold text-xs transition-all shadow-lg flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5" />
                              <span>새 파노라마 이미지로 교체</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePanoramaImageUpload(targetSpace.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Big Upload Area */
                      <div className="border-2 border-dashed border-[#C9A45C]/40 hover:border-[#C9A45C] rounded-xl p-8 sm:p-12 text-center bg-[#151515] transition-colors flex flex-col items-center justify-center space-y-3 group">
                        <div className="w-16 h-16 rounded-2xl bg-[#C9A45C]/10 border border-[#C9A45C]/30 flex items-center justify-center text-[#C9A45C] group-hover:scale-110 transition-transform">
                          <Compass className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">
                            '{targetSpace.koreanName}' 360° 파노라마 사진 업로드
                          </h4>
                          <p className="text-xs text-white/50 mt-1 max-w-md">
                            2:1 비율(Equirectangular) 고해상도 이미지(JPG, PNG, WebP)를 선택해주세요.
                            <br />
                            (예: 4096×2048 또는 6000×3000 해상도 권장)
                          </p>
                        </div>
                        <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] font-bold text-xs tracking-wider transition-all shadow-lg flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          <span>파노라마 사진 파일 선택</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePanoramaImageUpload(targetSpace.id, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {/* URL Direct Input Fallback */}
                    <div className="p-3.5 rounded-lg bg-white/5 border border-white/10 space-y-2">
                      <label className="block text-xs font-medium text-white/70">
                        웹 이미지 URL로 직접 등록 (CDN 또는 외부 이미지 주소)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Link className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                          <input
                            type="url"
                            value={customPanoramaUrlInput}
                            onChange={(e) => setCustomPanoramaUrlInput(e.target.value)}
                            placeholder="https://example.com/panorama_360.jpg"
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSavePanoramaUrl(targetSpace.id)}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white transition-colors"
                        >
                          URL 적용
                        </button>
                      </div>
                    </div>

                    {/* 360° 화면 내 핫스팟 연결 지점 설정 (SPATIAL HOTSPOT STUDIO) */}
                    <div className="p-5 rounded-xl bg-gradient-to-b from-[#181612] to-[#0e0e0e] border border-[#C9A45C]/60 space-y-4 shadow-xl">
                      <PanoramaHotspotStudio
                        targetSpace={targetSpace}
                        allSpaces={content.spaces.items}
                        selectedHotspotIdx={selectedHotspotIdx}
                        onSelectHotspot={(idx) => setSelectedHotspotIdx(idx)}
                        onUpdateHotspot={(idx, patch) => {
                          const currentHotspots = [...(targetSpace.panoramaHotspots || [])];
                          if (currentHotspots[idx]) {
                            currentHotspots[idx] = { ...currentHotspots[idx], ...patch };
                            const newConnected = Array.from(new Set(currentHotspots.map((h) => h.targetSpaceId)));
                            updateSpaceItem(targetSpace.id, {
                              panoramaHotspots: currentHotspots,
                              connectedSpaceIds: newConnected,
                            });
                          }
                        }}
                        onAddHotspot={(newHotspot) => {
                          const currentHotspots = [...(targetSpace.panoramaHotspots || []), newHotspot];
                          const newConnected = Array.from(new Set(currentHotspots.map((h) => h.targetSpaceId)));
                          updateSpaceItem(targetSpace.id, {
                            panoramaHotspots: currentHotspots,
                            connectedSpaceIds: newConnected,
                          });
                          setSelectedHotspotIdx(currentHotspots.length - 1);
                        }}
                        onDeleteHotspot={(idx) => {
                          const currentHotspots = (targetSpace.panoramaHotspots || []).filter((_, i) => i !== idx);
                          const newConnected = Array.from(new Set(currentHotspots.map((h) => h.targetSpaceId)));
                          updateSpaceItem(targetSpace.id, {
                            panoramaHotspots: currentHotspots,
                            connectedSpaceIds: newConnected,
                          });
                          if (selectedHotspotIdx >= currentHotspots.length) {
                            setSelectedHotspotIdx(Math.max(0, currentHotspots.length - 1));
                          }
                        }}
                        showToast={showToast}
                      />
                    </div>

                    {/* 360° DATA CONFIG SYSTEM (개발자 및 데이터 스펙 명세) */}
                    <div className="p-4 rounded-lg bg-[#0e0e0e] border border-[#C9A45C]/30 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[#C9A45C] border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-[#C9A45C]" />
                          <span className="text-xs font-mono font-bold tracking-wider">
                            360° DATA CONFIG SYSTEM
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C9A45C]/20 text-[#E0C37E] font-mono">
                            JSON SPEC
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-white/50">
                          src/data/spacesData.ts
                        </span>
                      </div>

                      <p className="text-white/70 text-xs leading-relaxed">
                        추후 리모델링 완료 후 360° 파노라마 사진(Equirectangular JPG)을 <code className="text-[#C9A45C] bg-black/60 px-1 py-0.5 rounded font-mono">/assets/panorama/</code>에 추가하고 데이터의 <code className="text-[#C9A45C] bg-black/60 px-1 py-0.5 rounded font-mono">panoramaUrl</code>을 지정하거나 상단 업로드 창에 등록하면 UI가 자동으로 <strong>[ENTER SPACE]</strong> 실감형 360° 뷰어로 전환됩니다.
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-white/60">
                            [{targetSpace.spaceNumber}] {targetSpace.koreanName} 데이터 스펙
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const spec = {
                                id: targetSpace.id,
                                name: targetSpace.name,
                                koreanName: targetSpace.koreanName,
                                panoramaUrl: targetSpace.panoramaUrl || `/assets/panorama/${targetSpace.id}.jpg`,
                                floorplan: {
                                  x: targetSpace.floorplan?.x ?? 50,
                                  y: targetSpace.floorplan?.y ?? 50,
                                },
                                connectedSpaceIds: targetSpace.connectedSpaceIds || [],
                              };
                              navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
                              showToast(`'${targetSpace.koreanName}' 360° 스펙 JSON이 복사되었습니다.`);
                            }}
                            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#C9A45C]" />
                            <span>스펙 복사</span>
                          </button>
                        </div>
                        <pre className="bg-black/80 p-3.5 rounded-lg overflow-x-auto text-[#E0C37E] font-mono text-xs border border-white/10 leading-relaxed">
{`{
  id: "${targetSpace.id}",
  name: "${targetSpace.name}",
  koreanName: "${targetSpace.koreanName}",
  panoramaUrl: ${targetSpace.panoramaUrl ? `"${targetSpace.panoramaUrl}"` : `"/assets/panorama/${targetSpace.id}.jpg"`}, // ← 파일 추가 시 자동 활성화
  floorplan: { x: ${targetSpace.floorplan?.x ?? 50}, y: ${targetSpace.floorplan?.y ?? 50} },
  connectedSpaceIds: ${JSON.stringify(targetSpace.connectedSpaceIds || [])}
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: BRAND & FOOTER */}
          {activeAdminTab === 'brand' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-white/80 leading-relaxed">
                  한솔의 영문 표기는 <strong className="text-[#E0C37E]">HANSOLL</strong>(L 두 개)로 통일 적용됩니다. 아래 필드에서 상단 바 및 푸터의 브랜드 텍스트를 커스터마이징할 수 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    영문 브랜드명 (Title Brand)
                  </label>
                  <input
                    type="text"
                    value={content.brand.name}
                    onChange={(e) => updateField('brand', 'name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-[#E0C37E] font-serif-display font-semibold focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    서브 브랜드 라벨
                  </label>
                  <input
                    type="text"
                    value={content.brand.subName}
                    onChange={(e) => updateField('brand', 'subName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    회사 영문명 (Company Name)
                  </label>
                  <input
                    type="text"
                    value={content.brand.companyName}
                    onChange={(e) => updateField('brand', 'companyName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    푸터 저작권 표기
                  </label>
                  <input
                    type="text"
                    value={content.brand.copyright}
                    onChange={(e) => updateField('brand', 'copyright', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA MANAGEMENT */}
          {activeAdminTab === 'data' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Publish Sync Card */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-[#C9A45C]/20 via-[#1e1a12] to-[#161616] border border-[#C9A45C]/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-[#C9A45C]" />
                    <h4 className="text-sm font-semibold text-white">
                      퍼블리시 버전 vs 임시저장 내용 비교 및 영구 적용
                    </h4>
                    {diffCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {diffCount}건 미반영
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        동기화 완료
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70">
                    현재 브라우저에 임시저장된 편집 내용을 배포용 소스코드(publishedContent.json)에 영구 저장합니다. 재배포 시 모든 사용자에게 즉시 적용됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminModalOpen(false);
                    setIsComparisonModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-[#C9A45C] hover:bg-[#d6b470] text-[#111111] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>비교 및 퍼블리시 적용 열기</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Export */}
                <div className="p-5 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-between space-y-4">
                  <div>
                    <Download className="w-6 h-6 text-[#C9A45C] mb-2" />
                    <h4 className="text-sm font-semibold text-white">JSON 백업 다운로드</h4>
                    <p className="text-xs text-white/60 mt-1">
                      현재 수정한 모든 텍스트 구성을 파일로 다운로드하여 영구 백업합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      exportJSON();
                      showToast('백업 파일이 다운로드되었습니다.');
                    }}
                    className="w-full py-2.5 rounded-md bg-[#C9A45C]/20 hover:bg-[#C9A45C]/30 border border-[#C9A45C]/40 text-[#E0C37E] text-xs font-medium transition-colors"
                  >
                    JSON 파일 다운로드
                  </button>
                </div>

                {/* Import */}
                <div className="p-5 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-between space-y-4">
                  <div>
                    <Upload className="w-6 h-6 text-[#C9A45C] mb-2" />
                    <h4 className="text-sm font-semibold text-white">JSON 백업 불러오기</h4>
                    <p className="text-xs text-white/60 mt-1">
                      이전에 내보낸 JSON 설정 파일을 업로드하여 텍스트를 한 번에 복원합니다.
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={jsonInputRef}
                    onChange={handleJsonImport}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="w-full py-2.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-medium transition-colors"
                  >
                    JSON 파일 선택 및 적용
                  </button>
                </div>

                {/* Reset */}
                <div className="p-5 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col justify-between space-y-4">
                  <div>
                    <RotateCcw className="w-6 h-6 text-red-400 mb-2" />
                    <h4 className="text-sm font-semibold text-red-300">초기 기본값으로 복원</h4>
                    <p className="text-xs text-white/60 mt-1">
                      수정한 모든 텍스트와 비디오 설정을 초기 출고 상태로 완전히 리셋합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('정말로 모든 설정을 초기 기본값으로 복원하시겠습니까?')) {
                        resetToDefault();
                        showToast('모든 설정이 초기 기본값으로 복원되었습니다.');
                      }
                    }}
                    className="w-full py-2.5 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-medium transition-colors"
                  >
                    전체 리셋 (Reset All)
                  </button>
                </div>
              </div>

              {/* Admin Password Management */}
              <div className="p-5 rounded-xl bg-black/40 border border-[#C9A45C]/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C9A45C]/20 border border-[#C9A45C]/40 flex items-center justify-center text-[#C9A45C]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">관리자 모드 보안 비밀번호 변경</h4>
                      <p className="text-xs text-white/60">
                        관리자 비밀번호를 주기적으로 변경하여 관리자 권한을 안전하게 보호하세요.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1.5">
                        현재 비밀번호 *
                      </label>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={pwdCurrent}
                        onChange={(e) => {
                          setPwdCurrent(e.target.value);
                          setPwdError('');
                          setPwdSuccess('');
                        }}
                        placeholder="현재 비밀번호 입력"
                        className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1.5">
                        새 비밀번호 (4자리 이상) *
                      </label>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={pwdNew}
                        onChange={(e) => {
                          setPwdNew(e.target.value);
                          setPwdError('');
                          setPwdSuccess('');
                        }}
                        placeholder="새 비밀번호 입력"
                        className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1.5">
                        새 비밀번호 확인 *
                      </label>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={pwdConfirm}
                        onChange={(e) => {
                          setPwdConfirm(e.target.value);
                          setPwdError('');
                          setPwdSuccess('');
                        }}
                        placeholder="새 비밀번호 재입력"
                        className="w-full px-3 py-2 rounded bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                      />
                    </div>
                  </div>

                  {pwdError && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{pwdError}</span>
                    </div>
                  )}

                  {pwdSuccess && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{pwdSuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="text-xs text-white/60 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPwd ? '비밀번호 숨기기' : '비밀번호 표시'}</span>
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] font-semibold text-xs transition-colors shadow"
                    >
                      비밀번호 변경 저장
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-[#161616]">
          <div className="flex items-center gap-2 text-xs text-[#C9A45C]">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>수정 사항이 실시간으로 로컬 저장소에 저장되고 있습니다.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="px-5 py-2 rounded-md bg-[#C9A45C] hover:bg-[#d6b470] text-[#111111] font-semibold text-xs tracking-wider uppercase transition-all shadow-md"
            >
              편집 완료 (닫기)
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {saveToast && (
          <div className="absolute top-4 right-6 z-50 bg-[#C9A45C] text-[#111111] px-4 py-2 rounded-md font-medium text-xs shadow-xl flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4" />
            <span>{saveToast}</span>
          </div>
        )}

      </div>
    </div>
  );
};
