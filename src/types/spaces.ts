export interface PanoramaHotspot {
  id: string;
  targetSpaceId: string;
  label?: string;
  yaw: number; // 0 to 360 degrees (horizontal angle)
  pitch?: number; // -60 to 60 degrees (vertical angle, default -5)
}

export interface SpaceData {
  id: string;
  spaceNumber: string;
  name: string;
  koreanName: string;
  category: 'LIVING' | 'SUITE' | 'WELLNESS' | 'SERVICE';
  tagline: string;
  description: string;
  architecturalHighlights: string[];
  dimensionsCAD: string;
  floorplan: {
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    width?: number;
    height?: number;
  };
  // Bounding polygon on floor plan for hover highlight effect (normalized 0-100)
  highlightPolygon?: string;
  panoramaUrl: string | null; // null if not yet uploaded, triggers "COMING SOON"
  connectedSpaceIds: string[];
  panoramaHotspots?: PanoramaHotspot[];
  northOffset?: number; // Optional North orientation offset in degrees (reserved for future calibration)
}

export interface BlueprintStep {
  step: number;
  code: string;
  title: string;
  subtitle: string;
  description: string;
}
