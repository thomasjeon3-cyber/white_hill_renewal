import React, { useState, useMemo } from 'react';
import { Compass, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { SpaceData } from '../types/spaces';
import { SPACES_DATA } from '../data/spacesData';
import floorPlanDefaultImage from '../assets/images/floor_plan_color_1788931491740.jpg';

interface MiniFloorPlanRadarProps {
  spaces: SpaceData[];
  currentSpace: SpaceData;
  cameraLon: number; // yaw in degrees
  cameraFov?: number; // fov in degrees
  onSelectSpace: (space: SpaceData) => void;
  floorPlanImageUrl?: string | null;
}

// Helper to guarantee exact spatial coordinates matching the floor plan blueprint
const getSpaceCoords = (sp: SpaceData | any): { x: number; y: number } => {
  const staticSp = SPACES_DATA.find((s) => s.id === sp.id);
  const x = sp.floorplan?.x ?? staticSp?.floorplan.x ?? 50;
  const y = sp.floorplan?.y ?? staticSp?.floorplan.y ?? 50;
  return { x, y };
};

export const MiniFloorPlanRadar: React.FC<MiniFloorPlanRadarProps> = ({
  spaces,
  currentSpace,
  cameraLon,
  cameraFov = 75,
  onSelectSpace,
  floorPlanImageUrl,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpandedModal, setIsExpandedModal] = useState<boolean>(false);
  // Track natural aspect ratio of floor plan image (1024x1024 is 1.0)
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  const floorPlanSrc = floorPlanImageUrl || floorPlanDefaultImage;

  // Normalized viewing angle (0 to 360)
  // In 360 viewer, 0 is forward, positive lon rotates right.
  // We align with architectural CAD coordinates (0 = East/Right, 90 = South/Down, 180 = West/Left, 270 = North/Up)
  const normAngle = ((cameraLon % 360) + 360) % 360;

  // Compass Cardinal Direction text
  const compassHeading = useMemo(() => {
    const deg = Math.round(normAngle);
    if (deg >= 337.5 || deg < 22.5) return `북측 N (${deg}°)`;
    if (deg >= 22.5 && deg < 67.5) return `북동 NE (${deg}°)`;
    if (deg >= 67.5 && deg < 112.5) return `동측 E (${deg}°)`;
    if (deg >= 112.5 && deg < 157.5) return `남동 SE (${deg}°)`;
    if (deg >= 157.5 && deg < 202.5) return `남측 S (${deg}°)`;
    if (deg >= 202.5 && deg < 247.5) return `남서 SW (${deg}°)`;
    if (deg >= 247.5 && deg < 292.5) return `서측 W (${deg}°)`;
    return `북서 NW (${deg}°)`;
  }, [normAngle]);

  // Exact position of current space on floor plan image (0-100% of image bounds)
  const { x: cx, y: cy } = useMemo(() => getSpaceCoords(currentSpace), [currentSpace]);

  // Radar Vision Cone Geometry
  // Radius in percentage units - 14% of the floor plan size
  const R = 14;
  const fov = Math.max(30, Math.min(100, cameraFov));
  const halfFov = fov / 2;

  // Aspect-corrected radii so that cone and circle geometries remain isotropic
  const rx = R / (aspectRatio || 1);
  const ry = R;

  // Calculate SVG arc path for the FOV cone
  const conePath = useMemo(() => {
    const centerDeg = normAngle - 90;
    const startDeg = centerDeg - halfFov;
    const endDeg = centerDeg + halfFov;

    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const x1 = cx + rx * Math.cos(startRad);
    const y1 = cy + ry * Math.sin(startRad);
    const x2 = cx + rx * Math.cos(endRad);
    const y2 = cy + ry * Math.sin(endRad);

    const largeArcFlag = fov > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }, [cx, cy, normAngle, halfFov, fov, rx, ry]);

  // Sight center line endpoint
  const sightLineEnd = useMemo(() => {
    const centerRad = ((normAngle - 90) * Math.PI) / 180;
    const dist = R + 2;
    const distRx = dist / (aspectRatio || 1);
    const distRy = dist;
    return {
      x: (cx + distRx * Math.cos(centerRad)).toFixed(2),
      y: (cy + distRy * Math.sin(centerRad)).toFixed(2),
    };
  }, [cx, cy, normAngle, R, aspectRatio]);

  if (isCollapsed) {
    return (
      <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-6 z-30 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-[#C9A45C]/60 text-white shadow-2xl hover:border-[#C9A45C] hover:bg-black/95 transition-all duration-200"
          title="평창연수원 평면도 펼치기"
        >
          <div className="w-6 h-6 rounded-full bg-[#C9A45C]/20 border border-[#C9A45C] flex items-center justify-center text-[#E0C37E]">
            <Compass className="w-3.5 h-3.5 animate-[spin_8s_linear_infinite]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-mono text-[#C9A45C] font-semibold tracking-wider">
              평창연수원 평면도
            </span>
            <span className="text-xs font-serif-display text-white font-medium">
              [{currentSpace.spaceNumber}] {currentSpace.koreanName}
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-[#C9A45C]" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Bottom-Right Mini Radar Card */}
      <div
        className={`absolute z-30 pointer-events-auto transition-all duration-300 ${
          isExpandedModal
            ? 'fixed inset-4 sm:inset-10 md:inset-16 max-w-4xl max-h-[85vh] m-auto'
            : 'bottom-4 right-4 sm:bottom-5 sm:right-6 w-64 sm:w-72 md:w-80'
        }`}
      >
        <div className="w-full bg-[#0D0D0D]/94 backdrop-blur-xl border border-[#C9A45C]/50 rounded-xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col">
          {/* Header Bar - Clickable to collapse */}
          <div
            onClick={() => setIsCollapsed(true)}
            className="px-3 py-2 bg-gradient-to-r from-black/90 via-[#181510] to-black/90 border-b border-[#C9A45C]/30 flex items-center justify-between cursor-pointer hover:bg-[#1a1712] transition-colors group/header select-none"
            title="클릭하여 평창연수원 평면도 접기"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-[#C9A45C]/20 border border-[#C9A45C] flex items-center justify-center text-[#E0C37E] shrink-0">
                <Compass className="w-3.5 h-3.5 text-[#C9A45C]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold tracking-widest text-[#C9A45C]">
                    평창연수원 평면도
                  </span>
                  <span className="text-xs font-mono text-[#E0C37E]/90 bg-[#C9A45C]/15 px-1 rounded">
                    {compassHeading}
                  </span>
                </div>
                <div className="text-xs font-serif-display font-medium text-white truncate">
                  [{currentSpace.spaceNumber}] {currentSpace.koreanName}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpandedModal(!isExpandedModal);
                }}
                className="p-1 rounded text-white/70 hover:text-[#C9A45C] hover:bg-white/10 transition-colors cursor-pointer"
                title={isExpandedModal ? '미니맵 축소' : '평면도 확대 보기'}
              >
                {isExpandedModal ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs text-white/70 hover:text-[#C9A45C] hover:bg-white/10 transition-colors cursor-pointer"
                title="미니 평면도 접기"
              >
                <span className="hidden sm:inline">접기</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Floor Plan Stage with Real-Time Rotating Vision Cone */}
          <div
            className={`relative w-full bg-[#050505] overflow-hidden select-none flex items-center justify-center p-2.5 sm:p-3 ${
              isExpandedModal ? 'h-[500px] sm:h-[600px]' : 'h-48 sm:h-52 md:h-56'
            }`}
          >
            {/* 1:1 Blueprint Image Wrapper - Bounded exactly to the rendered floor plan dimensions */}
            <div
              className="relative inline-flex items-center justify-center max-w-full max-h-full rounded-lg overflow-hidden bg-black/50 border border-[#C9A45C]/35 shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
              style={{ aspectRatio: `${aspectRatio}` }}
            >
              {/* Floor Plan Blueprint Image */}
              <img
                src={floorPlanSrc}
                alt="평창연수원 평면도"
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    setAspectRatio(naturalWidth / naturalHeight);
                  }
                }}
                className={`w-auto h-auto max-w-full block pointer-events-none opacity-90 select-none ${
                  isExpandedModal ? 'max-h-[470px] sm:max-h-[570px]' : 'max-h-44 sm:max-h-48 md:max-h-52'
                }`}
              />

              {/* Grid Overlay Texture Bounded to Image */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(#C9A45C 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Dynamic SVG Radar & Markers Overlay - Exact 1:1 with Floor Plan Coordinates */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-auto overflow-visible"
              >
                <defs>
                  {/* Vision Cone Radial Gradient */}
                  <radialGradient
                    id={`radarConeGrad-${currentSpace.id}`}
                    cx={`${cx}%`}
                    cy={`${cy}%`}
                    r={`${R}%`}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#E0C37E" stopOpacity="0.85" />
                    <stop offset="45%" stopColor="#C9A45C" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#C9A45C" stopOpacity="0.0" />
                  </radialGradient>

                  <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* 1. Rotating Vision Cone (FOV Wedge) */}
                <path
                  d={conePath}
                  fill={`url(#radarConeGrad-${currentSpace.id})`}
                  stroke="#E0C37E"
                  strokeWidth="0.5"
                  strokeDasharray="2 1"
                  opacity="0.9"
                  filter="url(#radarGlow)"
                />

                {/* 2. Direct Line of Sight (Center Sight Beam) */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={sightLineEnd.x}
                  y2={sightLineEnd.y}
                  stroke="#FFF2B8"
                  strokeWidth="0.8"
                  strokeDasharray="1.5 1"
                  filter="url(#radarGlow)"
                />
                <circle
                  cx={sightLineEnd.x}
                  cy={sightLineEnd.y}
                  r="0.8"
                  fill="#FFF2B8"
                />

                {/* 3. Other Spaces Navigation Pins - Precise 1:1 Location matching Floor Plan */}
                {spaces.map((sp) => {
                  const isCurrent = sp.id === currentSpace.id;
                  if (isCurrent) return null;
                  const coords = getSpaceCoords(sp);
                  const sx = coords.x;
                  const sy = coords.y;

                  const pinRadius = 2.6;
                  const pinRx = pinRadius / (aspectRatio || 1);
                  const pinRy = pinRadius;

                  return (
                    <g
                      key={sp.id}
                      onClick={() => onSelectSpace(sp)}
                      className="cursor-pointer"
                    >
                      {/* Generous Hitbox */}
                      <ellipse
                        cx={sx}
                        cy={sy}
                        rx={pinRx * 2.2}
                        ry={pinRy * 2.2}
                        fill="transparent"
                      />
                      {/* Pin Circle - Centered exactly at (sx, sy) */}
                      <ellipse
                        cx={sx}
                        cy={sy}
                        rx={pinRx}
                        ry={pinRy}
                        fill="#111111"
                        stroke="#C9A45C"
                        strokeWidth="0.6"
                      />
                      {/* Space Number - Centered exactly inside the pin */}
                      <text
                        x={sx}
                        y={sy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#E0C37E"
                        fontSize="2.4"
                        fontWeight="bold"
                        className="font-mono pointer-events-none select-none"
                      >
                        {sp.spaceNumber}
                      </text>
                    </g>
                  );
                })}

                {/* 4. Current Space Location Marker (Pulsing Center Dot & Room Pin) */}
                <g>
                  {/* Ping Ring */}
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={5.0 / (aspectRatio || 1)}
                    ry={5.0}
                    fill="none"
                    stroke="#E0C37E"
                    strokeWidth="0.6"
                    opacity="0.75"
                  />
                  {/* Current Active Pin Circle */}
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={3.2 / (aspectRatio || 1)}
                    ry={3.2}
                    fill="#C9A45C"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                    filter="url(#radarGlow)"
                  />
                  {/* Space Number in Current Pin */}
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#111111"
                    fontSize="2.5"
                    fontWeight="bold"
                    className="font-mono pointer-events-none select-none"
                  >
                    {currentSpace.spaceNumber}
                  </text>
                  {/* Current Space "NOW" Badge positioned above pin */}
                  <rect
                    x={cx - 5.5}
                    y={cy - 7.5}
                    width="11"
                    height="3.6"
                    rx="1.2"
                    fill="#000000"
                    fillOpacity="0.9"
                    stroke="#C9A45C"
                    strokeWidth="0.5"
                  />
                  <text
                    x={cx}
                    y={cy - 5.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#E0C37E"
                    fontSize="2.2"
                    fontWeight="bold"
                    className="font-mono pointer-events-none select-none tracking-tight"
                  >
                    NOW {currentSpace.spaceNumber}
                  </text>
                </g>
              </svg>

              {/* Cardinal Markers on Floor Plan Boundary */}
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-mono text-[#C9A45C] pointer-events-none font-bold bg-black/60 px-1 rounded">
                N
              </span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-mono text-white/50 pointer-events-none font-bold bg-black/60 px-1 rounded">
                S
              </span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-mono text-white/50 pointer-events-none font-bold bg-black/60 px-1 rounded">
                W
              </span>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-mono text-white/50 pointer-events-none font-bold bg-black/60 px-1 rounded">
                E
              </span>
            </div>
          </div>

          {/* Footer Guide Strip - Clickable to collapse */}
          <div
            onClick={() => setIsCollapsed(true)}
            className="px-2.5 py-1.5 bg-black/90 border-t border-[#C9A45C]/20 flex items-center justify-between text-xs text-[#A6A49F] cursor-pointer hover:bg-black/95 transition-colors select-none"
            title="클릭하여 미니 평면도 접기"
          >
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A45C] animate-pulse" />
              시야각 실시간 추적 레이더
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#C9A45C]">
                {Math.round(normAngle)}°
              </span>
              <span className="text-xs text-white/50 border border-white/20 px-1.5 py-0.5 rounded hover:text-white">
                접기 ▾
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop when expanded modal */}
      {isExpandedModal && (
        <div
          onClick={() => setIsExpandedModal(false)}
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm pointer-events-auto"
        />
      )}
    </>
  );
};

