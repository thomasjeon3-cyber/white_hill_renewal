interface R2BucketLike {
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob, options?: {
    httpMetadata?: { contentType?: string; cacheControl?: string };
    customMetadata?: Record<string, string>;
  }): Promise<unknown>;
}
interface Env {
  MEDIA: R2BucketLike;
  MEDIA_UPLOAD_TOKEN: string;
}

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4v'
]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!env.MEDIA || !env.MEDIA_UPLOAD_TOKEN) {
    return json({ success: false, error: '미디어 저장소 또는 업로드 인증 설정이 완료되지 않았습니다.' }, 503);
  }
  const suppliedToken = request.headers.get('x-media-upload-token') || '';
  if (suppliedToken.length !== env.MEDIA_UPLOAD_TOKEN.length || suppliedToken !== env.MEDIA_UPLOAD_TOKEN) {
    return json({ success: false, error: '인증되지 않은 업로드 요청입니다.' }, 401);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return json({ success: false, error: 'multipart/form-data 형식으로 파일을 전송해야 합니다.' }, 415);
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ success: false, error: '업로드 양식을 읽을 수 없습니다.' }, 400); }

  const file = form.get('file');
  const category = String(form.get('category') || 'uploads').toLowerCase();
  if (!(file instanceof File)) return json({ success: false, error: '업로드할 파일이 없습니다.' }, 400);
  if (file.size < 1 || file.size > MAX_FILE_BYTES) return json({ success: false, error: '파일 크기는 1바이트~100MB 범위여야 합니다.' }, 413);

  const originalName = file.name.split(/[\\/]/).pop() || 'upload';
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return json({ success: false, error: '지원하지 않는 파일 형식입니다.' }, 415);
  const safeCategory = ['panorama', 'images', 'videos', 'floorplan'].includes(category) ? category : 'uploads';
  const safeName = originalName.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || `upload.${ext}`;
  const key = `${safeCategory}/${crypto.randomUUID()}-${safeName}`;
  const type = file.type || (['mp4', 'm4v', 'mov'].includes(ext) ? 'video/mp4' : ext === 'webm' ? 'video/webm' : `image/${ext === 'jpg' ? 'jpeg' : ext}`);

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { originalName, uploadedAt: new Date().toISOString() },
  });
  return json({ success: true, key, url: `/media/${key}`, size: file.size, contentType: type });
}
