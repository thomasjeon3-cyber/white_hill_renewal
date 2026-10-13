import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  X,
  Maximize2,
  Minimize2,
  Compass,
  Navigation as NavIcon,
  Smartphone,
  Upload,
  Sliders,
  Sparkles,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Target,
  Plus,
  Orbit,
} from 'lucide-react';
import { SpaceData, PanoramaHotspot } from '../types/spaces';
import { useContent } from '../context/ContentContext';
import { MiniFloorPlanRadar } from './MiniFloorPlanRadar';

interface Panorama360ViewerProps {
  isOpen: boolean;
  initialSpace: SpaceData;
  onClose: () => void;
}

interface HotspotScreenData {
  id: string;
  space: SpaceData;
  label?: string;
  x: number;
  y: number;
  visible: boolean;
  distance: number;
  yaw: number;
  pitch: number;
}

interface EllipticTransitionState {
  active: boolean;
  startTime: number;
  duration: number;
  fromSpace: SpaceData;
  toSpace: SpaceData;
  hotspotYaw: number;
  hotspotPitch: number;
  startLon: number;
  startLat: number;
  startFov: number;
  targetFov: number;
  hasSwappedTexture: boolean;
}

export const Panorama360Viewer: React.FC<Panorama360ViewerProps> = ({
  isOpen,
  initialSpace,
  onClose,
}) => {
  const {
    content,
    updatePanoramaImage,
    updateSpaceItem,
    isAdminMode,
    setIsAdminModalOpen,
    setActiveAdminTab,
  } = useContent();

  const [currentSpaceId, setCurrentSpaceId] = useState<string>(initialSpace?.id || 'lounge');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [fov, setFov] = useState(75);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [hotspotsOnScreen, setHotspotsOnScreen] = useState<HotspotScreenData[]>([]);

  // Elliptic + Zoom Transition States
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitioningToSpace, setTransitioningToSpace] = useState<SpaceData | null>(null);
  const [transitionProgress, setTransitionProgress] = useState(0);

  // Live Camera Orientation for Floor Plan Radar
  const [liveLon, setLiveLon] = useState<number>(0);
  const lastReportedLonRef = useRef<number>(0);

  // In-Viewer Hotspot Quick Creator (Admin)
  const [isQuickHotspotModalOpen, setIsQuickHotspotModalOpen] = useState(false);
  const [quickTargetSpaceId, setQuickTargetSpaceId] = useState<string>('');
  const [quickHotspotLabel, setQuickHotspotLabel] = useState<string>('');

  // Horizontal Scroll & Navigation state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const inViewerFileInputRef = useRef<HTMLInputElement>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereMeshRef = useRef<THREE.Mesh | null>(null);
  const transitionSphereMeshRef = useRef<THREE.Mesh | null>(null);
  const cadGroupRef = useRef<THREE.Group | null>(null);
  const currentTextureRef = useRef<THREE.Texture | null>(null);
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);
  const textureCacheRef = useRef<Map<string, THREE.Texture>>(new Map());

  // Elliptic + Zoom Transition Refs
  const isTransitioningRef = useRef(false);
  const transitionStateRef = useRef<EllipticTransitionState | null>(null);

  // Camera orientation & Physics Refs
  const lonRef = useRef(0); // Horizontal degrees (yaw)
  const latRef = useRef(0); // Vertical degrees (pitch)
  const targetLonRef = useRef(0);
  const targetLatRef = useRef(0);
  const fovRef = useRef(75);

  // Auto-rotation & Gyro Refs
  const isAutoRotatingRef = useRef(true);
  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  const gyroActiveRef = useRef(false);
  useEffect(() => {
    gyroActiveRef.current = gyroActive;
  }, [gyroActive]);

  // Interaction State Refs
  const isUserInteractingRef = useRef(false);
  const onPointerDownPointerXRef = useRef(0);
  const onPointerDownPointerYRef = useRef(0);
  const onPointerDownLonRef = useRef(0);
  const onPointerDownLatRef = useRef(0);
  const touchStartDistRef = useRef(0);

  // Dirty flag for battery-saving on-demand render
  const isDirtyRef = useRef(true);
  const idleFramesRef = useRef(0);

  // Current spaces list and current space from live context
  const spaces = content.spaces?.items || [];
  const currentSpace =
    spaces.find((s) => s.id === currentSpaceId) ||
    spaces[0] ||
    initialSpace;
  const currentSpaceIndex = spaces.findIndex((s) => s.id === currentSpace?.id);

  // Keep ref to current space for stable Three.js renderLoop access
  const currentSpaceRef = useRef(currentSpace);
  useEffect(() => {
    currentSpaceRef.current = currentSpace;
  }, [currentSpace]);

  const showToast = (msg: string) => {
    setUploadToast(msg);
    setTimeout(() => setUploadToast(null), 2500);
  };


  // Sync initial space when opened
  useEffect(() => {
    if (isOpen && initialSpace) {
      setCurrentSpaceId(initialSpace.id);
      lonRef.current = 0;
      latRef.current = 0;
      targetLonRef.current = 0;
      targetLatRef.current = 0;
      fovRef.current = 75;
      setFov(75);
      isDirtyRef.current = true;
    }
  }, [isOpen, initialSpace]);

  // Request render trigger
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    idleFramesRef.current = 0;
  }, []);

  // Check horizontal scroll limits for the bottom space carousel
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [spaces.length, checkScroll]);

  // When currentSpaceId changes, scroll its button into center view smoothly
  useEffect(() => {
    if (!isOpen) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const btn = el.querySelector(`[data-space-id="${currentSpaceId}"]`) as HTMLElement;
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    checkScroll();
  }, [currentSpaceId, isOpen, checkScroll]);

  const scrollSpaces = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -260 : 260;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 320);
  };

  const handlePrevSpace = () => {
    if (spaces.length === 0) return;
    const prevIdx = (currentSpaceIndex - 1 + spaces.length) % spaces.length;
    handleNavigateToSpace(spaces[prevIdx]);
  };

  const handleNextSpace = () => {
    if (spaces.length === 0) return;
    const nextIdx = (currentSpaceIndex + 1) % spaces.length;
    handleNavigateToSpace(spaces[nextIdx]);
  };

  // Sync FOV ref with state without re-running setup effects
  const updateFov = useCallback((newFov: number) => {
    const clamped = Math.max(35, Math.min(105, newFov));
    fovRef.current = clamped;
    setFov(clamped);
    if (cameraRef.current) {
      cameraRef.current.fov = clamped;
      cameraRef.current.updateProjectionMatrix();
    }
    markDirty();
  }, [markDirty]);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Mobile Gyroscope with DeviceOrientation and compass heading
  const toggleGyroscope = async () => {
    if (gyroActive) {
      setGyroActive(false);
      return;
    }

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      // @ts-expect-error iOS 13+ permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          // @ts-expect-error iOS 13+ permission
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') {
            setGyroActive(true);
            markDirty();
          }
        } catch {
          // permission denied
        }
      } else {
        setGyroActive(true);
        markDirty();
      }
    }
  };

  useEffect(() => {
    if (!gyroActive) return;

    let baseAlpha: number | null = null;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null) {
        if (baseAlpha === null) {
          baseAlpha = e.alpha;
        }
        // Calculate orientation offset with screen orientation handling
        const screenAngle = typeof window !== 'undefined' && window.screen?.orientation
          ? window.screen.orientation.angle
          : Number(window.orientation || 0);

        let adjustedAlpha = e.alpha - baseAlpha;
        if (screenAngle === 90) adjustedAlpha += 90;
        else if (screenAngle === -90 || screenAngle === 270) adjustedAlpha -= 90;

        targetLonRef.current = -adjustedAlpha;
        targetLatRef.current = Math.max(-85, Math.min(85, (e.beta - 90)));
        markDirty();
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroActive, markDirty]);

  // -------------------------------------------------------------
  // THREE.JS INITIALIZATION & SCENE SETUP
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const mount = canvasMountRef.current;
    if (!mount) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
    const camera = new THREE.PerspectiveCamera(fovRef.current, aspect, 1, 1100);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and high pixel ratio
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Equirectangular Sphere Mesh (Inside-out spherical mapping)
    // Radius 500, with scale(-1, 1, 1) so the texture is viewed from the center
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 1 });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereMeshRef.current = sphere;

    // 4b. Secondary Transition Sphere Mesh (Used for crossfading during Elliptic + Zoom transitions)
    const transGeometry = new THREE.SphereGeometry(498, 64, 40);
    transGeometry.scale(-1, 1, 1);
    const transMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0,
    });
    const transSphere = new THREE.Mesh(transGeometry, transMaterial);
    transSphere.visible = false;
    scene.add(transSphere);
    transitionSphereMeshRef.current = transSphere;

    // 5. Procedural 3D CAD Wireframe Ambience Group (Displayed when no panorama photo exists)
    const cadGroup = new THREE.Group();
    // Latitudinal Rings
    for (let p = -60; p <= 60; p += 20) {
      const ringRadius = 490 * Math.cos((p * Math.PI) / 180);
      const ringY = 490 * Math.sin((p * Math.PI) / 180);
      const ringGeo = new THREE.RingGeometry(ringRadius - 0.5, ringRadius + 0.5, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xC9A45C,
        opacity: p === 0 ? 0.35 : 0.08,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = ringY;
      cadGroup.add(ringMesh);
    }

    // Grid Lines on Ground Plane
    const gridHelper = new THREE.GridHelper(900, 36, 0xC9A45C, 0x333333);
    gridHelper.position.y = -200;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    cadGroup.add(gridHelper);

    // Ceiling Subtle Grid
    const ceilingGrid = new THREE.GridHelper(900, 36, 0x444444, 0x222222);
    ceilingGrid.position.y = 200;
    (ceilingGrid.material as THREE.Material).transparent = true;
    (ceilingGrid.material as THREE.Material).opacity = 0.15;
    cadGroup.add(ceilingGrid);

    scene.add(cadGroup);
    cadGroupRef.current = cadGroup;

    // 6. Texture Loader
    textureLoaderRef.current = new THREE.TextureLoader();

    // 7. Window Resize Handler
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

    // 8. Main Render & Damping Animation Loop
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      // Check if Elliptic + Zoom transition is currently active
      const trans = transitionStateRef.current;
      let isMoving = false;
      let autoRotateActive = false;

      if (trans && trans.active) {
        const elapsed = performance.now() - trans.startTime;
        const rawP = Math.min(1, Math.max(0, elapsed / trans.duration));

        setTransitionProgress(rawP);

        // 1. Camera orientation interpolation towards hotspot direction
        const lonDelta = ((((trans.hotspotYaw - trans.startLon) % 360) + 540) % 360) - 180;
        const latDelta = trans.hotspotPitch - trans.startLat;

        const alignP = Math.min(1, rawP / 0.45);
        const alignEase = 0.5 - 0.5 * Math.cos(alignP * Math.PI);
        lonRef.current = trans.startLon + lonDelta * alignEase;
        latRef.current = trans.startLat + latDelta * alignEase;
        targetLonRef.current = lonRef.current;
        targetLatRef.current = latRef.current;

        // 2. 3D Elliptic Spatial Trajectory
        const phi = THREE.MathUtils.degToRad(90 - trans.hotspotPitch);
        const theta = THREE.MathUtils.degToRad(trans.hotspotYaw);
        const dirX = Math.sin(phi) * Math.cos(theta);
        const dirY = Math.cos(phi);
        const dirZ = Math.sin(phi) * Math.sin(theta);
        const hotspotDir = new THREE.Vector3(dirX, dirY, dirZ).normalize();

        // Forward surge along elliptical curve: advances deep toward doorway, then glides back to 0
        const maxDistance = 330;
        const forwardDist = maxDistance * Math.sin(rawP * Math.PI);

        // Vertical/transverse elliptic arc height
        const maxArcHeight = 36;
        const arcHeight = maxArcHeight * Math.sin(rawP * Math.PI);

        if (cameraRef.current) {
          cameraRef.current.position.set(
            hotspotDir.x * forwardDist,
            hotspotDir.y * forwardDist + arcHeight,
            hotspotDir.z * forwardDist
          );
        }

        // 3. Dynamic Zoom (FOV Compression & Expansion)
        const zoomFactor = Math.pow(Math.sin(rawP * Math.PI), 1.35);
        const currentFovVal = trans.startFov - (trans.startFov - trans.targetFov) * zoomFactor;
        if (cameraRef.current) {
          cameraRef.current.fov = currentFovVal;
          cameraRef.current.updateProjectionMatrix();
        }

        // 4. Cross-fade Sphere Materials at Transition Midpoint
        if (sphereMeshRef.current && transitionSphereMeshRef.current) {
          const curMat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
          const nextMat = transitionSphereMeshRef.current.material as THREE.MeshBasicMaterial;

          if (rawP < 0.40) {
            curMat.opacity = 1;
            nextMat.opacity = 0;
          } else if (rawP > 0.65) {
            curMat.opacity = 0;
            nextMat.opacity = 1;
          } else {
            const blend = (rawP - 0.40) / 0.25;
            const smoothBlend = 0.5 - 0.5 * Math.cos(blend * Math.PI);
            curMat.opacity = 1 - smoothBlend;
            nextMat.opacity = smoothBlend;
          }
        }

        // CAD group crossfade
        if (cadGroupRef.current) {
          if (!trans.fromSpace.panoramaUrl && trans.toSpace.panoramaUrl) {
            cadGroupRef.current.visible = rawP < 0.55;
          } else if (trans.fromSpace.panoramaUrl && !trans.toSpace.panoramaUrl) {
            cadGroupRef.current.visible = rawP >= 0.45;
          } else if (!trans.fromSpace.panoramaUrl && !trans.toSpace.panoramaUrl) {
            cadGroupRef.current.visible = true;
          } else {
            cadGroupRef.current.visible = false;
          }
        }

        // 5. Completion (p >= 1.0)
        if (rawP >= 1.0) {
          trans.active = false;
          transitionStateRef.current = null;
          isTransitioningRef.current = false;

          // Reset camera position to center
          if (cameraRef.current) {
            cameraRef.current.position.set(0, 0, 0);
            cameraRef.current.fov = trans.startFov;
            cameraRef.current.updateProjectionMatrix();
          }

          // Transfer texture to primary sphere
          if (sphereMeshRef.current && transitionSphereMeshRef.current) {
            const curMat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
            const nextMat = transitionSphereMeshRef.current.material as THREE.MeshBasicMaterial;
            curMat.map = nextMat.map;
            curMat.color.copy(nextMat.color);
            curMat.opacity = 1;
            curMat.needsUpdate = true;

            nextMat.opacity = 0;
            transitionSphereMeshRef.current.visible = false;
          }

          setIsTransitioning(false);
          setTransitioningToSpace(null);
          setTransitionProgress(0);
          setCurrentSpaceId(trans.toSpace.id);

          showToast(`'${trans.toSpace.koreanName}' 공간으로 이동했습니다.`);
          markDirty();
        } else {
          isDirtyRef.current = true;
        }
      } else {
        // Auto slow rotation when user is not interacting and gyroscope is not active
        autoRotateActive =
          isAutoRotatingRef.current &&
          !isUserInteractingRef.current &&
          !gyroActiveRef.current;

        if (autoRotateActive) {
          // Slow, elegant ambient rotation speed (~0.035 deg per frame)
          targetLonRef.current += 0.035;
          isDirtyRef.current = true;
        }

        // Smooth camera interpolation (Damping)
        latRef.current = Math.max(-85, Math.min(85, latRef.current));
        const lonDiff = targetLonRef.current - lonRef.current;
        const latDiff = targetLatRef.current - latRef.current;

        isMoving = Math.abs(lonDiff) > 0.001 || Math.abs(latDiff) > 0.001;

        if (isMoving) {
          lonRef.current += lonDiff * 0.12;
          latRef.current += latDiff * 0.12;
          markDirty();
        }
      }

      // Update camera view vector with prospective lookAt offset
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      const targetX = 500 * Math.sin(phi) * Math.cos(theta);
      const targetY = 500 * Math.cos(phi);
      const targetZ = 500 * Math.sin(phi) * Math.sin(theta);

      if (cameraRef.current) {
        const camPos = cameraRef.current.position;
        cameraRef.current.lookAt(
          camPos.x + targetX,
          camPos.y + targetY,
          camPos.z + targetZ
        );
      }

      // Update liveLon for Floor Plan Radar (throttled to avoid redundant renders)
      const curLonVal = lonRef.current;
      if (Math.abs(curLonVal - lastReportedLonRef.current) > 0.25) {
        lastReportedLonRef.current = curLonVal;
        setLiveLon(curLonVal);
      }

      // Project Hotspots to Screen Coordinates (hide while transitioning)
      if (isTransitioningRef.current) {
        setHotspotsOnScreen([]);
      } else if (mount && cameraRef.current) {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        
        // Retrieve custom panoramaHotspots or fallback to connectedSpaceIds
        const activeSp = currentSpaceRef.current;
        const rawHotspots = activeSp?.panoramaHotspots;
        let activeHotspotItems: {
          id: string;
          targetSpace: SpaceData;
          label?: string;
          yaw: number;
          pitch: number;
        }[] = [];

        if (Array.isArray(rawHotspots) && rawHotspots.length > 0) {
          rawHotspots.forEach((hs, idx) => {
            const target = (content.spaces?.items || []).find((s) => s.id === hs.targetSpaceId);
            if (target) {
              activeHotspotItems.push({
                id: hs.id || `hs-${idx}-${target.id}`,
                targetSpace: target as SpaceData,
                label: hs.label || `${target.koreanName} 이동`,
                yaw: hs.yaw,
                pitch: hs.pitch ?? -6,
              });
            }
          });
        }

        // Fallback: If no custom hotspots configured, derive from connectedSpaceIds or next space
        if (activeHotspotItems.length === 0) {
          const connectedIds = Array.isArray(activeSp?.connectedSpaceIds) && activeSp.connectedSpaceIds.length > 0
            ? activeSp.connectedSpaceIds
            : [];
          let connected = (content.spaces?.items || []).filter((s) =>
            connectedIds.includes(s.id)
          );

          if (connected.length === 0 && (content.spaces?.items || []).length > 1) {
            const allSpaces = content.spaces.items;
            const curIdx = allSpaces.findIndex((s) => s.id === activeSp?.id);
            const nextSpace = allSpaces[(curIdx + 1) % allSpaces.length];
            if (nextSpace && nextSpace.id !== activeSp?.id) {
              connected = [nextSpace as SpaceData];
            }
          }

          activeHotspotItems = connected.map((targetSpace, idx) => ({
            id: `fallback-hs-${targetSpace.id}`,
            targetSpace: targetSpace as SpaceData,
            label: `${targetSpace.koreanName} 이동`,
            yaw: (idx / Math.max(1, connected.length)) * 360 - 30,
            pitch: -6,
          }));
        }

        if (activeHotspotItems.length > 0) {
          const screenHotspots: HotspotScreenData[] = activeHotspotItems.map((hs) => {
            const spotLon = hs.yaw;
            const spotLat = hs.pitch;
            const sPhi = THREE.MathUtils.degToRad(90 - spotLat);
            const sTheta = THREE.MathUtils.degToRad(spotLon);

            const spotPos = new THREE.Vector3(
              500 * Math.sin(sPhi) * Math.cos(sTheta),
              500 * Math.cos(sPhi),
              500 * Math.sin(sPhi) * Math.sin(sTheta)
            );

            // Project 3D coordinate to normalized screen space [-1, 1]
            const projected = spotPos.clone().project(cameraRef.current!);
            const isFront = projected.z < 1; // within forward hemisphere
            const screenX = (projected.x * 0.5 + 0.5) * w;
            const screenY = (-projected.y * 0.5 + 0.5) * h;

            return {
              id: hs.id,
              space: hs.targetSpace,
              label: hs.label,
              x: screenX,
              y: screenY,
              visible: isFront && screenX >= 20 && screenX <= w - 20 && screenY >= 40 && screenY <= h - 40,
              distance: spotPos.distanceTo(cameraRef.current!.position),
              yaw: hs.yaw,
              pitch: hs.pitch,
            };
          });

          setHotspotsOnScreen(screenHotspots);
        } else {
          setHotspotsOnScreen([]);
        }
      }

      // Battery-saving: Render when dirty, moving, auto-rotating, transitioning, or settling
      const inTransition = isTransitioningRef.current;
      const shouldRender =
        isDirtyRef.current ||
        inTransition ||
        isMoving ||
        autoRotateActive ||
        idleFramesRef.current < 5;

      if (shouldRender) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        if (!isMoving && !autoRotateActive && !inTransition) {
          idleFramesRef.current += 1;
          if (idleFramesRef.current >= 5) {
            isDirtyRef.current = false;
          }
        } else {
          idleFramesRef.current = 0;
        }
      }
    };

    animId = requestAnimationFrame(renderLoop);
    markDirty();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (currentTextureRef.current) {
        currentTextureRef.current.dispose();
      }
    };
  }, [isOpen, markDirty]);

  // Texture preloader and cache helper
  const preloadTexture = useCallback((url: string): Promise<THREE.Texture> => {
    return new Promise((resolve, reject) => {
      if (textureCacheRef.current.has(url)) {
        resolve(textureCacheRef.current.get(url)!);
        return;
      }
      const loader = textureLoaderRef.current || new THREE.TextureLoader();
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          textureCacheRef.current.set(url, tex);
          resolve(tex);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }, []);

  // Preload all space panoramas into GPU texture cache when modal is open
  useEffect(() => {
    if (!isOpen) {
      // Clear textures when modal is fully closed
      textureCacheRef.current.forEach((tex) => tex.dispose());
      textureCacheRef.current.clear();
      transitionStateRef.current = null;
      isTransitioningRef.current = false;
      setIsTransitioning(false);
      return;
    }
    spaces.forEach((s) => {
      if (s.panoramaUrl) {
        preloadTexture(s.panoramaUrl).catch(() => {});
      }
    });
  }, [isOpen, spaces, preloadTexture]);

  // -------------------------------------------------------------
  // DYNAMIC TEXTURE & ASSET PRELOADING (Equirectangular 360 Photo)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    const panoUrl = currentSpace?.panoramaUrl;

    if (!panoUrl) {
      // Switch to CAD Simulator visual mode
      if (sphereMeshRef.current) {
        (sphereMeshRef.current.material as THREE.MeshBasicMaterial).map = null;
        (sphereMeshRef.current.material as THREE.MeshBasicMaterial).color = new THREE.Color(0x0c0b0a);
        (sphereMeshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
      if (cadGroupRef.current) {
        cadGroupRef.current.visible = true;
      }
      setIsLoadingImage(false);
      markDirty();
      return;
    }

    // If texture is already cached in memory, apply instantly without loading screen
    if (textureCacheRef.current.has(panoUrl)) {
      const cachedTexture = textureCacheRef.current.get(panoUrl)!;
      currentTextureRef.current = cachedTexture;
      if (sphereMeshRef.current) {
        const mat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.map = cachedTexture;
        mat.color = new THREE.Color(0xffffff);
        mat.needsUpdate = true;
      }
      if (cadGroupRef.current) {
        cadGroupRef.current.visible = false;
      }
      setIsLoadingImage(false);
      markDirty();
      return;
    }

    setIsLoadingImage(true);

    preloadTexture(panoUrl)
      .then((texture) => {
        currentTextureRef.current = texture;
        if (sphereMeshRef.current) {
          const mat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
          mat.map = texture;
          mat.color = new THREE.Color(0xffffff);
          mat.needsUpdate = true;
        }

        if (cadGroupRef.current) {
          cadGroupRef.current.visible = false;
        }

        setIsLoadingImage(false);
        markDirty();
      })
      .catch((err) => {
        console.warn('Failed to load equirectangular panorama texture:', err);
        setIsLoadingImage(false);
        if (cadGroupRef.current) cadGroupRef.current.visible = true;
        markDirty();
      });
  }, [isOpen, currentSpace?.panoramaUrl, markDirty, preloadTexture]);

  // -------------------------------------------------------------
  // MOUSE & TOUCH EVENT HANDLERS (with touch-action & pinch-to-zoom)
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTransitioningRef.current) return;
    // Only drag with primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isUserInteractingRef.current = true;
    onPointerDownPointerXRef.current = e.clientX;
    onPointerDownPointerYRef.current = e.clientY;
    onPointerDownLonRef.current = lonRef.current;
    onPointerDownLatRef.current = latRef.current;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTransitioningRef.current || !isUserInteractingRef.current) return;
    const deltaX = e.clientX - onPointerDownPointerXRef.current;
    const deltaY = e.clientY - onPointerDownPointerYRef.current;

    // Scale rotation speed based on current FOV
    const factor = (fovRef.current / 75) * 0.15;
    targetLonRef.current = onPointerDownLonRef.current - deltaX * factor;
    targetLatRef.current = Math.max(
      -85,
      Math.min(85, onPointerDownLatRef.current + deltaY * factor)
    );
    markDirty();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isUserInteractingRef.current = false;
    targetLonRef.current = lonRef.current;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (isTransitioningRef.current) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 4 : -4;
    updateFov(fovRef.current + delta);
  };

  // Mobile Multi-touch (Pinch to Zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioningRef.current) return;
    if (e.touches.length === 2) {
      isUserInteractingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isTransitioningRef.current) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const diff = touchStartDistRef.current - currentDist;

      if (Math.abs(diff) > 2) {
        updateFov(fovRef.current + diff * 0.08);
        touchStartDistRef.current = currentDist;
      }
    }
  };

  // Start Elliptic + Zoom Cinematic Camera Transition
  const startEllipticZoomTransition = useCallback(
    (targetSpace: SpaceData, hotspotYaw: number, hotspotPitch: number) => {
      if (isTransitioningRef.current || !isOpen) return;

      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setTransitioningToSpace(targetSpace);
      setTransitionProgress(0);

      // Prepare secondary sphere mesh for seamless crossfade
      const transSphere = transitionSphereMeshRef.current;
      if (transSphere) {
        const nextMat = transSphere.material as THREE.MeshBasicMaterial;
        if (targetSpace.panoramaUrl) {
          if (textureCacheRef.current.has(targetSpace.panoramaUrl)) {
            nextMat.map = textureCacheRef.current.get(targetSpace.panoramaUrl)!;
            nextMat.color = new THREE.Color(0xffffff);
            nextMat.needsUpdate = true;
          } else {
            preloadTexture(targetSpace.panoramaUrl)
              .then((tex) => {
                if (transSphere) {
                  nextMat.map = tex;
                  nextMat.color = new THREE.Color(0xffffff);
                  nextMat.needsUpdate = true;
                  markDirty();
                }
              })
              .catch(() => {});
          }
        } else {
          nextMat.map = null;
          nextMat.color = new THREE.Color(0x0c0b0a);
          nextMat.needsUpdate = true;
        }
        nextMat.opacity = 0;
        transSphere.visible = true;
      }

      const curLon = lonRef.current;
      const curLat = latRef.current;
      const curFov = fovRef.current;

      transitionStateRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 1100, // 1.1s for a luxurious, cinematic feel
        fromSpace: currentSpace,
        toSpace: targetSpace,
        hotspotYaw,
        hotspotPitch,
        startLon: curLon,
        startLat: curLat,
        startFov: curFov,
        targetFov: Math.max(34, curFov - 38), // deep focal zoom into portal
        hasSwappedTexture: false,
      };

      markDirty();
    },
    [isOpen, currentSpace, markDirty, preloadTexture]
  );

  // Navigate to connected room (Interactive Hotspot Teleport with Elliptic + Zoom Transition)
  const handleNavigateToSpace = (targetSpace: SpaceData, hotspotYaw?: number, hotspotPitch?: number) => {
    if (isTransitioningRef.current || !isOpen || targetSpace.id === currentSpaceId) return;

    let finalYaw = hotspotYaw;
    let finalPitch = hotspotPitch ?? -6;

    if (finalYaw === undefined) {
      // Find configured hotspot leading to target space
      const foundHs = currentSpace.panoramaHotspots?.find((h) => h.targetSpaceId === targetSpace.id);
      if (foundHs) {
        finalYaw = foundHs.yaw;
        finalPitch = foundHs.pitch ?? -6;
      } else {
        // Derive approximate heading from floor plan relative coordinates
        const fx = currentSpace.floorplan?.x ?? 50;
        const fy = currentSpace.floorplan?.y ?? 50;
        const tx = targetSpace.floorplan?.x ?? 50;
        const ty = targetSpace.floorplan?.y ?? 50;
        const dx = tx - fx;
        const dy = ty - fy;
        if (Math.hypot(dx, dy) > 2) {
          const rad = Math.atan2(dy, dx);
          finalYaw = ((rad * 180) / Math.PI + 90 + 360) % 360;
          finalPitch = -6;
        } else {
          finalYaw = lonRef.current;
          finalPitch = latRef.current;
        }
      }
    }

    startEllipticZoomTransition(targetSpace, finalYaw, finalPitch);
  };

  // In-Viewer Direct Panorama Upload for Admin
  const handleDirectPanoramaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast('360° 고해상도 파노라마 사진을 저장소에 등록 중입니다...');
        await updatePanoramaImage(currentSpace.id, file);
        showToast(`'${currentSpace.koreanName}' 360° 사진이 등록되었습니다!`);
        if (e.target) e.target.value = '';
      } catch (err) {
        console.error('Direct panorama upload failed:', err);
        showToast('파노라마 등록에 실패했습니다.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      id="panorama-360-modal"
      className="fixed inset-0 z-50 bg-[#080808] flex flex-col justify-between select-none animate-fadeIn overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Top Header Controls Bar */}
      <header className="relative z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/95 via-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C9A45C]/20 border border-[#C9A45C]/40 flex items-center justify-center">
            <Compass className="w-4 h-4 text-[#C9A45C] animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#C9A45C] font-semibold">
                SPACE {currentSpace.spaceNumber}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                currentSpace.panoramaUrl
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/10 text-white/70'
              }`}>
                {currentSpace.panoramaUrl ? 'REAL 360° EQUIRECTANGULAR VR' : '360° CAD SIMULATOR'}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-serif-display font-medium text-[#F5F2EA]">
              {currentSpace.koreanName}
              <span className="text-white/50 text-xs ml-2 font-normal hidden sm:inline">
                ({currentSpace.name})
              </span>
            </h2>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          {/* Admin Hotspot & Upload Tools */}
          {isAdminMode && (
            <div className="flex items-center gap-1.5 mr-2">
              <input
                type="file"
                ref={inViewerFileInputRef}
                accept="image/*"
                onChange={handleDirectPanoramaUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inViewerFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] font-bold text-xs transition-colors shadow-md cursor-pointer"
                title="현재 공간에 360 파노라마 이미지 즉시 업로드"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">360° 사진 등록</span>
              </button>

              {/* Admin Hotspot Studio Navigation */}
              <button
                type="button"
                onClick={() => {
                  setActiveAdminTab('panorama');
                  setIsAdminModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 border border-[#C9A45C]/60 text-[#E0C37E] hover:bg-black/90 transition-colors shadow-sm cursor-pointer"
                title="360° 화면 내 핫스팟 연결 지점 관리자 설정 열기"
              >
                <Target className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span className="hidden md:inline text-xs font-medium">핫스팟 설정</span>
              </button>

              {/* Quick Add Hotspot at Current View Angle */}
              <button
                type="button"
                onClick={() => {
                  const otherSpaces = (content.spaces?.items || []).filter((s) => s.id !== currentSpace.id);
                  const candidate = otherSpaces[0];
                  setQuickTargetSpaceId(candidate?.id || '');
                  setQuickHotspotLabel(candidate ? `${candidate.koreanName} 이동` : '');
                  setIsQuickHotspotModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#C9A45C]/20 hover:bg-[#C9A45C]/35 border border-[#C9A45C]/50 text-[#E0C37E] text-xs transition-colors cursor-pointer"
                title={`현재 시야각(Yaw: ${Math.round(((liveLon % 360) + 360) % 360)}°)에 핫스팟 추가`}
              >
                <Plus className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span className="hidden lg:inline text-xs font-mono">시야각 핫스팟 등록</span>
              </button>
            </div>
          )}

          {/* Gyroscope toggle */}
          <button
            onClick={toggleGyroscope}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              gyroActive
                ? 'bg-[#C9A45C] text-[#111111] border-[#C9A45C]'
                : 'bg-black/60 text-white/70 border-white/10 hover:text-white'
            }`}
            title="자이로스코프 센서 회전"
            aria-label="Toggle gyroscope"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Auto Rotation toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              isAutoRotating
                ? 'bg-[#C9A45C] text-[#111111] border-[#C9A45C] shadow-[0_0_10px_rgba(201,164,92,0.4)]'
                : 'bg-black/60 text-white/70 border-white/10 hover:text-white'
            }`}
            title={isAutoRotating ? '자동 느린 회전 일시정지' : '자동 느린 회전 시작'}
            aria-label="Toggle auto rotation"
          >
            {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-xs font-mono font-semibold hidden md:inline">
              {isAutoRotating ? 'AUTO ROTATE' : 'ROTATION PAUSED'}
            </span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-black/60 border border-white/10 text-white/70 hover:text-white transition-colors"
            title="전체 화면"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
            title="닫기"
            aria-label="Close 360 viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main 360 Stage Mount */}
      <div
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{ touchAction: 'none' }}
      >
        {/* Three.js Canvas Container */}
        <div ref={canvasMountRef} className="w-full h-full block" />

        {/* Loading Spinner for High-Res Panorama Asset */}
        {isLoadingImage && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-[#C9A45C]/30 border-t-[#C9A45C] animate-spin mb-3" />
            <p className="font-mono text-xs text-[#E0C37E] tracking-widest uppercase animate-pulse">
              LOADING 360° EQUIRECTANGULAR ASSET...
            </p>
          </div>
        )}

        {/* Real Clickable 3D Hotspot Overlays - No hover rollover actions per user request */}
        {hotspotsOnScreen.map((hotspot) => {
          if (!hotspot.visible) return null;

          return (
            <button
              key={hotspot.id}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToSpace(hotspot.space, hotspot.yaw, hotspot.pitch);
              }}
              style={{
                transform: `translate3d(${hotspot.x}px, ${hotspot.y}px, 0) translate(-50%, -50%)`,
              }}
              className={`absolute top-0 left-0 z-30 cursor-pointer pointer-events-auto select-none transition-opacity duration-300 ${
                isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              title={`${hotspot.space.koreanName} 공간으로 이동`}
            >
              {/* Outer Ring & Center Icon - Pure stable display without rollover effects */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full bg-[#C9A45C]/20 animate-ping" />
                <div className="w-9 h-9 rounded-full bg-black/90 border-2 border-[#C9A45C] shadow-[0_0_12px_rgba(201,164,92,0.7)] flex items-center justify-center text-[#E0C37E]">
                  <NavIcon className="w-4 h-4 transform rotate-45" />
                </div>
              </div>

              {/* Space Name Tooltip Card - Stable label */}
              <div className="mt-1.5 px-2.5 py-1 rounded-md bg-black/90 backdrop-blur-md border border-[#C9A45C]/50 shadow-xl whitespace-nowrap text-center">
                <div className="text-xs text-white font-serif-display font-medium">
                  {hotspot.label || hotspot.space.koreanName}
                </div>
                <div className="text-xs font-mono text-[#C9A45C] font-semibold tracking-wider">
                  이동하기 ➔
                </div>
              </div>
            </button>
          );
        })}

        {/* Elliptic + Zoom Visual Transition Overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden">
            {/* 1. Dynamic Elliptic Vignette Mask */}
            <div
              className="absolute inset-0 transition-opacity duration-150"
              style={{
                background: 'radial-gradient(ellipse 68% 56% at 50% 50%, rgba(0,0,0,0) 0%, rgba(8,8,8,0.35) 50%, rgba(8,8,8,0.88) 100%)',
                opacity: Math.sin(transitionProgress * Math.PI),
              }}
            />

            {/* 2. Expanding Elliptic Warp Wave Portal Ring */}
            <div
              className="absolute rounded-full border border-[#C9A45C]/70 transition-transform"
              style={{
                width: '190px',
                height: '115px',
                transform: `scale(${1 + Math.sin(transitionProgress * Math.PI) * 4.2}) rotate(${transitionProgress * 40}deg)`,
                opacity: Math.pow(Math.sin(transitionProgress * Math.PI), 1.2) * 0.75,
                boxShadow: '0 0 35px rgba(201,164,92,0.6), inset 0 0 25px rgba(201,164,92,0.4)',
              }}
            />

            {/* 3. Secondary Outer Ellipse */}
            <div
              className="absolute rounded-full border border-white/40 transition-transform"
              style={{
                width: '270px',
                height: '165px',
                transform: `scale(${0.6 + Math.sin(transitionProgress * Math.PI) * 5.0})`,
                opacity: Math.pow(Math.sin(transitionProgress * Math.PI), 1.5) * 0.45,
              }}
            />

            {/* 4. Center Destination Indicator */}
            {transitioningToSpace && (
              <div
                className="relative z-50 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-[#C9A45C]/60 shadow-[0_0_20px_rgba(201,164,92,0.4)] flex items-center gap-2 text-white transition-all duration-200"
                style={{
                  opacity: Math.sin(transitionProgress * Math.PI),
                  transform: `scale(${0.95 + Math.sin(transitionProgress * Math.PI) * 0.08})`,
                }}
              >
                <div className="w-2 h-2 rounded-full bg-[#C9A45C] animate-ping" />
                <span className="text-xs font-serif-display font-medium tracking-wide">
                  {transitioningToSpace.koreanName}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Center Guide Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
          <div className="w-6 h-6 border border-white/40 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-[#C9A45C] rounded-full" />
          </div>
        </div>

        {/* Top Centered Guidance Pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-[#C9A45C]/30 text-center shadow-lg">
          <p className="text-xs font-mono text-[#E0C37E] tracking-wider">
            [ 360° 화면 드래그로 회전 • 휠 스크롤/핀치로 확대·축소 ]
          </p>
        </div>

        {/* Status Notice for Pre-Remodeling CAD Simulator */}
        {!currentSpace.panoramaUrl && (
          <div className="absolute bottom-24 left-4 sm:left-6 pointer-events-none max-w-xs w-full text-left z-20 hidden lg:block">
            <div className="p-3 rounded-xl bg-black/85 backdrop-blur-md border border-[#C9A45C]/40 shadow-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#C9A45C] font-semibold font-serif-display">
                <span>360° 파노라마 뷰어 가동 중</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                현재 360° 구면 파노라마 엔진이 가동 중입니다.
                {isAdminMode ? (
                  <span className="text-[#E0C37E] block font-medium mt-0.5">
                    상단 [360° 사진 등록] 또는 [핫스팟 설정]을 이용하실 수 있습니다.
                  </span>
                ) : (
                  <span className="block mt-0.5">
                    리모델링 완공 후 촬영된 360° 실사 파노라마 사진이 등록되면 실사 공간으로 자동 전환됩니다.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* 2F Architectural Floor Plan with Rotating Radar Vision Cone */}
        <MiniFloorPlanRadar
          spaces={spaces}
          currentSpace={currentSpace}
          cameraLon={liveLon}
          cameraFov={fov}
          onSelectSpace={handleNavigateToSpace}
          floorPlanImageUrl={content.floorplan.imageUrl}
        />

        {/* Toast Alert */}
        {uploadToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#C9A45C] text-[#111111] px-4 py-2 rounded-lg font-bold text-xs shadow-2xl flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4" />
            <span>{uploadToast}</span>
          </div>
        )}
      </div>

      {/* Bottom Space Navigation Bar with Visible Horizontal Scrollbar and Quick Stepper */}
      <footer className="relative z-30 px-3 sm:px-6 py-3 bg-gradient-to-t from-black/95 via-black/85 to-transparent border-t border-white/10 backdrop-blur-sm space-y-2">
        {/* Top sub-bar: Space Index Stepper & Zoom Controls */}
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs">
          {/* Quick Space Stepper (< 이전 공간 / 다음 공간 >) */}
          <div className="flex items-center gap-2 bg-[#1b1b1b]/90 border border-[#C9A45C]/30 rounded-full px-2.5 py-1 shadow-md">
            <button
              type="button"
              onClick={handlePrevSpace}
              className="flex items-center gap-1 text-xs text-white/80 hover:text-[#C9A45C] transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer"
              title="이전 공간으로 전환"
              aria-label="이전 공간"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-sans">이전 공간</span>
            </button>
            <span className="font-mono text-xs text-[#E0C37E] font-semibold px-2 border-x border-white/10">
              SPACE {String((currentSpaceIndex >= 0 ? currentSpaceIndex : 0) + 1).padStart(2, '0')} / {String(spaces.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={handleNextSpace}
              className="flex items-center gap-1 text-xs text-white/80 hover:text-[#C9A45C] transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer"
              title="다음 공간으로 전환"
              aria-label="다음 공간"
            >
              <span className="hidden sm:inline font-sans">다음 공간</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom controls & FOV display */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateFov(fov - 5)}
              className="p-1.5 rounded bg-black/60 border border-white/10 text-white/70 hover:text-white hover:border-[#C9A45C]/40 transition-colors cursor-pointer"
              title="화각 확대 (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateFov(fov + 5)}
              className="p-1.5 rounded bg-black/60 border border-white/10 text-white/70 hover:text-white hover:border-[#C9A45C]/40 transition-colors cursor-pointer"
              title="화각 축소 (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateFov(75)}
              className="p-1.5 rounded bg-black/60 border border-white/10 text-white/70 hover:text-white hover:border-[#C9A45C]/40 transition-colors cursor-pointer"
              title="화각 기본값 복원 (75°)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="text-xs font-mono text-white/40 hidden sm:block ml-1">
              FOV {Math.round(fov)}°
            </div>
          </div>
        </div>

        {/* Horizontal Spaces Strip with Scroll Arrows & Visible Gold Scrollbar */}
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          {/* Left Scroll Arrow */}
          <button
            type="button"
            onClick={() => scrollSpaces('left')}
            disabled={!canScrollLeft}
            aria-label="공간 목록 왼쪽으로 스크롤"
            className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border transition-all ${
              canScrollLeft
                ? 'bg-[#1b1b1b] text-[#C9A45C] border-[#C9A45C]/50 hover:bg-[#C9A45C] hover:text-[#111111] shadow-md cursor-pointer'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-30'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Visible Horizontal Scrollbar Track */}
          <div
            ref={scrollContainerRef}
            className="horizontal-gold-scrollbar flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth flex-1"
          >
            {spaces.map((space) => {
              const isActive = currentSpace?.id === space.id;
              const hasPanorama = Boolean(space.panoramaUrl);

              return (
                <button
                  key={space.id}
                  data-space-id={space.id}
                  onClick={() => handleNavigateToSpace(space)}
                  className={`px-3.5 py-2 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#C9A45C] text-[#111111] font-semibold shadow-[0_0_16px_rgba(201,164,92,0.5)] border border-[#E0C37E]'
                      : 'bg-black/70 text-white/70 hover:text-white hover:bg-white/10 border border-white/15'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-[#111111]' : hasPanorama ? 'bg-emerald-400' : 'bg-[#C9A45C]'
                    }`}
                  />
                  <span className="font-mono text-xs">SPACE {space.spaceNumber}</span>
                  <span className="font-serif-display text-xs">{space.koreanName}</span>
                  {hasPanorama && !isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      VR
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Arrow */}
          <button
            type="button"
            onClick={() => scrollSpaces('right')}
            disabled={!canScrollRight}
            aria-label="공간 목록 오른쪽으로 스크롤"
            className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border transition-all ${
              canScrollRight
                ? 'bg-[#1b1b1b] text-[#C9A45C] border-[#C9A45C]/50 hover:bg-[#C9A45C] hover:text-[#111111] shadow-md cursor-pointer'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-30'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Quick Hotspot Creation Modal (Admin Mode) */}
      {isQuickHotspotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#C9A45C]/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#C9A45C]/20 border border-[#C9A45C] flex items-center justify-center text-[#E0C37E]">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    현재 시야 방향에 핫스팟 등록
                  </h3>
                  <p className="text-xs text-[#A6A49F]">
                    [{currentSpace.spaceNumber}] {currentSpace.koreanName} ➔ 다음 공간 연결
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickHotspotModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-white/70">
                <span>현재 카메라 수평각 (Yaw):</span>
                <span className="font-mono font-bold text-[#E0C37E]">
                  {Math.round(((liveLon % 360) + 360) % 360)}°
                </span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>현재 카메라 수직각 (Pitch):</span>
                <span className="font-mono font-bold text-[#E0C37E]">
                  {Math.round(latRef.current)}°
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  이동할 대상 공간 선택
                </label>
                <select
                  value={quickTargetSpaceId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickTargetSpaceId(val);
                    const found = spaces.find((s) => s.id === val);
                    if (found) setQuickHotspotLabel(`${found.koreanName} 이동`);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-black/80 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                >
                  {spaces
                    .filter((s) => s.id !== currentSpace.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        SPACE {s.spaceNumber} • {s.koreanName} ({s.name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  핫스팟 라벨명 (화면에 표시될 문구)
                </label>
                <input
                  type="text"
                  value={quickHotspotLabel}
                  onChange={(e) => setQuickHotspotLabel(e.target.value)}
                  placeholder="예: 중앙 거실 & 주방 라운지로 이동"
                  className="w-full px-3 py-2 rounded-lg bg-black/80 border border-white/20 text-xs text-white focus:outline-none focus:border-[#C9A45C]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsQuickHotspotModalOpen(false);
                  setActiveAdminTab('panorama');
                  setIsAdminModalOpen(true);
                }}
                className="text-xs text-[#C9A45C] hover:underline"
              >
                관리자 핫스팟 스튜디오 열기 ➔
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickHotspotModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!quickTargetSpaceId) return;
                    const curYaw = Math.round(((liveLon % 360) + 360) % 360);
                    const curPitch = Math.round(latRef.current);
                    const existingHotspots = Array.isArray(currentSpace.panoramaHotspots)
                      ? [...currentSpace.panoramaHotspots]
                      : [];

                    const newHotspot: PanoramaHotspot = {
                      id: `hs-${Date.now()}`,
                      targetSpaceId: quickTargetSpaceId,
                      label: quickHotspotLabel || '다음 공간으로 이동',
                      yaw: curYaw,
                      pitch: curPitch,
                    };

                    const updatedHotspots = [...existingHotspots, newHotspot];
                    const updatedConnected = Array.from(
                      new Set([...(currentSpace.connectedSpaceIds || []), quickTargetSpaceId])
                    );

                    updateSpaceItem(currentSpace.id, {
                      panoramaHotspots: updatedHotspots,
                      connectedSpaceIds: updatedConnected,
                    });

                    setUploadToast(
                      `'${quickHotspotLabel || '새 핫스팟'}'이 현재 시야각(${curYaw}°)에 등록되었습니다.`
                    );
                    setTimeout(() => setUploadToast(null), 3000);
                    setIsQuickHotspotModalOpen(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#C9A45C] hover:bg-[#D4B26F] text-[#111111] font-bold text-xs shadow-md"
                >
                  핫스팟 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
