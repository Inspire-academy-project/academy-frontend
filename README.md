# academy-frontend

재수 학원 관리 웹 서비스의 프론트엔드. 출결 관리 · 일일4제 영상 · 학원비 납부 관리.

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4

> API 서버는 별도 저장소: [academy-backend](https://github.com/Inspire-academy-project/academy-backend)

## 1. 실행

```bash
pnpm install
cp .env.example .env.local
pnpm dev        # http://localhost:3000
```

API 서버(`academy-backend`)가 `http://localhost:4000`에서 함께 실행되고 있어야 한다.

| 환경변수              | 기본값                  | 설명          |
| --------------------- | ----------------------- | ------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API 서버 주소 |

## 2. API 호출 방법

[src/lib/api.ts](src/lib/api.ts)의 `api()` 함수를 쓴다. 토큰을 자동으로 헤더에 붙이고, 실패하면 `ApiError`를 던진다.

```ts
import { api, setToken } from '@/lib/api';

// 로그인
const result = await api<{ token: string }>('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
setToken(result.token);

// 이후 요청은 토큰이 자동으로 붙는다
const students = await api<Student[]>('/students');
```

파일 업로드는 `FormData`를 그대로 넘기면 된다 (Content-Type을 자동으로 비운다).

```ts
const form = new FormData();
form.append('video', file);
form.append('title', title);
await api('/videos', { method: 'POST', body: form });
```

## 3. 화면 구성 (예정)

| 경로          | 권한      | 설명                   |
| ------------- | --------- | ---------------------- |
| `/login`      | 공개      | 로그인                 |
| `/attendance` | 원장·강사 | 날짜별 출결 체크       |
| `/students`   | 원장·강사 | 학생 목록/등록         |
| `/payments`   | 원장      | 납부 현황, 미납자 조회 |
| `/videos`     | 전체      | 일일4제 영상 목록/재생 |
| `/me`         | 학생      | 내 출결·납부 현황      |

## 4. 자주 쓰는 명령어

| 명령어       | 설명          |
| ------------ | ------------- |
| `pnpm dev`   | 개발 서버     |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint`  | ESLint 검사   |
