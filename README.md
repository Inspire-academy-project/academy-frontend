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
| `/kiosk`      | 출결 패드 | 학생이 번호를 누르는 화면 |
| `/attendance` | 원장·강사 | 날짜별 출결 체크 + 등원·하원 시각 |
| `/students`   | 원장·강사 | 학생 목록/등록         |
| `/payments`   | 원장      | 납부 현황, 미납자 조회 |
| `/videos`     | 전체      | 일일4제 영상 목록/재생 |
| `/me`         | 학생      | 내 출결·납부 현황      |

### 출결 패드 (`/kiosk`)

학생이 번호를 누르면 그날 첫 입력은 **등원**, 그 뒤로는 **하원** 시각으로 기록된다.
실수로 여러 번 눌러도 등원 시각은 덮이지 않는다.
지각·결석 판정은 하지 않는다. 원장·강사가 `/attendance`에서 시각을 보고 정한다.

패드는 로그인을 할 수 없으므로 처음 열면 등록 화면이 나온다.
서버의 `KIOSK_TOKEN` 값을 한 번 넣으면 그 기기에 저장되고, 다음부터는 바로 번호 화면이 열린다.

기기 등록을 해제하려면 **오른쪽 위 시계를 2초간 길게 누른다.**
학생이 지나가다 누르는 일이 없도록 눈에 띄는 버튼 대신 길게 누르기로 숨겨 뒀다.

## 4. 자주 쓰는 명령어

| 명령어       | 설명          |
| ------------ | ------------- |
| `pnpm dev`   | 개발 서버     |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint`  | ESLint 검사   |
