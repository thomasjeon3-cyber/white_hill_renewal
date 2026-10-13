import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
function publishContentSyncPlugin(): Plugin {
  const handleApiRequest = (req: any, res: any, next: any) => {
    const rawUrl = req.url || '';
    const cleanUrl = rawUrl.split('?')[0].split('#')[0].replace(/\/+$/, '');

    // 1. Save published content
    if (cleanUrl === '/api/save-published-content' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8');
          const data = JSON.parse(body);
          const targetDir = path.resolve(__dirname, 'src', 'data');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const targetPath = path.resolve(targetDir, 'publishedContent.json');
          fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');

          // Also sync to public and dist if dist exists so static builds serve latest
          const publicTargetDir = path.resolve(__dirname, 'public', 'data');
          if (!fs.existsSync(publicTargetDir)) fs.mkdirSync(publicTargetDir, { recursive: true });
          fs.writeFileSync(path.resolve(publicTargetDir, 'publishedContent.json'), JSON.stringify(data, null, 2), 'utf-8');

          const distTargetDir = path.resolve(__dirname, 'dist', 'data');
          if (fs.existsSync(distTargetDir)) {
            fs.writeFileSync(path.resolve(distTargetDir, 'publishedContent.json'), JSON.stringify(data, null, 2), 'utf-8');
          }

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              message: '퍼블리시 소스코드(publishedContent.json)에 성공적으로 저장되었습니다.',
            })
          );
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(err?.message || err) }));
        }
      });
      return;
    }

    // 2. Upload media file directly to server public directory
    if (cleanUrl === '/api/upload-media' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8');
          const payload = JSON.parse(body);
          const { type, spaceId, filename, base64Data } = payload;

          if (!base64Data) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'base64Data가 누락되었습니다.' }));
            return;
          }

          // Strip data:image/...;base64, or data:video/...;base64,
          const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Clean, 'base64');

          let relativeUrl = '';
          let savePath = '';
          const safeId = (spaceId || filename || 'media_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');

          if (type === 'panorama') {
            const dir = path.resolve(__dirname, 'public', 'assets', 'panorama');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `${safeId}.jpg`;
            savePath = path.resolve(dir, fname);
            relativeUrl = `/assets/panorama/${fname}`;

            // Also copy to dist if dist exists
            const distDir = path.resolve(__dirname, 'dist', 'assets', 'panorama');
            if (fs.existsSync(distDir)) {
              fs.writeFileSync(path.resolve(distDir, fname), buffer);
            }
          } else if (type === 'intro-image') {
            const dir = path.resolve(__dirname, 'public', 'assets', 'images');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `custom_hero_${Date.now()}.jpg`;
            savePath = path.resolve(dir, fname);
            relativeUrl = `/assets/images/${fname}`;
            const distDir = path.resolve(__dirname, 'dist', 'assets', 'images');
            if (fs.existsSync(distDir)) {
              fs.writeFileSync(path.resolve(distDir, fname), buffer);
            }
          } else if (type === 'floorplan') {
            const dir = path.resolve(__dirname, 'public', 'assets', 'images');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `custom_floorplan_${Date.now()}.jpg`;
            savePath = path.resolve(dir, fname);
            relativeUrl = `/assets/images/${fname}`;
            const distDir = path.resolve(__dirname, 'dist', 'assets', 'images');
            if (fs.existsSync(distDir)) {
              fs.writeFileSync(path.resolve(distDir, fname), buffer);
            }
          } else if (type === 'video') {
            const dir = path.resolve(__dirname, 'public', 'assets', 'videos');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `custom_intro_${Date.now()}.mp4`;
            savePath = path.resolve(dir, fname);
            relativeUrl = `/assets/videos/${fname}`;
            const distDir = path.resolve(__dirname, 'dist', 'assets', 'videos');
            if (fs.existsSync(distDir)) {
              fs.writeFileSync(path.resolve(distDir, fname), buffer);
            }
          } else {
            const dir = path.resolve(__dirname, 'public', 'assets', 'uploads');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `${safeId}_${Date.now()}.dat`;
            savePath = path.resolve(dir, fname);
            relativeUrl = `/assets/uploads/${fname}`;
          }

          fs.writeFileSync(savePath, buffer);

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              url: relativeUrl,
              message: '미디어 파일이 서버 공용 저장소에 영구 저장되었습니다.',
            })
          );
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(err?.message || err) }));
        }
      });
      return;
    }

    // 3. Get published content
    if (cleanUrl === '/api/get-published-content' && req.method === 'GET') {
      try {
        const targetPath = path.resolve(__dirname, 'src', 'data', 'publishedContent.json');
        if (fs.existsSync(targetPath)) {
          const content = fs.readFileSync(targetPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 200;
          res.end(content);
          return;
        }
      } catch {
        // fall through
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.statusCode = 200;
      res.end(JSON.stringify({ exists: false }));
      return;
    }

    next();
  };

  return {
    name: 'vite-plugin-publish-sync',
    configureServer(server) {
      server.middlewares.use(handleApiRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApiRequest);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), publishContentSyncPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
