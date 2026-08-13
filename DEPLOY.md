# 배포 (프론트엔드)

Cloudflare Pages에 올린다. 무료 플랜에서 **상업적 사용이 허용**되고 무료 주소가 나온다.

> Vercel은 쓰지 않는다. 무료(Hobby) 플랜이 상업적 사용을 금지하고 있어 학원 같은 영리 사업은
> 유료 Pro(월 $20)를 써야 한다.

## 정적 사이트로 나간다

모든 화면이 브라우저에서 그려지고 데이터는 API 서버에서 가져오므로,
`next.config.ts`에 `output: 'export'`를 두어 **순수 HTML·JS·CSS로 내보낸다.**

서버가 필요 없어 Cloudflare Pages 말고 어떤 정적 호스팅에도 그대로 올릴 수 있다.

```bash
pnpm build   # out/ 폴더에 정적 파일 생성
```

## 1. Cloudflare Pages 연결

1. [dash.cloudflare.com](https://dash.cloudflare.com) 가입
2. **Workers & Pages → Create → Pages → Connect to Git** 에서 `academy-frontend` 선택
3. 빌드 설정

| 항목 | 값 |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `pnpm build` |
| Build output directory | `out` |

## 2. 환경변수 넣기

**Settings → Environment variables** 에 넣는다.

| 변수 | 값 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Railway API 주소 (`https://...up.railway.app`) |

⚠️ **`NEXT_PUBLIC_` 값은 빌드할 때 코드 안에 박힌다.** 나중에 이 값을 바꾸면 저장만으로는
반영되지 않고 **다시 배포(Retry deployment)** 해야 한다.

## 3. 서버와 연결 확인

API 서버(Railway)의 `CORS_ORIGIN`에 Cloudflare Pages 주소를 넣어야 한다.
두 값이 서로를 가리키지 않으면 로그인 시 브라우저가 요청을 막는다.

배포된 주소로 접속해 로그인이 되면 성공이다.

## 알아둘 점

- **토큰은 브라우저 localStorage에 있다.** 지금은 학습·시연 단계라 그대로 두지만, 실제로 원생
  개인정보를 넣고 운영하기 전에 httpOnly 쿠키로 옮기는 것을 검토해야 한다.
- **미리보기 배포**가 브랜치마다 자동으로 생긴다. PR을 올리면 그 브랜치 주소가 만들어져 머지 전에
  화면을 확인할 수 있다.
- 빌드가 실패하면 Cloudflare Pages의 배포 로그를 먼저 본다. 대부분 환경변수 누락이다.
