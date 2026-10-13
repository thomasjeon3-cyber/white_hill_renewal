import { PanoramaHotspot } from './spaces';

export interface BlueprintStepContent {
  step: number;
  code: string;
  title: string;
  subtitle: string;
  description: string;
}

export interface SpaceContentItem {
  id: string;
  spaceNumber: string;
  name: string;
  koreanName: string;
  category: string;
  tagline: string;
  description: string;
  architecturalHighlights: string[];
  dimensionsCAD: string;
  floorplan?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  highlightPolygon?: string;
  panoramaUrl?: string | null;
  connectedSpaceIds?: string[];
  panoramaHotspots?: PanoramaHotspot[];
}

export interface SiteContent {
  brand: {
    name: string;
    subName: string;
    companyName: string;
    copyright: string;
  };
  intro: {
    chapterTag: string;
    buildingName: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    scrollButtonText: string;
    videoUrl: string;
    bgImageUrl?: string;
    bgMode?: 'image' | 'video';
  };
  floorplan: {
    chapterTag: string;
    title: string;
    subtitle: string;
    description: string;
    imageUrl?: string;
    steps: BlueprintStepContent[];
  };
  spaces: {
    chapterTag: string;
    title: string;
    subtitle: string;
    items: SpaceContentItem[];
  };
}

export interface ContentDiffItem {
  id: string;
  category: '브랜드' | '도입부' | '평면도' | '공간탐색' | '360° 파노라마';
  label: string;
  path: string;
  publishedValue: string;
  localValue: string;
  hasChanged: boolean;
}

