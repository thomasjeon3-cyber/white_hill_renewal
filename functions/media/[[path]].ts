interface R2ObjectLike {
  body: ReadableStream;
  httpEtag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  writeHttpMetadata(headers: Headers): void;
}
interface R2BucketLike { get(key: string): Promise<R2ObjectLike | null> }
interface Env { MEDIA: R2BucketLike }

export async function onRequestGet({ request, env }: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/media\//, '')).replace(/^\/+/, '');
  if (!key || key.includes('..') || key.includes('\\')) return new Response('Not found', { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', object.httpMetadata?.cacheControl || 'public, max-age=86400');
  return new Response(object.body, { headers });
}
