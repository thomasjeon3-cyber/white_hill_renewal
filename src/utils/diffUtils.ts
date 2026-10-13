import { SiteContent, ContentDiffItem, SpaceContentItem } from '../types/content';

export function compareSiteContent(published: SiteContent, local: SiteContent): ContentDiffItem[] {
  const diffs: ContentDiffItem[] = [];

  const addDiff = (
    id: string,
    category: '브랜드' | '도입부' | '평면도' | '공간탐색' | '360° 파노라마',
    label: string,
    path: string,
    pubVal: any,
    locVal: any
  ) => {
    const pubStr = pubVal === undefined || pubVal === null ? '(미설정)' : String(pubVal);
    const locStr = locVal === undefined || locVal === null ? '(미설정)' : String(locVal);
    const hasChanged = pubStr.trim() !== locStr.trim();
    diffs.push({
      id,
      category,
      label,
      path,
      publishedValue: pubStr,
      localValue: locStr,
      hasChanged,
    });
  };

  // 1. Brand
  addDiff('brand-name', '브랜드', '브랜드 메인 타이틀', 'brand.name', published.brand?.name, local.brand?.name);
  addDiff('brand-subName', '브랜드', '브랜드 서브타이틀', 'brand.subName', published.brand?.subName, local.brand?.subName);
  addDiff('brand-company', '브랜드', '기업/브랜드명', 'brand.companyName', published.brand?.companyName, local.brand?.companyName);
  addDiff('brand-copyright', '브랜드', '하단 카피라이트', 'brand.copyright', published.brand?.copyright, local.brand?.copyright);

  // 2. Intro
  addDiff('intro-building', '도입부', '건축물 명칭', 'intro.buildingName', published.intro?.buildingName, local.intro?.buildingName);
  addDiff('intro-title1', '도입부', '메인 타이틀 1행', 'intro.titleLine1', published.intro?.titleLine1, local.intro?.titleLine1);
  addDiff('intro-title2', '도입부', '메인 타이틀 2행', 'intro.titleLine2', published.intro?.titleLine2, local.intro?.titleLine2);
  addDiff('intro-desc', '도입부', '도입부 상세 설명', 'intro.description', published.intro?.description, local.intro?.description);
  addDiff('intro-btn', '도입부', '스크롤 버튼 텍스트', 'intro.scrollButtonText', published.intro?.scrollButtonText, local.intro?.scrollButtonText);
  addDiff('intro-bgmode', '도입부', '배경 모드 (영상/이미지)', 'intro.bgMode', published.intro?.bgMode, local.intro?.bgMode);
  addDiff('intro-video', '도입부', '배경 비디오 경로', 'intro.videoUrl', published.intro?.videoUrl, local.intro?.videoUrl);
  addDiff('intro-bgimg', '도입부', '배경 이미지 경로', 'intro.bgImageUrl', published.intro?.bgImageUrl || '(기본 이미지)', local.intro?.bgImageUrl || '(기본 이미지)');

  // 3. Floorplan
  addDiff('fp-title', '평면도', '평면도 제목', 'floorplan.title', published.floorplan?.title, local.floorplan?.title);
  addDiff('fp-subtitle', '평면도', '평면도 서브타이틀', 'floorplan.subtitle', published.floorplan?.subtitle, local.floorplan?.subtitle);
  addDiff('fp-desc', '평면도', '평면도 개요 설명', 'floorplan.description', published.floorplan?.description, local.floorplan?.description);

  // Floorplan steps (1 to 5)
  const pubSteps = published.floorplan?.steps || [];
  const locSteps = local.floorplan?.steps || [];
  for (let stepNum = 1; stepNum <= 5; stepNum++) {
    const ps = pubSteps.find((s) => s.step === stepNum);
    const ls = locSteps.find((s) => s.step === stepNum);
    addDiff(
      `fp-step-${stepNum}-title`,
      '평면도',
      `평면도 Step ${stepNum} 제목`,
      `floorplan.steps[${stepNum}].title`,
      ps?.title,
      ls?.title
    );
    addDiff(
      `fp-step-${stepNum}-desc`,
      '평면도',
      `평면도 Step ${stepNum} 설명`,
      `floorplan.steps[${stepNum}].description`,
      ps?.description,
      ls?.description
    );
  }

  // 4. Spaces
  const pubSpaces: SpaceContentItem[] = published.spaces?.items || [];
  const locSpaces: SpaceContentItem[] = local.spaces?.items || [];

  // Check added spaces
  locSpaces.forEach((ls) => {
    const existsInPub = pubSpaces.some((ps) => ps.id === ls.id);
    if (!existsInPub) {
      diffs.push({
        id: `space-added-${ls.id}`,
        category: '공간탐색',
        label: `[신규 추가 공간] ${ls.koreanName} (${ls.spaceNumber || '신규'})`,
        path: `spaces.items[${ls.id}]`,
        publishedValue: '(배포 버전에 없음)',
        localValue: `추가됨: ${ls.koreanName} / CAD: ${ls.dimensionsCAD || '미정'} / 좌표(${ls.floorplan?.x}%, ${ls.floorplan?.y}%)`,
        hasChanged: true,
      });
    }
  });

  // Check deleted spaces
  pubSpaces.forEach((ps) => {
    const existsInLoc = locSpaces.some((ls) => ls.id === ps.id);
    if (!existsInLoc) {
      diffs.push({
        id: `space-deleted-${ps.id}`,
        category: '공간탐색',
        label: `[삭제된 공간] ${ps.koreanName} (${ps.spaceNumber})`,
        path: `spaces.items[${ps.id}]`,
        publishedValue: `존재함: ${ps.koreanName} (${ps.name})`,
        localValue: '(임시저장 버전에서 삭제됨)',
        hasChanged: true,
      });
    }
  });

  // Check modified spaces
  locSpaces.forEach((ls) => {
    const ps = pubSpaces.find((p) => p.id === ls.id);
    if (!ps) return;

    const spaceName = ls.koreanName || ps.koreanName || ls.id;

    if (ps.koreanName !== ls.koreanName) {
      addDiff(
        `space-${ls.id}-koreanName`,
        '공간탐색',
        `${spaceName} 공간 국문명`,
        `spaces.${ls.id}.koreanName`,
        ps.koreanName,
        ls.koreanName
      );
    }

    if (ps.name !== ls.name) {
      addDiff(
        `space-${ls.id}-name`,
        '공간탐색',
        `${spaceName} 공간 영문명`,
        `spaces.${ls.id}.name`,
        ps.name,
        ls.name
      );
    }

    if (ps.category !== ls.category) {
      addDiff(
        `space-${ls.id}-category`,
        '공간탐색',
        `${spaceName} 카테고리`,
        `spaces.${ls.id}.category`,
        ps.category,
        ls.category
      );
    }

    if (ps.tagline !== ls.tagline) {
      addDiff(
        `space-${ls.id}-tagline`,
        '공간탐색',
        `${spaceName} 슬로건`,
        `spaces.${ls.id}.tagline`,
        ps.tagline,
        ls.tagline
      );
    }

    if (ps.description !== ls.description) {
      addDiff(
        `space-${ls.id}-description`,
        '공간탐색',
        `${spaceName} 상세 설명`,
        `spaces.${ls.id}.description`,
        ps.description,
        ls.description
      );
    }

    if (ps.dimensionsCAD !== ls.dimensionsCAD) {
      addDiff(
        `space-${ls.id}-cad`,
        '공간탐색',
        `${spaceName} CAD 실측 제원`,
        `spaces.${ls.id}.dimensionsCAD`,
        ps.dimensionsCAD,
        ls.dimensionsCAD
      );
    }

    // Floorplan coordinates
    const pCoord = ps.floorplan ? `X: ${ps.floorplan.x}%, Y: ${ps.floorplan.y}%` : '(없음)';
    const lCoord = ls.floorplan ? `X: ${ls.floorplan.x}%, Y: ${ls.floorplan.y}%` : '(없음)';
    if (pCoord !== lCoord) {
      addDiff(
        `space-${ls.id}-coord`,
        '평면도',
        `${spaceName} 평면도 핀 위치 좌표`,
        `spaces.${ls.id}.floorplan`,
        pCoord,
        lCoord
      );
    }

    // 360 Panorama URL
    const pPano = ps.panoramaUrl || '(파노라마 없음)';
    const lPano = ls.panoramaUrl || '(파노라마 없음)';
    if (pPano !== lPano) {
      addDiff(
        `space-${ls.id}-panorama`,
        '360° 파노라마',
        `${spaceName} 360° 파노라마 사진 URL`,
        `spaces.${ls.id}.panoramaUrl`,
        pPano,
        lPano
      );
    }

    // Hotspots count
    const pHotspotsCount = ps.panoramaHotspots?.length || 0;
    const lHotspotsCount = ls.panoramaHotspots?.length || 0;
    if (pHotspotsCount !== lHotspotsCount) {
      addDiff(
        `space-${ls.id}-hotspots`,
        '360° 파노라마',
        `${spaceName} 360° 내 이동 핫스팟 개수`,
        `spaces.${ls.id}.panoramaHotspots.length`,
        `${pHotspotsCount}개`,
        `${lHotspotsCount}개`
      );
    }
  });

  return diffs;
}
