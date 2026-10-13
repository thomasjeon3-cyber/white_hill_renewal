# 평창연수원 화이트힐 리모델링 안내 홈페이지 — Cloudflare Pages 배포본

기존 디자인과 공간 구성을 유지하고, 방문자에게는 공통 게시 데이터만 표시하도록 구성한 Vite/React 프로젝트입니다.

## Cloudflare Pages 배포 설정

- Git 연동 방식 권장
- Framework preset: Vite (또는 None)
- Build command: `npm run build`
- Build output directory: `dist`
- **Deploy command: 비워 두세요** (Cloudflare Pages Git 연동은 빌드 후 Pages가 자동 배포)
- Node.js: 20 이상 권장

## 현재 미디어

- 기본 이미지·동영상은 `public/assets/`에 포함되어 빌드 결과물로 복사됩니다.
- 공통 콘텐츠 데이터는 `public/data/publishedContent.json`에서 로드합니다.
- 브라우저의 로컬 저장 데이터가 다른 방문자의 콘텐츠 표시를 덮어쓰지 않습니다.
- 이미지/동영상/평면도/파노라마의 기본 경로는 사이트 루트 기준입니다. Pages 기본 도메인 또는 사용자 지정 도메인 루트에 배포하세요.

## 향후 관리자 미디어 업로드 API (선택 기능)

Cloudflare Pages Functions와 R2 바인딩을 위한 기본 API가 포함되어 있습니다. 공개 방문자 홈페이지에서는 관리자 UI가 숨겨져 있으며, 업로드 API는 기본적으로 비활성 상태입니다.

1. Cloudflare R2에서 `whitehill-media` 버킷을 생성하거나 `wrangler.jsonc`의 `bucket_name`을 기존 버킷 이름으로 변경합니다.
2. Pages 프로젝트의 Settings → Functions → R2 bucket bindings에서 변수 이름 `MEDIA`를 해당 버킷에 연결합니다.
3. Pages 프로젝트의 Settings → Variables and Secrets에 `MEDIA_UPLOAD_TOKEN`을 Secret으로 추가합니다. 소스코드나 프런트엔드 환경변수에 토큰을 넣지 마세요.
4. `/api/upload-media`에 `multipart/form-data`로 `file` 및 선택적 `category` 필드를 보내고, `x-media-upload-token` 헤더에 토큰을 전달하면 됩니다.
5. 반환되는 `/media/<key>` URL로 공개 미디어를 제공합니다.

업로드 API는 인증 토큰과 파일 형식/크기 검사를 수행합니다. 이 API는 향후 관리자 UI와 연결하기 위한 기반이며, 관리자 로그인 화면이나 게시 콘텐츠 수정/저장 API는 포함하지 않습니다. 현재 선택 사항인 방문자 전용 배포에서는 미디어를 새로 업로드할 필요 없이 기존 파일이 공개됩니다.

## Cloudflare 배포 오류 해결

Cloudflare Pages의 Git 연동 배포에서는 Deploy command에 `npx wrangler deploy`를 입력하지 마세요. 이 명령은 일반 Workers 배포 명령이어서 Pages의 `dist` 정적 사이트 배포와 맞지 않습니다.

- Git 연동: Build command `npm run build`, Build output directory `dist`, Deploy command는 비워 둡니다.
- 수동 CLI 배포가 필요한 경우 빌드 후 `npx wrangler pages deploy dist --project-name=whitehill-renovation-site`를 사용합니다. 프로젝트 이름이 다르면 실제 Pages 프로젝트 이름으로 바꾸세요.

## 빌드 및 로컬 확인

```bash
npm install
npm run build
npm run preview
```

## 중요

- `functions/` 경로가 실행되는 Cloudflare Pages 배포는 Git 연동 또는 Wrangler 기반 배포를 사용하세요. 대시보드의 단순 정적 파일 업로드 방식은 Functions를 배포하지 않습니다.
- R2 버킷 및 `MEDIA_UPLOAD_TOKEN`은 Cloudflare 대시보드에서 별도로 설정해야 합니다. 이 ZIP만으로 Cloudflare 계정에 실제 배포되지는 않습니다.
