import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Move,
  Eye,
  RotateCcw,
  Sparkles,
  Navigation as NavIcon,
  ZoomIn,
  ZoomOut,
  Sliders,
  Layers,
  HelpCircle,
  Check,
  MapPin,
} from 'lucide-react';
import { SpaceData, PanoramaHotspot } from '../types/spaces';

interface ScreenHotspot {
  index: number;
  hotspot: PanoramaHotspot;
  targetSpace?: SpaceData;
  x: number;
  y: number;
  visible: boolean;
  isSelected: boolean;
}

interface ClickPlacementMenu {
  clientX: number;
  clientY: number;
  yaw: number;
  pitch: number;
}

interface PanoramaHotspotStudioProps {
  targetSpace: SpaceData;
  allSpaces: SpaceData[];
  selectedHotspotIdx: number;
  onSelectHotspot: (index: number) => void;
  onUpdateHotspot: (index: number, patch: Partial<PanoramaHotspot>) => void;
  onAddHotspot: (hotspot: PanoramaHotspot) => void;
  onDeleteHotspot: (index: number) => void;
  showToast: (msg: string) => void;
}

export const PanoramaHotspotStudio: React.FC<PanoramaHotspotStudioProps> = ({
  targetSpace,
  allSpaces,
  selectedHotspotIdx,
  onSelectHotspot,
  onUpdateHotspot,
  onAddHotspot,
  onDeleteHotspot,
  showToast,
}) => {
  // View mode: '3d' (default interactive panorama) vs '2d' (flat equirectangular map)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [clickActionMode, setClickActionMode] = useState<'move' | 'create' | 'menu'>('move');
  const [clickMenu, setClickMenu] = useState<ClickPlacementMenu | null>(null);

  // Live angles reported from 3D camera
  const [currentYaw, setCurrentYaw] = useState<number>(0);
  const [currentPitch, setCurrentPitch] = useState<number>(0);
  const [currentFov, setCurrentFov] = useState<number>(75);
  const [isLoadingTexture, setIsLoadingTexture] = useState<boolean>(false);

  // Projected hotspots on screen for interactive 3D overlay
  const [screenHotspots, setScreenHotspots] = useState<ScreenHotspot[]>([]);

  // Three.js Mount & Refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereMeshRef = useRef<THREE.Mesh | null>(null);
  const cadGroupRef = useRef<THREE.Group | null>(null);
  const currentTextureRef = useRef<THREE.Texture | null>(null);

  // Interactive Drag & Rotation State
  const lonRef = useRef<number>(0);
  const latRef = useRef<number>(0);
  const targetLonRef = useRef<number>(0);
  const targetLatRef = useRef<number>(0);
  const fovRef = useRef<number>(75);
  const isUserInteractingRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(true);

  // Drag tracking for distinguishing click vs drag
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownLonRef = useRef<number>(0);
  const pointerDownLatRef = useRef<number>(0);
  const isDraggingPinRef = useRef<boolean>(false);
  const draggingPinIdxRef = useRef<number | null>(null);

  // Other available spaces (for destination assignment)
  const otherSpaces = useMemo(
    () => allSpaces.filter((s) => s.id !== targetSpace.id),
    [allSpaces, targetSpace.id]
  );

  const hotspots = useMemo(
    () => (Array.isArray(targetSpace.panoramaHotspots) ? targetSpace.panoramaHotspots : []),
    [targetSpace.panoramaHotspots]
  );

  const activeHotspot = hotspots[selectedHotspotIdx] || null;

  // Mark 3D view dirty for requestAnimationFrame
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  // Update Camera FOV
  const setFov = useCallback((newFov: number) => {
    const clamped = Math.max(35, Math.min(95, newFov));
    fovRef.current = clamped;
    setCurrentFov(clamped);
    if (cameraRef.current) {
      cameraRef.current.fov = clamped;
      cameraRef.current.updateProjectionMatrix();
    }
    markDirty();
  }, [markDirty]);

  // Rotate camera smoothly to a specific Yaw and Pitch
  const lookAtAngle = useCallback((yaw: number, pitch: number = -6) => {
    targetLonRef.current = yaw;
    targetLatRef.current = Math.max(-85, Math.min(85, pitch));
    markDirty();
  }, [markDirty]);

  // Cardinal direction label for current view
  const compassLabel = useMemo(() => {
    const deg = Math.round(((currentYaw % 360) + 360) % 360);
    if (deg >= 337.5 || deg < 22.5) return `0° 정면 (동 East)`;
    if (deg >= 22.5 && deg < 67.5) return `45° 전우측 (남동 SE)`;
    if (deg >= 67.5 && deg < 112.5) return `90° 우측 (남 South)`;
    if (deg >= 112.5 && deg < 157.5) return `135° 후우측 (남서 SW)`;
    if (deg >= 157.5 && deg < 202.5) return `180° 후면 (서 West)`;
    if (deg >= 202.5 && deg < 247.5) return `225° 후좌측 (북서 NW)`;
    if (deg >= 247.5 && deg < 292.5) return `270° 좌측 (북 North)`;
    return `315° 전좌측 (북동 NE)`;
  }, [currentYaw]);

  // Convert 2D screen coordinate on canvas into 3D Spherical (Yaw, Pitch)
  const screenToSpherical = useCallback((clientX: number, clientY: number): { yaw: number; pitch: number } | null => {
    if (!mountRef.current || !cameraRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    const rayDir = new THREE.Vector3(ndcX, ndcY, 0.5)
      .unproject(cameraRef.current)
      .sub(cameraRef.current.position)
      .normalize();

    const sPhi = Math.acos(Math.max(-1, Math.min(1, rayDir.y)));
    const pitch = Math.round(90 - (sPhi * 180) / Math.PI);
    const sTheta = Math.atan2(rayDir.z, rayDir.x);
    const yaw = Math.round(((sTheta * 180) / Math.PI + 360) % 360);

    return { yaw, pitch: Math.max(-60, Math.min(60, pitch)) };
  }, []);

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS 3D SCENE & RENDER LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    if (viewMode !== '3d') return;
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
    const camera = new THREE.PerspectiveCamera(fovRef.current, aspect, 1, 1100);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Inverted Equirectangular Sphere Mesh
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x141414 });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereMeshRef.current = sphere;

    // 5. Procedural 3D CAD Wireframe Guide Grid (Visible when no texture or as spatial guide)
    const cadGroup = new THREE.Group();
    for (let p = -60; p <= 60; p += 30) {
      const ringRadius = 490 * Math.cos((p * Math.PI) / 180);
      const ringY = 490 * Math.sin((p * Math.PI) / 180);
      const ringGeo = new THREE.RingGeometry(ringRadius - 0.8, ringRadius + 0.8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: p === 0 ? 0xE0C37E : 0x666666,
        opacity: p === 0 ? 0.45 : 0.15,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = ringY;
      cadGroup.add(ringMesh);
    }
    const groundGrid = new THREE.GridHelper(900, 36, 0xC9A45C, 0x333333);
    groundGrid.position.y = -200;
    (groundGrid.material as THREE.Material).transparent = true;
    (groundGrid.material as THREE.Material).opacity = 0.2;
    cadGroup.add(groundGrid);
    scene.add(cadGroup);
    cadGroupRef.current = cadGroup;

    // 6. Resize Observer
    const handleResize = () => {
      if (!mount || !cameraRef.current || !rendererRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      cameraRef.current.aspect = w / Math.max(1, h);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      markDirty();
    };
    window.addEventListener('resize', handleResize);

    // 7. Render Loop with Damping
    let animId: number;
    let idleFrames = 0;

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      // Smooth camera interpolation
      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      const lonDiff = targetLonRef.current - lonRef.current;
      const latDiff = targetLatRef.current - latRef.current;
      const isMoving = Math.abs(lonDiff) > 0.001 || Math.abs(latDiff) > 0.001;

      if (isMoving) {
        lonRef.current += lonDiff * 0.16;
        latRef.current += latDiff * 0.16;
        markDirty();
      }

      // Update Camera LookAt
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);
      const targetX = 500 * Math.sin(phi) * Math.cos(theta);
      const targetY = 500 * Math.cos(phi);
      const targetZ = 500 * Math.sin(phi) * Math.sin(theta);

      if (cameraRef.current) {
        cameraRef.current.lookAt(targetX, targetY, targetZ);
      }

      // Update live angle states (throttled to integer degrees)
      const normYaw = Math.round(((lonRef.current % 360) + 360) % 360);
      const normPitch = Math.round(latRef.current);
      setCurrentYaw((prev) => (prev !== normYaw ? normYaw : prev));
      setCurrentPitch((prev) => (prev !== normPitch ? normPitch : prev));

      // Project hotspots onto 2D screen coordinates
      if (mount && cameraRef.current) {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        const projectedList: ScreenHotspot[] = hotspots.map((hs, idx) => {
          const sPhi = THREE.MathUtils.degToRad(90 - (hs.pitch ?? -6));
          const sTheta = THREE.MathUtils.degToRad(hs.yaw);
          const spotPos = new THREE.Vector3(
            500 * Math.sin(sPhi) * Math.cos(sTheta),
            500 * Math.cos(sPhi),
            500 * Math.sin(sPhi) * Math.sin(sTheta)
          );

          const proj = spotPos.clone().project(cameraRef.current!);
          const isFront = proj.z < 1;
          const sx = (proj.x * 0.5 + 0.5) * w;
          const sy = (-proj.y * 0.5 + 0.5) * h;
          const targetObj = allSpaces.find((s) => s.id === hs.targetSpaceId);

          return {
            index: idx,
            hotspot: hs,
            targetSpace: targetObj,
            x: sx,
            y: sy,
            visible: isFront && sx >= 15 && sx <= w - 15 && sy >= 15 && sy <= h - 15,
            isSelected: selectedHotspotIdx === idx,
          };
        });

        setScreenHotspots(projectedList);
      }

      // Render condition
      const shouldRender = isDirtyRef.current || isMoving || idleFrames < 4;
      if (shouldRender) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        if (!isMoving) {
          idleFrames += 1;
          if (idleFrames >= 4) isDirtyRef.current = false;
        } else {
          idleFrames = 0;
        }
      }
    };

    animId = requestAnimationFrame(renderLoop);
    markDirty();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) rendererRef.current.dispose();
      if (currentTextureRef.current) currentTextureRef.current.dispose();
    };
  }, [viewMode, hotspots, selectedHotspotIdx, allSpaces, markDirty]);

  // -------------------------------------------------------------
  // TEXTURE LOADER FOR TARGET SPACE PANORAMA
  // -------------------------------------------------------------
  useEffect(() => {
    if (viewMode !== '3d') return;
    const panoUrl = targetSpace.panoramaUrl;

    if (!panoUrl) {
      if (sphereMeshRef.current) {
        const mat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.map = null;
        mat.color = new THREE.Color(0x111111);
        mat.needsUpdate = true;
      }
      if (cadGroupRef.current) cadGroupRef.current.visible = true;
      setIsLoadingTexture(false);
      markDirty();
      return;
    }

    setIsLoadingTexture(true);
    const loader = new THREE.TextureLoader();
    loader.load(
      panoUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        if (currentTextureRef.current) currentTextureRef.current.dispose();
        currentTextureRef.current = texture;

        if (sphereMeshRef.current) {
          const mat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
          mat.map = texture;
          mat.color = new THREE.Color(0xffffff);
          mat.needsUpdate = true;
        }
        if (cadGroupRef.current) cadGroupRef.current.visible = false;
        setIsLoadingTexture(false);
        markDirty();
      },
      undefined,
      (err) => {
        console.warn('Failed to load studio panorama texture:', err);
        setIsLoadingTexture(false);
        if (cadGroupRef.current) cadGroupRef.current.visible = true;
        markDirty();
      }
    );
  }, [viewMode, targetSpace.panoramaUrl, markDirty]);

  // -------------------------------------------------------------
  // POINTER & MOUSE INTERACTION ON 3D STAGE
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Dismiss any active click menu if clicking elsewhere
    if (clickMenu) setClickMenu(null);

    // If starting a pin drag, handle separately
    if (isDraggingPinRef.current) return;

    isUserInteractingRef.current = true;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    pointerDownLonRef.current = lonRef.current;
    pointerDownLatRef.current = latRef.current;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // If dragging a hotspot pin
    if (isDraggingPinRef.current && draggingPinIdxRef.current !== null) {
      const coords = screenToSpherical(e.clientX, e.clientY);
      if (coords) {
        onUpdateHotspot(draggingPinIdxRef.current, {
          yaw: coords.yaw,
          pitch: coords.pitch,
        });
      }
      return;
    }

    // Camera rotation
    if (!isUserInteractingRef.current) return;
    const deltaX = e.clientX - pointerDownPosRef.current.x;
    const deltaY = e.clientY - pointerDownPosRef.current.y;

    const factor = (fovRef.current / 75) * 0.15;
    targetLonRef.current = pointerDownLonRef.current - deltaX * factor;
    targetLatRef.current = Math.max(-85, Math.min(85, pointerDownLatRef.current + deltaY * factor));
    markDirty();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // End pin drag
    if (isDraggingPinRef.current && draggingPinIdxRef.current !== null) {
      const coords = screenToSpherical(e.clientX, e.clientY);
      if (coords) {
        onUpdateHotspot(draggingPinIdxRef.current, {
          yaw: coords.yaw,
          pitch: coords.pitch,
        });
        showToast(`핫스팟 위치가 (Yaw: ${coords.yaw}°, Pitch: ${coords.pitch}°)로 이동되었습니다.`);
      }
      isDraggingPinRef.current = false;
      draggingPinIdxRef.current = null;
      return;
    }

    if (!isUserInteractingRef.current) return;
    isUserInteractingRef.current = false;
    targetLonRef.current = lonRef.current;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    // Check if this was a CLICK (< 5px movement) rather than a drag
    const moveDist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    if (moveDist < 6) {
      handleStageClick(e.clientX, e.clientY);
    }
  };

  // Handle a direct click on the 3D panorama canvas
  const handleStageClick = (clientX: number, clientY: number) => {
    const coords = screenToSpherical(clientX, clientY);
    if (!coords) return;
    const { yaw, pitch } = coords;

    if (clickActionMode === 'menu') {
      setClickMenu({ clientX, clientY, yaw, pitch });
      return;
    }

    if (clickActionMode === 'create' || hotspots.length === 0) {
      // Create new hotspot at clicked point
      const firstTarget = otherSpaces[0];
      if (!firstTarget) {
        showToast('연결할 다른 공간이 없습니다.');
        return;
      }
      const newHotspot: PanoramaHotspot = {
        id: `hs-${Date.now()}`,
        targetSpaceId: firstTarget.id,
        label: `${firstTarget.koreanName} 이동`,
        yaw,
        pitch,
      };
      onAddHotspot(newHotspot);
      showToast(`클릭 위치(Yaw: ${yaw}°, Pitch: ${pitch}°)에 새 핫스팟이 생성되었습니다.`);
    } else {
      // Move currently selected hotspot
      const activeIdx = selectedHotspotIdx >= 0 && selectedHotspotIdx < hotspots.length ? selectedHotspotIdx : 0;
      onUpdateHotspot(activeIdx, { yaw, pitch });
      showToast(`선택된 핫스팟 #${activeIdx + 1}의 위치가 (Yaw: ${yaw}°, Pitch: ${pitch}°)로 이동되었습니다.`);
    }
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 4 : -4;
    setFov(fovRef.current + delta);
  };

  // Start Pin Dragging
  const startPinDrag = (e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    onSelectHotspot(idx);
    isDraggingPinRef.current = true;
    draggingPinIdxRef.current = idx;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // -------------------------------------------------------------
  // ACTIONS: Center Crosshair Hotspot Placement
  // -------------------------------------------------------------
  const handlePlaceSelectedAtCenter = () => {
    if (hotspots.length === 0) {
      handleCreateAtCenter();
      return;
    }
    const activeIdx = selectedHotspotIdx >= 0 && selectedHotspotIdx < hotspots.length ? selectedHotspotIdx : 0;
    onUpdateHotspot(activeIdx, {
      yaw: currentYaw,
      pitch: currentPitch,
    });
    showToast(`선택된 핫스팟 #${activeIdx + 1}이 현재 시야 정면(Yaw: ${currentYaw}°, Pitch: ${currentPitch}°)으로 배치되었습니다.`);
  };

  const handleCreateAtCenter = () => {
    const firstTarget = otherSpaces[0];
    if (!firstTarget) {
      showToast('연결할 다른 공간이 없습니다.');
      return;
    }
    const newHotspot: PanoramaHotspot = {
      id: `hs-${Date.now()}`,
      targetSpaceId: firstTarget.id,
      label: `${firstTarget.koreanName} 이동`,
      yaw: currentYaw,
      pitch: currentPitch,
    };
    onAddHotspot(newHotspot);
    showToast(`현재 시야 정면(Yaw: ${currentYaw}°, Pitch: ${currentPitch}°)에 새 핫스팟이 추가되었습니다.`);
  };

  return (
    <div className={`space-y-4 ${isExpanded ? 'fixed inset-4 sm:inset-8 z-50 bg-[#0c0b0a] p-6 rounded-2xl border border-[#C9A45C] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-y-auto flex flex-col' : ''}`}>
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C9A45C]/20 border border-[#C9A45C] flex items-center justify-center text-[#E0C37E]">
            <NavIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">
                360° 화면 내 핫스팟 연결 지점 설정
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#C9A45C]/25 text-[#E0C37E] font-mono font-semibold">
                3D PANORAMA STUDIO
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              360도 파노라마 화면을 마우스로 자유롭게 회전하며, 내가 보는 시야에서 출입문 및 이동 경로를 직접 지정합니다.
            </p>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Space 01 Special Auto-Connector */}
          {targetSpace.id === 'entrance' && (
            <button
              type="button"
              onClick={() => {
                const nextSpaceId = 'lounge';
                const nextSpaceObj = allSpaces.find((s) => s.id === nextSpaceId);
                const newHotspot: PanoramaHotspot = {
                  id: `hs-entrance-lounge-${Date.now()}`,
                  targetSpaceId: nextSpaceId,
                  label: nextSpaceObj ? `${nextSpaceObj.koreanName} 이동` : '거실 라운지 이동',
                  yaw: 0,
                  pitch: -6,
                };
                onAddHotspot(newHotspot);
                lookAtAngle(0, -6);
                showToast('Space 01 현관 ➔ 중앙 거실 라운지 핫스팟이 정면(0°)에 생성되었습니다.');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#C9A45C]/20 hover:bg-[#C9A45C]/35 border border-[#C9A45C] text-[#E0C37E] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C9A45C]" />
              <span>Space 01 현관 ➔ 거실 자동 연결</span>
            </button>
          )}

          {/* Mode Tabs: 3D vs 2D */}
          <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                viewMode === '3d'
                  ? 'bg-[#C9A45C] text-[#111111] font-bold shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              3D 파노라마 시야 편집 (추천)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                viewMode === '2d'
                  ? 'bg-[#C9A45C] text-[#111111] font-bold shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              2D 전개도 매핑 (360° 플랫)
            </button>
          </div>

          {/* Add New Hotspot Button */}
          <button
            type="button"
            onClick={handleCreateAtCenter}
            className="px-3 py-1.5 rounded-lg bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 핫스팟 추가</span>
          </button>

          {/* Expand Modal Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 transition-colors"
            title={isExpanded ? '원래 크기로 복귀' : '와이드 전체화면 편집'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3D INTERACTIVE PANORAMA VIEWER STAGE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === '3d' ? (
        <div className="space-y-2">
          {/* Status and Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 bg-[#12110e] px-3.5 py-2 rounded-xl border border-[#C9A45C]/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[#E0C37E] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span>현재 시야:</span>
                <strong className="text-white">{compassLabel}</strong>
                <span className="text-white/60 text-[11px]">(Yaw: {currentYaw}° • Pitch: {currentPitch}°)</span>
              </span>
            </div>

            {/* Click Tool Selector & Reticle Toggle */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-lg border border-white/10">
                <span className="text-white/60">화면 클릭시:</span>
                <button
                  type="button"
                  onClick={() => setClickActionMode('move')}
                  className={`px-1.5 py-0.5 rounded font-mono ${
                    clickActionMode === 'move'
                      ? 'bg-[#C9A45C] text-[#111111] font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="360도 화면을 클릭하면 현재 선택된 핫스팟이 그 지점으로 이동합니다"
                >
                  선택 핫스팟 이동
                </button>
                <button
                  type="button"
                  onClick={() => setClickActionMode('create')}
                  className={`px-1.5 py-0.5 rounded font-mono ${
                    clickActionMode === 'create'
                      ? 'bg-[#C9A45C] text-[#111111] font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="360도 화면을 클릭하면 그 지점에 새 핫스팟을 생성합니다"
                >
                  새 핫스팟 생성
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowReticle(!showReticle)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showReticle
                    ? 'bg-[#C9A45C]/20 border-[#C9A45C] text-[#E0C37E]'
                    : 'bg-black/50 border-white/20 text-white/50'
                }`}
                title="시야 정중앙 조준선(Reticle) 표시/숨김"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Canvas Stage */}
          <div
            className={`relative w-full rounded-xl overflow-hidden bg-black border-2 border-[#C9A45C]/60 shadow-2xl select-none group cursor-grab active:cursor-grabbing ${
              isExpanded ? 'flex-1 min-h-[500px]' : 'h-[360px] sm:h-[420px]'
            }`}
          >
            {/* Three.js Container */}
            <div
              ref={mountRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              className="w-full h-full"
              style={{ touchAction: 'none' }}
            />

            {/* Texture Loading Indicator */}
            {isLoadingTexture && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
                <div className="w-8 h-8 border-2 border-[#C9A45C] border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-mono text-[#E0C37E]">360° 파노라마 텍스처 로딩 중...</span>
              </div>
            )}

            {/* Center Crosshair (Reticle) */}
            {showReticle && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="relative flex items-center justify-center">
                  <Crosshair className="w-8 h-8 text-[#C9A45C]/60 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-pulse" />
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-[#E0C37E]" />
                  <div className="absolute top-5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-[#C9A45C]/40 text-[9px] font-mono text-[#E0C37E] whitespace-nowrap shadow-lg">
                    정면 조준점 ({currentYaw}° / {currentPitch}°)
                  </div>
                </div>
              </div>
            )}

            {/* Quick Snap Angle Controls (Overlay Top Right) */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-lg border border-white/20 shadow-xl">
              <button
                type="button"
                onClick={() => lookAtAngle(0, -6)}
                className="px-2 py-1 text-[10px] font-mono text-white/80 hover:text-white hover:bg-white/10 rounded"
                title="0° 동/정면으로 시야 회전"
              >
                0° 정면
              </button>
              <button
                type="button"
                onClick={() => lookAtAngle(90, -6)}
                className="px-2 py-1 text-[10px] font-mono text-white/80 hover:text-white hover:bg-white/10 rounded"
                title="90° 남/우측으로 시야 회전"
              >
                90° 우측
              </button>
              <button
                type="button"
                onClick={() => lookAtAngle(180, -6)}
                className="px-2 py-1 text-[10px] font-mono text-white/80 hover:text-white hover:bg-white/10 rounded"
                title="180° 서/후면으로 시야 회전"
              >
                180° 후면
              </button>
              <button
                type="button"
                onClick={() => lookAtAngle(270, -6)}
                className="px-2 py-1 text-[10px] font-mono text-white/80 hover:text-white hover:bg-white/10 rounded"
                title="270° 북/좌측으로 시야 회전"
              >
                270° 좌측
              </button>

              <div className="h-4 w-[1px] bg-white/20 mx-1" />

              {/* Zoom Buttons */}
              <button
                type="button"
                onClick={() => setFov(fovRef.current - 6)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded"
                title="줌 인 (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFov(fovRef.current + 6)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded"
                title="줌 아웃 (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Placement Action Banner (Bottom Left/Center Overlay) */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePlaceSelectedAtCenter}
                className="px-3 py-1.5 rounded-lg bg-black/90 hover:bg-black border border-[#C9A45C] text-[#E0C37E] hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all"
                title="현재 바라보고 있는 화면 중앙(조준점) 위치로 선택된 핫스팟 좌표를 즉시 이동합니다"
              >
                <Crosshair className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span>
                  {activeHotspot
                    ? `선택 핫스팟 #${selectedHotspotIdx + 1}을 현재 시야로 이동`
                    : '현재 시야에 핫스팟 배치'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCreateAtCenter}
                className="px-3 py-1.5 rounded-lg bg-[#C9A45C]/25 hover:bg-[#C9A45C]/45 border border-[#C9A45C] text-white text-xs font-medium flex items-center gap-1.5 shadow-xl transition-all"
                title="현재 바라보고 있는 방향에 새 이동 지점을 즉시 추가합니다"
              >
                <Plus className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span>현재 시야에 새 핫스팟 생성</span>
              </button>
            </div>

            {/* Projected Hotspot 3D Pins Overlay */}
            <div className="absolute inset-0 pointer-events-none z-15">
              {screenHotspots.map((item) => {
                if (!item.visible) return null;
                const { index, hotspot, targetSpace: dest, x, y, isSelected } = item;

                return (
                  <div
                    key={hotspot.id || index}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    onPointerDown={(e) => startPinDrag(e, index)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHotspot(index);
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-move transition-transform select-none ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'
                    }`}
                    title={`클릭하여 선택 / 드래그하여 3D 화면상 위치 이동 (Yaw: ${hotspot.yaw}°, Pitch: ${hotspot.pitch ?? -6}°)`}
                  >
                    {/* Hotspot Outer Pulsing Ring */}
                    <div className="relative flex items-center justify-center">
                      {isSelected && (
                        <div className="absolute w-12 h-12 rounded-full border-2 border-[#C9A45C] animate-ping opacity-60 pointer-events-none" />
                      )}

                      {/* Main Icon Button */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.8)] border-2 transition-all ${
                          isSelected
                            ? 'bg-[#C9A45C] text-[#111111] border-white ring-4 ring-[#C9A45C]/50'
                            : 'bg-black/90 text-[#E0C37E] border-[#C9A45C] hover:border-white'
                        }`}
                      >
                        <NavIcon className="w-4 h-4 transform rotate-45" />
                      </div>

                      {/* Space Number Badge */}
                      <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full bg-black border border-[#C9A45C] text-[9px] font-mono font-bold text-[#E0C37E] shadow">
                        {dest ? dest.spaceNumber : index + 1}
                      </span>
                    </div>

                    {/* Label Card */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 rounded-md bg-black/95 border border-[#C9A45C]/70 text-center whitespace-nowrap shadow-2xl pointer-events-none">
                      <p className="text-[11px] font-bold text-white leading-tight">
                        {hotspot.label || (dest ? `${dest.koreanName} 이동` : `핫스팟 #${index + 1}`)}
                      </p>
                      <span className="text-[9px] font-mono text-[#E0C37E] block mt-0.5">
                        Yaw {hotspot.yaw}° / Pitch {hotspot.pitch ?? -6}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Click Context Menu Modal Bubble */}
            {clickMenu && (
              <div
                style={{
                  left: `${Math.min(window.innerWidth - 220, Math.max(20, clickMenu.clientX - 100))}px`,
                  top: `${Math.min(window.innerHeight - 150, Math.max(20, clickMenu.clientY - 20))}px`,
                }}
                className="fixed z-50 bg-[#161410] border border-[#C9A45C] rounded-xl p-3 shadow-2xl space-y-2 text-xs text-white animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="font-mono text-[11px] text-[#E0C37E]">
                    클릭 좌표: Yaw {clickMenu.yaw}° / Pitch {clickMenu.pitch}°
                  </span>
                  <button
                    type="button"
                    onClick={() => setClickMenu(null)}
                    className="text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {hotspots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateHotspot(selectedHotspotIdx, {
                          yaw: clickMenu.yaw,
                          pitch: clickMenu.pitch,
                        });
                        setClickMenu(null);
                        showToast(`선택된 핫스팟이 (Yaw: ${clickMenu.yaw}°, Pitch: ${clickMenu.pitch}°)로 이동되었습니다.`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#C9A45C] text-[#111111] font-bold text-left hover:bg-[#D4B26F] transition-colors"
                    >
                      선택 핫스팟 #{selectedHotspotIdx + 1}을 이 위치로 이동
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const firstTarget = otherSpaces[0];
                      if (!firstTarget) return;
                      onAddHotspot({
                        id: `hs-${Date.now()}`,
                        targetSpaceId: firstTarget.id,
                        label: `${firstTarget.koreanName} 이동`,
                        yaw: clickMenu.yaw,
                        pitch: clickMenu.pitch,
                      });
                      setClickMenu(null);
                      showToast(`이 위치(Yaw: ${clickMenu.yaw}°)에 새 핫스팟이 생성되었습니다.`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-left transition-colors"
                  >
                    + 이 위치에 새 연결 핫스팟 추가
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-white/50 px-1">
            💡 <strong>사용 방법</strong>: 360° 화면을 드래그하여 문이나 통로를 바라본 후, 화면을 클릭하거나 하단 [선택 핫스팟을 현재 시야로 이동] 버튼을 누르면 정확한 시야 위치에 핫스팟이 배치됩니다. 화면의 핀을 직접 마우스로 드래그하여 이동할 수도 있습니다.
          </p>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 2D FLAT EQUIRECTANGULAR MAPPER (Alternative View)             */
        /* ------------------------------------------------------------- */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white/80">
              360° 전개도 평면 좌표 매핑 (클릭하여 원하는 위치로 핫스팟 배치)
            </span>
            <span className="text-[11px] font-mono text-[#E0C37E]">
              수평각(Yaw): 0°~360° • 수직각(Pitch): -60°~+60°
            </span>
          </div>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;
              const clickYaw = Math.round((clickX / rect.width) * 360);
              const clickPitch = Math.round(90 - (clickY / rect.height) * 180);
              const clampedPitch = Math.max(-60, Math.min(60, clickPitch));

              if (hotspots.length === 0) {
                const firstOther = otherSpaces[0];
                if (!firstOther) return;
                onAddHotspot({
                  id: `hs-${Date.now()}`,
                  targetSpaceId: firstOther.id,
                  label: `${firstOther.koreanName} 이동`,
                  yaw: clickYaw,
                  pitch: clampedPitch,
                });
                showToast(`[${firstOther.koreanName}] 핫스팟이 클릭 위치(Yaw: ${clickYaw}°, Pitch: ${clampedPitch}°)에 배치되었습니다.`);
              } else {
                const activeIdx = selectedHotspotIdx >= 0 && selectedHotspotIdx < hotspots.length ? selectedHotspotIdx : 0;
                onUpdateHotspot(activeIdx, { yaw: clickYaw, pitch: clampedPitch });
                showToast(`선택된 핫스팟 위치가 (Yaw: ${clickYaw}°, Pitch: ${clampedPitch}°)로 변경되었습니다.`);
              }
            }}
            className="relative w-full aspect-[2.2/1] max-h-60 rounded-xl overflow-hidden bg-black/80 border-2 border-dashed border-[#C9A45C]/50 hover:border-[#C9A45C] cursor-crosshair group shadow-inner select-none"
          >
            {targetSpace.panoramaUrl ? (
              <img
                src={targetSpace.panoramaUrl}
                alt={targetSpace.koreanName}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a1a] via-[#111111] to-[#0a0a0a] text-center p-4">
                <Crosshair className="w-8 h-8 text-[#C9A45C]/40 mb-2" />
                <p className="text-xs text-white/70 font-mono">360° EQUIRECTANGULAR COORDINATE GRID</p>
                <p className="text-[10px] text-white/40 mt-1">클릭하여 핫스팟을 배치할 각도를 지정하세요</p>
              </div>
            )}

            {/* Horizon Guide */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/25 border-t border-dashed border-white/35 pointer-events-none">
              <span className="absolute left-2 -top-3 text-[9px] font-mono text-white/50">지평선 (Pitch 0°)</span>
            </div>

            {/* Cardinal markers */}
            <div className="absolute top-1 left-2 text-[9px] font-mono text-[#C9A45C] bg-black/70 px-1 rounded pointer-events-none">0° (정면/동)</div>
            <div className="absolute top-1 left-1/4 -translate-x-1/2 text-[9px] font-mono text-white/60 bg-black/70 px-1 rounded pointer-events-none">90° (우측/남)</div>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white/60 bg-black/70 px-1 rounded pointer-events-none">180° (후면/서)</div>
            <div className="absolute top-1 left-3/4 -translate-x-1/2 text-[9px] font-mono text-white/60 bg-black/70 px-1 rounded pointer-events-none">270° (좌측/북)</div>
            <div className="absolute top-1 right-2 text-[9px] font-mono text-[#C9A45C] bg-black/70 px-1 rounded pointer-events-none">360°</div>

            {/* Pins on 2D unrolled image */}
            {hotspots.map((hs, idx) => {
              const pinX = ((hs.yaw % 360) / 360) * 100;
              const pinY = ((90 - (hs.pitch ?? -6)) / 180) * 100;
              const isSelected = selectedHotspotIdx === idx;
              const targetObj = allSpaces.find((s) => s.id === hs.targetSpaceId);

              return (
                <div
                  key={hs.id || idx}
                  style={{ left: `${pinX}%`, top: `${pinY}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectHotspot(idx);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform ${
                    isSelected ? 'scale-125 z-20' : 'hover:scale-110'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 ${
                        isSelected
                          ? 'bg-[#C9A45C] text-[#111111] border-white shadow-[0_0_15px_rgba(201,164,92,1)]'
                          : 'bg-black/90 text-[#E0C37E] border-[#C9A45C]'
                      }`}
                    >
                      <NavIcon className="w-3.5 h-3.5 transform rotate-45" />
                    </div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-black/95 border border-[#C9A45C]/60 text-[10px] text-white whitespace-nowrap shadow-md font-medium pointer-events-none">
                    {hs.label || targetObj?.koreanName || '핫스팟'}
                    <span className="text-[8px] font-mono text-[#C9A45C] block">
                      {hs.yaw}° / {hs.pitch ?? -6}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HOTSPOT LIST & DETAILED ATTRIBUTE FINE-TUNING PANEL           */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-white flex items-center gap-2">
            <span>등록된 연결 핫스팟 목록</span>
            <span className="px-2 py-0.5 rounded-full bg-[#C9A45C]/20 text-[#E0C37E] font-mono text-[10px]">
              {hotspots.length}개 설정됨
            </span>
          </h5>
        </div>

        {hotspots.length === 0 ? (
          <div className="p-5 rounded-xl bg-black/40 border border-dashed border-white/15 text-center text-xs text-white/50 space-y-2">
            <p>현재 등록된 화면 핫스팟이 없습니다.</p>
            <p className="text-[11px] text-white/40">
              상단 3D 파노라마 화면을 회전하여 원하는 출입문/통로를 바라본 후, [+ 새 핫스팟 추가] 또는 화면을 클릭하여 이동 지점을 생성하세요.
            </p>
          </div>
        ) : (
          hotspots.map((hs, idx) => {
            const isSelected = selectedHotspotIdx === idx;
            const targetObj = allSpaces.find((s) => s.id === hs.targetSpaceId);

            return (
              <div
                key={hs.id || idx}
                onClick={() => onSelectHotspot(idx)}
                className={`p-4 rounded-xl border transition-all space-y-3.5 ${
                  isSelected
                    ? 'bg-[#1e1b15] border-[#C9A45C] ring-1 ring-[#C9A45C]'
                    : 'bg-black/40 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#C9A45C] text-[#111111] font-mono font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      연결 핫스팟 #{idx + 1}: {hs.label || targetObj?.koreanName || '이동 지점'}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C9A45C]/20 text-[#E0C37E] font-mono">
                        선택됨 (화면 클릭 시 이 핫스팟 위치 수정)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Look at Hotspot in 3D View */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHotspot(idx);
                        lookAtAngle(hs.yaw, hs.pitch ?? -6);
                        showToast(`3D 시야를 핫스팟 #${idx + 1}(Yaw: ${hs.yaw}°) 방향으로 회전했습니다.`);
                      }}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 transition-colors"
                      title="3D 파노라마 카메라를 이 핫스팟 방향으로 회전합니다"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E0C37E]" />
                      <span>시야 회전</span>
                    </button>

                    {/* Delete Hotspot */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHotspot(idx);
                        showToast('핫스팟이 삭제되었습니다.');
                      }}
                      className="p-1.5 text-red-400 hover:bg-red-500/15 rounded transition-colors"
                      title="이 핫스팟 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Destination and Label Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">
                      이동할 대상 공간 (Target Space)
                    </label>
                    <select
                      value={hs.targetSpaceId}
                      onChange={(e) => {
                        const newTargetId = e.target.value;
                        const found = allSpaces.find((s) => s.id === newTargetId);
                        onUpdateHotspot(idx, {
                          targetSpaceId: newTargetId,
                          label: found ? `${found.koreanName} 이동` : hs.label,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/80 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                    >
                      {otherSpaces.map((s) => (
                        <option key={s.id} value={s.id}>
                          SPACE {s.spaceNumber} • {s.koreanName} ({s.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">
                      화면 표시 문구 (Label)
                    </label>
                    <input
                      type="text"
                      value={hs.label || ''}
                      onChange={(e) => onUpdateHotspot(idx, { label: e.target.value })}
                      placeholder="예: 중앙 거실 & 주방 라운지로 이동"
                      className="w-full px-3 py-1.5 rounded-lg bg-black/80 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                    />
                  </div>
                </div>

                {/* Angle Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Yaw Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/70">수평 시야각 (Yaw / 회전 방향)</span>
                      <span className="font-mono font-bold text-[#E0C37E]">{hs.yaw}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hs.yaw}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdateHotspot(idx, { yaw: val });
                      }}
                      className="w-full accent-[#C9A45C] cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 text-[9px] font-mono">
                      <button
                        type="button"
                        onClick={() => onUpdateHotspot(idx, { yaw: 0 })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70"
                      >
                        0° 정면
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateHotspot(idx, { yaw: 90 })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70"
                      >
                        90° 우측
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateHotspot(idx, { yaw: 180 })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70"
                      >
                        180° 후면
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateHotspot(idx, { yaw: 270 })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70"
                      >
                        270° 좌측
                      </button>
                    </div>
                  </div>

                  {/* Pitch Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/70">수직 각도 (Pitch / 높낮이)</span>
                      <span className="font-mono font-bold text-[#E0C37E]">{hs.pitch ?? -6}°</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={hs.pitch ?? -6}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdateHotspot(idx, { pitch: val });
                      }}
                      className="w-full accent-[#C9A45C] cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 text-[9px] font-mono">
                      <button
                        type="button"
                        onClick={() => onUpdateHotspot(idx, { pitch: 0 })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70"
                      >
                        0° 눈높이
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateHotspot(idx, { pitch: -6 })}
                        className="px-1.5 py-0.5 rounded bg-[#C9A45C]/20 hover:bg-[#C9A45C]/35 text-[#E0C37E]"
                      >
                        -6° 도어/출입문
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateHotspot(idx, { pitch: -15 })}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70"
                      >
                        -15° 바닥방향
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
