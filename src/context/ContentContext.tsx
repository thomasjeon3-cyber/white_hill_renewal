import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import initialPublishedContent from '../data/publishedContent.json';
import { SiteContent, SpaceContentItem, ContentDiffItem } from '../types/content';
import { SPACES_DATA, BLUEPRINT_STEPS } from '../data/spacesData';
import { compareSiteContent } from '../utils/diffUtils';

const STORAGE_KEY = 'hansoll_site_content_v2';
const ADMIN_PASSWORD_KEY = 'hansoll_admin_pwd_v1';
const DEFAULT_ADMIN_PASSWORD = '1234';
const VIDEO_DB_NAME = 'hansoll_media_db';
const VIDEO_STORE_NAME = 'videos';
const IMAGE_STORE_NAME = 'images';
const PANORAMA_STORE_NAME = 'panoramas';

export const PUBLISHED_CONTENT: SiteContent = (initialPublishedContent as unknown) as SiteContent;
export const DEFAULT_CONTENT: SiteContent = PUBLISHED_CONTENT;


export interface AddHotspotParams {
  spaceNumber?: string;
  name?: string;
  koreanName?: string;
  category?: string;
  tagline?: string;
  description?: string;
  architecturalHighlights?: string[];
  dimensionsCAD?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type AdminTabType = 'intro' | 'floorplan' | 'spaces' | 'panorama' | 'brand' | 'data' | 'sync';

interface ContentContextType {
  content: SiteContent;
  updateField: (section: keyof SiteContent, key: string, value: any) => void;
  updateSpaceItem: (spaceId: string, updated: Partial<SpaceContentItem>) => void;
  updateStepItem: (stepNumber: number, updated: { title?: string; subtitle?: string; description?: string }) => void;
  updateVideoBlob: (file: File) => Promise<string>;
  updateImageBlob: (file: File) => Promise<string>;
  clearCustomImage: () => void;
  updateFloorplanImageBlob: (file: File) => Promise<string>;
  clearCustomFloorplanImage: () => void;
  updatePanoramaImage: (spaceId: string, file: File) => Promise<string>;
  setPanoramaUrl: (spaceId: string, url: string) => void;
  clearPanoramaImage: (spaceId: string) => void;
  addHotspot: (params: AddHotspotParams) => string;
  updateHotspotPosition: (spaceId: string, x: number, y: number, width?: number, height?: number) => void;
  removeHotspot: (spaceId: string) => void;
  resetToDefault: () => void;
  exportJSON: () => void;
  importJSON: (jsonString: string) => boolean;
  isAdminMode: boolean;
  setIsAdminMode: (val: boolean) => void;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (val: boolean) => void;
  isPasswordModalOpen: boolean;
  setIsPasswordModalOpen: (val: boolean) => void;
  verifyAdminPassword: (password: string) => boolean;
  loginWithPassword: (password: string) => boolean;
  changeAdminPassword: (newPassword: string) => void;
  activeAdminTab: AdminTabType;
  setActiveAdminTab: (tab: AdminTabType) => void;
  isComparisonModalOpen: boolean;
  setIsComparisonModalOpen: (val: boolean) => void;
  diffList: ContentDiffItem[];
  diffCount: number;
  publishedContent: SiteContent;
  saveToPublishedSource: () => Promise<{ success: boolean; message: string }>;
}

const ContentContext = createContext<ContentContextType | null>(null);

// IndexedDB Helper for persistent custom uploaded video, images & 360 panoramas
async function saveVideoToIndexedDB(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(URL.createObjectURL(file));
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(VIDEO_STORE_NAME, 'readwrite');
      const store = tx.objectStore(VIDEO_STORE_NAME);
      store.put(file, 'custom_intro_video');
      tx.oncomplete = () => {
        resolve(URL.createObjectURL(file));
      };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => resolve(URL.createObjectURL(file));
  });
}

async function loadVideoFromIndexedDB(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(VIDEO_STORE_NAME, 'readonly');
      const store = tx.objectStore(VIDEO_STORE_NAME);
      const getReq = store.get('custom_intro_video');
      getReq.onsuccess = () => {
        if (getReq.result instanceof Blob) {
          resolve(URL.createObjectURL(getReq.result));
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

async function saveImageToIndexedDB(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(URL.createObjectURL(file));
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      store.put(file, 'custom_intro_image');
      tx.oncomplete = () => {
        resolve(URL.createObjectURL(file));
      };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => {
      resolve(URL.createObjectURL(file));
    };
  });
}

async function loadImageFromIndexedDB(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const getReq = store.get('custom_intro_image');
      getReq.onsuccess = () => {
        if (getReq.result instanceof Blob) {
          resolve(URL.createObjectURL(getReq.result));
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

async function saveFloorplanImageToIndexedDB(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(URL.createObjectURL(file));
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      store.put(file, 'custom_floorplan_image');
      tx.oncomplete = () => {
        resolve(URL.createObjectURL(file));
      };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => {
      resolve(URL.createObjectURL(file));
    };
  });
}

async function loadFloorplanImageFromIndexedDB(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const getReq = store.get('custom_floorplan_image');
      getReq.onsuccess = () => {
        if (getReq.result instanceof Blob) {
          resolve(URL.createObjectURL(getReq.result));
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

function isHeavyUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('data:') || url.startsWith('blob:') || url.length > 1024;
}

export function sanitizeContentForLocalStorage(raw: SiteContent): SiteContent {
  return {
    ...raw,
    intro: {
      ...raw.intro,
      videoUrl: isHeavyUrl(raw.intro?.videoUrl) ? DEFAULT_CONTENT.intro.videoUrl : (raw.intro?.videoUrl || DEFAULT_CONTENT.intro.videoUrl),
      bgImageUrl: isHeavyUrl(raw.intro?.bgImageUrl) ? '' : (raw.intro?.bgImageUrl || ''),
    },
    floorplan: {
      ...raw.floorplan,
      imageUrl: isHeavyUrl(raw.floorplan?.imageUrl) ? '' : (raw.floorplan?.imageUrl || ''),
    },
    spaces: {
      ...raw.spaces,
      items: (raw.spaces?.items || []).map((item) => ({
        ...item,
        panoramaUrl: isHeavyUrl(item.panoramaUrl) ? null : item.panoramaUrl,
      })),
    },
  };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadMediaToServer(
  type: 'panorama' | 'intro-image' | 'floorplan' | 'video',
  file: File,
  spaceId?: string
): Promise<string | null> {
  try {
    const base64Data = await fileToBase64(file);
    const res = await fetch('/api/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        spaceId,
        filename: file.name,
        base64Data,
      }),
    });
    const cType = res.headers.get('content-type') || '';
    if (res.ok && cType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Server media upload failed, fallback to local storage:', err);
  }
  return null;
}

async function savePanoramaImageToIndexedDB(spaceId: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(URL.createObjectURL(file));
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(PANORAMA_STORE_NAME, 'readwrite');
      const store = tx.objectStore(PANORAMA_STORE_NAME);
      store.put(file, spaceId);
      tx.oncomplete = () => {
        resolve(URL.createObjectURL(file));
      };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => {
      resolve(URL.createObjectURL(file));
    };
  });
}

async function loadAllPanoramaImagesFromIndexedDB(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve({});
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) db.createObjectStore(VIDEO_STORE_NAME);
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) db.createObjectStore(PANORAMA_STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PANORAMA_STORE_NAME)) {
        resolve({});
        return;
      }
      const tx = db.transaction(PANORAMA_STORE_NAME, 'readonly');
      const store = tx.objectStore(PANORAMA_STORE_NAME);
      const getAllKeysReq = store.getAllKeys();
      getAllKeysReq.onsuccess = () => {
        const keys = (getAllKeysReq.result || []) as string[];
        if (keys.length === 0) {
          resolve({});
          return;
        }
        const result: Record<string, string> = {};
        let loaded = 0;
        keys.forEach((key) => {
          const getReq = store.get(key);
          getReq.onsuccess = () => {
            if (getReq.result instanceof Blob) {
              result[key] = URL.createObjectURL(getReq.result);
            }
            loaded++;
            if (loaded === keys.length) resolve(result);
          };
          getReq.onerror = () => {
            loaded++;
            if (loaded === keys.length) resolve(result);
          };
        });
      };
      getAllKeysReq.onerror = () => resolve({});
    };
    request.onerror = () => resolve({});
  });
}

async function deletePanoramaImageFromIndexedDB(spaceId: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve();
      return;
    }
    const request = indexedDB.open(VIDEO_DB_NAME, 3);
    request.onsuccess = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(PANORAMA_STORE_NAME)) {
        const tx = db.transaction(PANORAMA_STORE_NAME, 'readwrite');
        tx.objectStore(PANORAMA_STORE_NAME).delete(spaceId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } else {
        resolve();
      }
    };
    request.onerror = () => resolve();
  });
}

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);

  const [publishedContent, setPublishedContent] = useState<SiteContent>(PUBLISHED_CONTENT);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabType>('intro');

  const diffList = useMemo(() => {
    return compareSiteContent(publishedContent, content);
  }, [publishedContent, content]);

  const diffCount = useMemo(() => {
    return diffList.filter((item) => item.hasChanged).length;
  }, [diffList]);

  const saveToPublishedSource = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Resolve browser-local blob URLs before publishing. Blob URLs and IndexedDB
      // contents exist only in the editing browser and are invisible to other visitors.
      const workingContent: SiteContent = JSON.parse(JSON.stringify(content));

      const makePortableUrl = async (url?: string | null): Promise<string | null | undefined> => {
        if (!url || !url.startsWith('blob:')) return url;
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('미디어 파일을 게시용 데이터로 변환하지 못했습니다.'));
          reader.readAsDataURL(blob);
        });
      };

      // Embed uploaded media in publishedContent.json so the published static site
      // can serve the same media to first-time visitors and mobile devices.
      workingContent.intro.videoUrl = (await makePortableUrl(workingContent.intro.videoUrl)) || DEFAULT_CONTENT.intro.videoUrl;
      workingContent.intro.bgImageUrl = (await makePortableUrl(workingContent.intro.bgImageUrl)) || '';
      workingContent.floorplan.imageUrl = (await makePortableUrl(workingContent.floorplan.imageUrl)) || '';
      for (const sp of workingContent.spaces.items) {
        sp.panoramaUrl = (await makePortableUrl(sp.panoramaUrl)) || null;
      }

      // Do not sanitize data: URLs here. They are intentionally portable publish assets.
      setContent(workingContent);

      const res = await fetch('/api/save-published-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workingContent),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response from /api/save-published-content:', text.substring(0, 300));
        throw new Error(
          `서버 응답 오류 (HTTP ${res.status}): 예상치 못한 형식의 응답입니다. 백엔드 상태를 점검해주세요.`
        );
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || `서버 저장 실패 (상태 코드: ${res.status})`);
      }

      setPublishedContent(workingContent);
      return {
        success: true,
        message: data.message || '게시용 콘텐츠가 저장되었습니다. 정적 배포 시 publishedContent.json도 함께 배포해주세요.',
      };
    } catch (err: any) {
      console.error('saveToPublishedSource error:', err);
      return {
        success: false,
        message: '저장 실패: ' + (err?.message || '네트워크 오류'),
      };
    }
  }, [content]);

  // Password verification and change functions
  const verifyAdminPassword = useCallback((password: string): boolean => {
    if (typeof window === 'undefined') return password === DEFAULT_ADMIN_PASSWORD;
    const stored = localStorage.getItem(ADMIN_PASSWORD_KEY);
    const validPwd = stored || DEFAULT_ADMIN_PASSWORD;
    return password.trim() === validPwd.trim();
  }, []);

  const loginWithPassword = useCallback((password: string): boolean => {
    if (verifyAdminPassword(password)) {
      setIsAdminMode(true);
      setIsPasswordModalOpen(false);
      return true;
    }
    return false;
  }, [verifyAdminPassword]);

  const changeAdminPassword = useCallback((newPassword: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword.trim());
    }
  }, []);

  // All visitors load shared publish data; browser-local IndexedDB media is intentionally ignored.
  useEffect(() => {
    fetch('/data/publishedContent.json', { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData) => {
        if (serverData && serverData.intro && serverData.spaces) {
          setPublishedContent(serverData);
          setContent(serverData);
        }
      })
      .catch((err) => {
        console.warn('Published content JSON could not be loaded; using bundled fallback.', err);
      });
  }, []);



  const updateField = useCallback((section: keyof SiteContent, key: string, value: any) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [key]: value,
      },
    }));
  }, []);

  const updateSpaceItem = useCallback((spaceId: string, updated: Partial<SpaceContentItem>) => {
    setContent((prev) => ({
      ...prev,
      spaces: {
        ...prev.spaces,
        items: prev.spaces.items.map((item) =>
          item.id === spaceId ? { ...item, ...updated } : item
        ),
      },
    }));
  }, []);

  const updateStepItem = useCallback(
    (stepNumber: number, updated: { title?: string; subtitle?: string; description?: string }) => {
      setContent((prev) => ({
        ...prev,
        floorplan: {
          ...prev.floorplan,
          steps: prev.floorplan.steps.map((s) =>
            s.step === stepNumber ? { ...s, ...updated } : s
          ),
        },
      }));
    },
    []
  );

  const updateVideoBlob = useCallback(async (file: File) => {
    const serverUrl = await uploadMediaToServer('video', file);
    const localBlobUrl = await saveVideoToIndexedDB(file);
    const finalUrl = serverUrl || localBlobUrl;
    setContent((prev) => ({
      ...prev,
      intro: {
        ...prev.intro,
        videoUrl: finalUrl,
        bgMode: 'video',
      },
    }));
    return finalUrl;
  }, []);

  const updateImageBlob = useCallback(async (file: File) => {
    const serverUrl = await uploadMediaToServer('intro-image', file);
    const localBlobUrl = await saveImageToIndexedDB(file);
    const finalUrl = serverUrl || localBlobUrl;
    setContent((prev) => ({
      ...prev,
      intro: {
        ...prev.intro,
        bgImageUrl: finalUrl,
        bgMode: 'image',
      },
    }));
    return finalUrl;
  }, []);

  const clearCustomImage = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      intro: {
        ...prev.intro,
        bgImageUrl: '',
      },
    }));
    if (typeof window !== 'undefined' && window.indexedDB) {
      const req = indexedDB.open(VIDEO_DB_NAME, 2);
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
          tx.objectStore(IMAGE_STORE_NAME).delete('custom_intro_image');
        }
      };
    }
  }, []);

  const updateFloorplanImageBlob = useCallback(async (file: File) => {
    const serverUrl = await uploadMediaToServer('floorplan', file);
    const localBlobUrl = await saveFloorplanImageToIndexedDB(file);
    const finalUrl = serverUrl || localBlobUrl;
    setContent((prev) => ({
      ...prev,
      floorplan: {
        ...prev.floorplan,
        imageUrl: finalUrl,
      },
    }));
    return finalUrl;
  }, []);

  const clearCustomFloorplanImage = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      floorplan: {
        ...prev.floorplan,
        imageUrl: '',
      },
    }));
    if (typeof window !== 'undefined' && window.indexedDB) {
      const req = indexedDB.open(VIDEO_DB_NAME, 3);
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
          tx.objectStore(IMAGE_STORE_NAME).delete('custom_floorplan_image');
        }
      };
    }
  }, []);

  const updatePanoramaImage = useCallback(async (spaceId: string, file: File): Promise<string> => {
    const serverUrl = await uploadMediaToServer('panorama', file, spaceId);
    const localBlobUrl = await savePanoramaImageToIndexedDB(spaceId, file);
    const finalUrl = serverUrl || localBlobUrl;
    setContent((prev) => ({
      ...prev,
      spaces: {
        ...prev.spaces,
        items: prev.spaces.items.map((sp) =>
          sp.id === spaceId ? { ...sp, panoramaUrl: finalUrl } : sp
        ),
      },
    }));
    return finalUrl;
  }, []);

  const setPanoramaUrl = useCallback((spaceId: string, url: string) => {
    setContent((prev) => ({
      ...prev,
      spaces: {
        ...prev.spaces,
        items: prev.spaces.items.map((sp) =>
          sp.id === spaceId ? { ...sp, panoramaUrl: url } : sp
        ),
      },
    }));
  }, []);

  const clearPanoramaImage = useCallback((spaceId: string) => {
    deletePanoramaImageFromIndexedDB(spaceId);
    setContent((prev) => ({
      ...prev,
      spaces: {
        ...prev.spaces,
        items: prev.spaces.items.map((sp) =>
          sp.id === spaceId ? { ...sp, panoramaUrl: null } : sp
        ),
      },
    }));
  }, []);

  const addHotspot = useCallback((params: AddHotspotParams): string => {
    const newId = `space-${Date.now()}`;
    setContent((prev) => {
      const nextNum = params.spaceNumber || String(prev.spaces.items.length + 1).padStart(2, '0');
      const newItem: SpaceContentItem = {
        id: newId,
        spaceNumber: nextNum,
        name: params.name || `NEW SPACE ${nextNum}`,
        koreanName: params.koreanName || `신규 공간 ${nextNum}`,
        category: params.category || 'LIVING',
        tagline: params.tagline || '새롭게 정의된 특화 공간입니다.',
        description: params.description || '평면도상 새롭게 추가된 공간입니다.',
        architecturalHighlights: params.architecturalHighlights || ['특화 인테리어 설계', '친환경 마감재 시공'],
        dimensionsCAD: params.dimensionsCAD || '4,000mm × 3,000mm',
        floorplan: {
          x: Math.max(0, Math.min(100, Math.round(params.x * 10) / 10)),
          y: Math.max(0, Math.min(100, Math.round(params.y * 10) / 10)),
          width: params.width || 20,
          height: params.height || 20,
        },
        panoramaUrl: null,
        connectedSpaceIds: ['lounge'],
      };

      return {
        ...prev,
        spaces: {
          ...prev.spaces,
          items: [...prev.spaces.items, newItem],
        },
      };
    });
    return newId;
  }, []);

  const updateHotspotPosition = useCallback((spaceId: string, x: number, y: number, width?: number, height?: number) => {
    setContent((prev) => ({
      ...prev,
      spaces: {
        ...prev.spaces,
        items: prev.spaces.items.map((item) => {
          if (item.id !== spaceId) return item;
          const currentFp = item.floorplan || { x: 50, y: 50, width: 20, height: 20 };
          return {
            ...item,
            floorplan: {
              ...currentFp,
              x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
              y: Math.max(0, Math.min(100, Math.round(y * 10) / 10)),
              ...(width !== undefined ? { width } : {}),
              ...(height !== undefined ? { height } : {}),
            },
          };
        }),
      },
    }));
  }, []);

  const removeHotspot = useCallback((spaceId: string) => {
    setContent((prev) => ({
      ...prev,
      spaces: {
        ...prev.spaces,
        items: prev.spaces.items.filter((item) => item.id !== spaceId),
      },
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setContent(DEFAULT_CONTENT);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      if (window.indexedDB) {
        const req = indexedDB.open(VIDEO_DB_NAME, 3);
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
            const tx = db.transaction(VIDEO_STORE_NAME, 'readwrite');
            tx.objectStore(VIDEO_STORE_NAME).clear();
          }
          if (db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
            const tx2 = db.transaction(IMAGE_STORE_NAME, 'readwrite');
            tx2.objectStore(IMAGE_STORE_NAME).clear();
          }
          if (db.objectStoreNames.contains(PANORAMA_STORE_NAME)) {
            const tx3 = db.transaction(PANORAMA_STORE_NAME, 'readwrite');
            tx3.objectStore(PANORAMA_STORE_NAME).clear();
          }
        };
      }
    }
  }, []);

  const exportJSON = useCallback(() => {
    const sanitized = sanitizeContentForLocalStorage(content);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sanitized, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hansoll_white_hill_content_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [content]);

  const importJSON = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        setContent({
          ...DEFAULT_CONTENT,
          ...parsed,
          brand: { ...DEFAULT_CONTENT.brand, ...(parsed.brand || {}) },
          intro: { ...DEFAULT_CONTENT.intro, ...(parsed.intro || {}) },
          floorplan: { ...DEFAULT_CONTENT.floorplan, ...(parsed.floorplan || {}) },
          spaces: { ...DEFAULT_CONTENT.spaces, ...(parsed.spaces || {}) },
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Invalid JSON import:', err);
      return false;
    }
  }, []);

  return (
    <ContentContext.Provider
      value={{
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
        addHotspot,
        updateHotspotPosition,
        removeHotspot,
        resetToDefault,
        exportJSON,
        importJSON,
        isAdminMode,
        setIsAdminMode,
        isAdminModalOpen,
        setIsAdminModalOpen,
        isPasswordModalOpen,
        setIsPasswordModalOpen,
        verifyAdminPassword,
        loginWithPassword,
        changeAdminPassword,
        activeAdminTab,
        setActiveAdminTab,
        isComparisonModalOpen,
        setIsComparisonModalOpen,
        diffList,
        diffCount,
        publishedContent,
        saveToPublishedSource,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
