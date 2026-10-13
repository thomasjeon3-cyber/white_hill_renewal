import { SpaceData, BlueprintStep } from '../types/spaces';

/**
 * PYEONGCHANG RESORT REMODELING - SPATIAL DATA CONFIG
 * 
 * [EXTENSIBILITY DESIGN]:
 * When actual 360° equirectangular panoramas are captured after remodeling:
 * 1. Place the 360 image in /public/assets/panorama/{space-id}.jpg
 * 2. Update `panoramaUrl` for that space (e.g. '/assets/panorama/lounge.jpg')
 * 3. The 360° Viewer instantly unlocks without modifying code!
 */
export const SPACES_DATA: SpaceData[] = [
  {
    id: 'lounge',
    spaceNumber: '01',
    name: 'GRAND LIVING & KITCHEN',
    koreanName: '중앙 거실 & 주방 라운지',
    category: 'LIVING',
    tagline: '임직원의 유대와 온기를 품은 중심 공용 공간',
    description: '14.4m 와이드 스팬의 탁 트인 개방감을 자랑하는 중앙 라운지입니다. 아일랜드 오픈 키친과 아늑한 리빙 존이 유기적으로 결합되어, 워크숍 후 자유로운 대화와 팀 빌딩, 편안한 휴식을 동시에 누릴 수 있는 핵심 공간으로 재구성됩니다.',
    architecturalHighlights: [
      '개방형 아일랜드 키친 및 프리미엄 조리·음료 바',
      '전면 파노라마 창호를 통한 평창 사계절 자연광 유입',
      '천장 간접 조명 및 오크 원목 바닥재의 따스한 무드',
      '다목적 라운지 소파 및 대형 커뮤니티 테이블 배치'
    ],
    dimensionsCAD: '14,400mm × 5,300mm',
    floorplan: {
      x: 48,
      y: 62,
      width: 44,
      height: 28
    },
    highlightPolygon: '20,50 78,50 78,77 32,77 32,87 18,87 18,50',
    panoramaUrl: null, // Set to '/assets/panorama/lounge.jpg' when 360 asset is uploaded
    connectedSpaceIds: ['suite-master', 'suite-north', 'suite-east', 'entry'],
    panoramaHotspots: [
      { id: 'lounge-to-entry', targetSpaceId: 'entry', label: '현관 로비로 이동', yaw: 215, pitch: -6 },
      { id: 'lounge-to-suite-master', targetSpaceId: 'suite-master', label: '마스터 스위트로 이동', yaw: 90, pitch: -6 },
      { id: 'lounge-to-suite-north', targetSpaceId: 'suite-north', label: '포레스트 게스트룸 01로 이동', yaw: 325, pitch: -6 },
      { id: 'lounge-to-suite-east', targetSpaceId: 'suite-east', label: '발코니 게스트룸 02로 이동', yaw: 35, pitch: -6 },
    ],
  },
  {
    id: 'suite-master',
    spaceNumber: '02',
    name: 'MASTER SUITE & PRIVATE TERRACE',
    koreanName: '마스터 스위트 & 전용 테라스',
    category: 'SUITE',
    tagline: '독립된 휴식과 평창의 숲을 마주하는 프라이빗 룸',
    description: '넓은 남동향 독립 침실로, 전용 와이드 발코니 테라스와 바로 연결됩니다. 자연 속에서 깊은 수면과 온전한 재충전을 경험할 수 있도록 소음 차단 설계와 친환경 마감재가 적용됩니다.',
    architecturalHighlights: [
      '전용 4,400mm 발코니 테라스 연결 구조',
      '마스터 드레스룸 및 프리미엄 욕실 직통 동선',
      '음향 차음 월 설계로 완벽한 프라이버시 보장',
      '내추럴 톤 베이지 패브릭 & 월넛 우드 악센트'
    ],
    dimensionsCAD: '4,400mm × 4,100mm',
    floorplan: {
      x: 82,
      y: 67,
      width: 22,
      height: 22
    },
    highlightPolygon: '70,58 93,58 93,82 70,82',
    panoramaUrl: null,
    connectedSpaceIds: ['lounge', 'dressing-room', 'bath-wellness'],
    panoramaHotspots: [
      { id: 'master-to-lounge', targetSpaceId: 'lounge', label: '중앙 라운지로 이동', yaw: 270, pitch: -6 },
      { id: 'master-to-dressing', targetSpaceId: 'dressing-room', label: '드레스룸으로 이동', yaw: 10, pitch: -6 },
      { id: 'master-to-bath', targetSpaceId: 'bath-wellness', label: '웰니스 바스로 이동', yaw: 45, pitch: -6 },
    ],
  },
  {
    id: 'dressing-room',
    spaceNumber: '03',
    name: 'DRESSING ROOM',
    koreanName: '드레스룸 & 파우더 존',
    category: 'SERVICE',
    tagline: '호텔급 수납과 쾌적한 동선을 위한 특화 공간',
    description: '평면도상 명시된 독립 드레스룸 공간입니다. 긴 일정의 연수 및 휴양 시에도 쾌적하게 의류와 짐을 정리할 수 있도록 빌트인 시스템 행거와 조명 거울이 조화롭게 시공됩니다.',
    architecturalHighlights: [
      '모듈형 빌트인 드레스 수납 시스템',
      '페이스 라이팅 기능의 대형 파우더 미러',
      '마스터 베드룸과 욕실을 잇는 스마트 버퍼 동선'
    ],
    dimensionsCAD: '2,700mm × 2,200mm',
    floorplan: {
      x: 86,
      y: 52,
      width: 13,
      height: 12
    },
    highlightPolygon: '79,48 93,48 93,58 79,58',
    panoramaUrl: null,
    connectedSpaceIds: ['suite-master', 'bath-wellness'],
    panoramaHotspots: [
      { id: 'dressing-to-master', targetSpaceId: 'suite-master', label: '마스터 스위트로 이동', yaw: 180, pitch: -6 },
      { id: 'dressing-to-bath', targetSpaceId: 'bath-wellness', label: '웰니스 바스로 이동', yaw: 0, pitch: -6 },
    ],
  },
  {
    id: 'bath-wellness',
    spaceNumber: '04',
    name: 'WELLNESS BATH & SPA',
    koreanName: '욕실 & 웰니스 바스 영역',
    category: 'WELLNESS',
    tagline: '평창의 맑은 기운과 함께하는 힐링 바스',
    description: '대형 욕조와 독립 샤워 부스, 파우더 세면대가 분리형으로 설계된 고급 욕실 공간입니다. 평창의 숲을 조망하며 하루의 피로를 씻어낼 수 있는 스파 감성을 지향합니다.',
    architecturalHighlights: [
      '독립형 릴랙세이션 욕조(Bathtub) 시공',
      '건식/습식 분리형 스마트 글라스 파티션',
      '내추럴 그레이 스톤 타일 마감 및 온열 바닥 시스템'
    ],
    dimensionsCAD: '2,700mm × 3,300mm',
    floorplan: {
      x: 87,
      y: 39,
      width: 14,
      height: 16
    },
    highlightPolygon: '79,31 94,31 94,47 79,47',
    panoramaUrl: null,
    connectedSpaceIds: ['dressing-room', 'suite-master'],
    panoramaHotspots: [
      { id: 'bath-to-dressing', targetSpaceId: 'dressing-room', label: '드레스룸으로 이동', yaw: 180, pitch: -6 },
      { id: 'bath-to-master', targetSpaceId: 'suite-master', label: '마스터 스위트로 이동', yaw: 210, pitch: -6 },
    ],
  },
  {
    id: 'suite-north',
    spaceNumber: '05',
    name: 'GUEST SUITE 01 (FOREST VIEW)',
    koreanName: '포레스트 뷰 게스트룸 01',
    category: 'SUITE',
    tagline: '북측 마운틴 뷰와 독립 테라스를 갖춘 객실',
    description: '북측 숲의 고요함을 바라보는 독립 침실입니다. 전용 테라스와 개별 화장실/세면대가 인접해 있어 다인원 연수 시에도 개별 독립성을 완벽히 유지할 수 있습니다.',
    architecturalHighlights: [
      '상단 단독 테라스(3,600mm) 조망',
      '침대 헤드보드 통합 충전 콘센트 및 무드 조명',
      '슬라이딩 도어 수납장 및 전용 세면대'
    ],
    dimensionsCAD: '5,800mm × 3,300mm',
    floorplan: {
      x: 50,
      y: 34,
      width: 18,
      height: 18
    },
    highlightPolygon: '40,24 59,24 59,49 40,49',
    panoramaUrl: null,
    connectedSpaceIds: ['lounge', 'suite-east'],
    panoramaHotspots: [
      { id: 'north-to-lounge', targetSpaceId: 'lounge', label: '중앙 라운지로 이동', yaw: 140, pitch: -6 },
      { id: 'north-to-east', targetSpaceId: 'suite-east', label: '발코니 게스트룸 02로 이동', yaw: 85, pitch: -6 },
    ],
  },
  {
    id: 'suite-east',
    spaceNumber: '06',
    name: 'GUEST SUITE 02 (BALCONY ROOM)',
    koreanName: '발코니 게스트룸 02',
    category: 'SUITE',
    tagline: '아늑함과 쾌적한 환기를 자랑하는 프라이빗 룸',
    description: '중앙 라운지 우측에 배치된 독립 게스트룸으로 전면 발코니와 연계되어 상쾌한 마운틴 에어를 체감할 수 있습니다. 모던 미니멀리즘 인테리어로 설계되었습니다.',
    architecturalHighlights: [
      '동측 자연 채광 및 독립 발코니',
      '친환경 원목 침대 프레임 & 프리미엄 매트리스',
      '소프트 블루 & 크림 아이보리 컬러 팔레트'
    ],
    dimensionsCAD: '3,600mm × 3,300mm',
    floorplan: {
      x: 68,
      y: 41,
      width: 17,
      height: 18
    },
    highlightPolygon: '60,31 77,31 77,50 60,50',
    panoramaUrl: null,
    connectedSpaceIds: ['lounge', 'suite-north'],
    panoramaHotspots: [
      { id: 'east-to-lounge', targetSpaceId: 'lounge', label: '중앙 라운지로 이동', yaw: 215, pitch: -6 },
      { id: 'east-to-north', targetSpaceId: 'suite-north', label: '포레스트 게스트룸 01로 이동', yaw: 280, pitch: -6 },
    ],
  },
  {
    id: 'entry',
    spaceNumber: '07',
    name: 'ELEVATOR & PRIVATE FOYER',
    koreanName: '전용 엘리베이터 & 현관 로비',
    category: 'SERVICE',
    tagline: '첫 발을 딛는 순간 전해지는 품격과 정적',
    description: 'ELEV와 계단실(DN)로부터 이어지는 전용 현관 홀입니다. 신발장 및 전신 거울, 웰컴 간접 조명이 방문객을 따뜻하게 맞이하며 내부 라운지로 자연스럽게 동선을 유도합니다.',
    architecturalHighlights: [
      '엘리베이터 직결 프라이빗 전실 구조',
      '히든 도어 방식의 대용량 현관 수납 시스템',
      '스마트 키리스 도어락 및 웰컴 라이팅 센서'
    ],
    dimensionsCAD: '2,400mm × 3,300mm',
    floorplan: {
      x: 26,
      y: 45,
      width: 18,
      height: 18
    },
    highlightPolygon: '12,32 33,32 33,58 12,58',
    panoramaUrl: null,
    connectedSpaceIds: ['lounge'],
    panoramaHotspots: [
      { id: 'entry-to-lounge', targetSpaceId: 'lounge', label: '중앙 거실 & 주방 라운지로 이동', yaw: 10, pitch: -5 },
    ],
  }
];

export const BLUEPRINT_STEPS: BlueprintStep[] = [
  {
    step: 1,
    code: '01',
    title: '건물 외곽선 및 축선 체계',
    subtitle: 'AXIS & STRUCTURAL FOOTPRINT',
    description: '14.4m 가로 축과 10.4m 세로 축을 바탕으로 한솔 평창연수원 화이트힐의 견고한 구조적 외곽 라인이 드러납니다.'
  },
  {
    step: 2,
    code: '02',
    title: '주요 공간 조닝 분할',
    subtitle: 'SPATIAL ZONING & CIRCULATION',
    description: '중앙 라운지를 중심으로 3개의 독립 스위트룸, 웰니스 바스, 전용 테라스가 효율적이고 유기적으로 조닝됩니다.'
  },
  {
    step: 3,
    code: '03',
    title: '건축 벽체 및 개구부 전개',
    subtitle: 'WALLS, FENESTRATION & ACCESS',
    description: '차음 성능이 강화된 내벽체, 채광을 극대화한 와이드 창호, 프라이버시를 고려한 도어 개폐 동선이 확립됩니다.'
  },
  {
    step: 4,
    code: '04',
    title: '컬러 텍스처 및 마감재 레이아웃',
    subtitle: 'SURFACE FINISHES & MATERIALS',
    description: '원목 플로어의 온기, 타일 테라스의 견고함, 침실의 차분한 소프트 톤이 2D 컬러 평면도 위에 입체적으로 실체화됩니다.'
  },
  {
    step: 5,
    code: '05',
    title: '인터랙티브 공간 탐색 핫스팟',
    subtitle: 'INTERACTIVE SPATIAL HOTSPOTS',
    description: '평면도 위의 각 공간을 직접 터치하고 탐험할 수 있는 디지털 인터랙션 레이어가 완성됩니다.'
  }
];

export const NOW_NEXT_COMPARISON = [
  {
    key: 'REST',
    pillar: '온전한 휴식',
    title: 'RESTFUL TRANQUILITY',
    now: '단순 숙박 및 다인실 중심의 정형화된 연수 시설',
    next: '개인 프라이버시와 깊은 수면을 보장하는 최고급 스위트 침실 및 독립 테라스',
    highlight: '독립형 마스터 스위트 & 방음 특화 설계'
  },
  {
    key: 'COMMUNITY',
    pillar: '소통과 영감',
    title: 'INSPIRING COMMUNITY',
    now: '분리된 좁은 거실과 제한적인 소통 공간',
    next: '14.4m 와이드 스팬의 오픈 아일랜드 키친과 자유로운 토론을 품은 그랜드 라운지',
    highlight: '오픈 다이닝 라운지 & 커뮤니티 테이블'
  },
  {
    key: 'WELLNESS',
    pillar: '웰니스 힐링',
    title: 'WELLNESS & HEALING',
    now: '기본적인 위생 기능에 머문 표준형 욕실',
    next: '대형 욕조와 독립 샤워 부스, 파우더룸이 분리된 프라이빗 호텔급 스파 존',
    highlight: '독립 드레스룸 & 웰니스 바스 시스템'
  },
  {
    key: 'NATURE',
    pillar: '평창의 사계',
    title: 'HARMONY WITH NATURE',
    now: '자연과의 단절감이 있는 작은 개구부',
    next: '창을 열면 쏟아지는 피톤치드 숲과 대형 발코니로 연결되는 친환경 리트리트',
    highlight: '와이드 파노라마 창호 & 아웃도어 테라스'
  }
];
