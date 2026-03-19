# KOAPTIX Step 13 — Main Home Frontend Starter

이 묶음은 KOAPTIX 서울 MVP 메인 화면을 바로 올릴 수 있게 만든 프론트엔드 스타터입니다.

포함 내용:
- `API_SPEC_HOME.md`: 메인 홈 API 명세서
- `src/app/api/home/route.ts`: Next.js Route Handler
- `src/lib/supabase/admin.ts`: 서버 전용 Supabase admin client
- `src/lib/koaptix/home.ts`: payload view 조회용 DAL
- `src/app/page.tsx`: 홈 페이지 예시
- `src/components/home/*`: 지수 카드 / 차트 / 랭킹 컴포넌트
- `src/lib/formatters.ts`: 숫자 / 등락 / 티어 포맷터

## 추천 구조
- App Router 기반 Next.js
- 홈 페이지는 Server Component에서 렌더
- API는 `/api/home` Route Handler로 노출
- Supabase `service_role` 키는 **서버에서만 사용**

## 설치
```bash
npm install
npm run dev
```

## 환경변수
`.env.local.example`를 복사해 `.env.local`로 만드세요.

```bash
cp .env.local.example .env.local
```

## 핵심 연결 포인트
이 프론트는 아래 뷰를 읽습니다.
- `public.v_koaptix_home_seoul_latest_payload`

## 주의
`SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출하면 안 됩니다. 
이 프로젝트에서는 Route Handler / Server Component 내부에서만 사용하게 설계되어 있습니다.
