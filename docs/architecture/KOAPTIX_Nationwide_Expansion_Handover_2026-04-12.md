# KOAPTIX 인수인계 메모 — 전국 확장 1차 staged exposure 완료 기준

## 1. 이 방의 목적과 결론

이 방의 목적은 TOP1000 정렬 이후 실제 전국 확장 단계로 넘어가기 위한 기반을 마감하는 것이었다.

현재 결론은 다음과 같다.

- `resolveServiceUniverseCode()` 기준의 service exposure gate가 home / search / tactical board / TOP1000 board에 정렬됐다.
- `/ranking` page와 `/api/ranking` route가 분리되어 `KOAPTIX TOP1000` 작전실이 실제 서비스 흐름으로 동작한다.
- `RankingBoardClient`는 home tactical / ranking full-board 공용 컴포넌트로 정리됐다.
- `/ranking`은 `universe`, `tier`, `q`, `complexId` URL state를 유지한다.
- home hero에 현재 universe를 유지한 채 `/ranking`으로 진입하는 CTA가 붙어 있다.
- `UniverseSelector`는 전국 확장용 검색형 하이브리드 selector로 바뀌었고, 기본 노출은 현재 선택한 광역권 기준 시군구만 보여준다.
- `sync_rank_snapshot_from_history(run_date)` exact replacement가 반영되어 `SGG_<5자리>` snapshot과 latest board가 실제로 생성된다.
- readiness 상위 10개 SGG가 staged exposure 방식으로 service registry에 반영됐다.

## 2. 현재 실제 완료 상태

### 2-1. 프론트 / 서비스 계층
- `src/lib/koaptix/universes.ts`
- `src/lib/koaptix/queries.ts`
- `src/app/api/search/route.ts`
- `src/app/api/rankings/route.ts`
- `src/app/api/ranking/route.ts`
- `src/app/page.tsx`
- `src/app/ranking/page.tsx`
- `src/components/home/CommandPalette.tsx`
- `src/components/home/RankingBoardClient.tsx`
- `src/components/home/UniverseSelector.tsx`

위 파일들이 현재 멀티 유니버스 service contract와 staged exposure 구조 기준으로 정렬돼 있다.

### 2-2. 현재 서비스 노출 universe
#### 광역
- `KOREA_ALL`
- `SEOUL_ALL`
- `BUSAN_ALL`
- `GYEONGGI_ALL`

#### SGG staged exposure 1차
- `SGG_11710` 송파구
- `SGG_11650` 서초구
- `SGG_11680` 강남구
- `SGG_41135` 분당구
- `SGG_11440` 마포구
- `SGG_11560` 영등포구
- `SGG_11590` 동작구
- `SGG_11500` 강서구
- `SGG_11290` 성북구
- `SGG_11230` 동대문구

## 3. 이번 방에서 실제 한 일

### 3-1. TOP1000 작전실 마감
- `/api/ranking`과 `/ranking` 분리
- `RankingBoardClient` props 기반 공용화
- ranking `tier/q` URL state 유지
- ranking page scroll 모드 유지

### 3-2. 홈 ↔ 작전실 진입선 마감
- home hero CTA 추가
- 현재 universe 유지 진입

### 3-3. UniverseSelector 전국 확장 대응
- quick chip + 검색형 패널 구조
- 기본 노출은 현재 권역 기준 SGG만 표시
- 검색 입력 시 전체 enabled universe 검색
- current macro에 SGG staged exposure가 없으면 안내 메시지 출력

### 3-4. SGG snapshot / board 생성 복구
- `sync_rank_snapshot_from_history(run_date)` exact replacement로 SGG additive 생성 반영
- `koaptix_rank_snapshot`와 `v_koaptix_latest_universe_rank_board_u`에 `SGG_<5자리>` row 생성 확인
- 대표 샘플 `SGG_11680`, `SGG_11560` 조회 확인

### 3-5. SGG staged exposure 1차
- readiness 상위 10개 SGG registry enabled
- 홈 / 랭킹 / 검색 / selector에서 실제 동작 확인

## 4. 다음 방에서 바로 할 일

### 우선순위 1. macro universe를 광역시·도 17종까지 확장
#### DB 함수
`public.sync_rank_snapshot_from_history(p_run_date date)`

현재 4 macro만 만드는 블록을 17 macro 기준으로 확대:
- `curr_union` macro mapping block
- `prev_union` macro mapping block
- macro prefix filter block
- order by macro ordering block

대상 prefix:
- 11 서울
- 26 부산
- 27 대구
- 28 인천
- 29 광주
- 30 대전
- 31 울산
- 36 세종
- 41 경기
- 42 강원
- 43 충북
- 44 충남
- 45 전북
- 46 전남
- 47 경북
- 48 경남
- 50 제주

#### 코드 파일
`src/lib/koaptix/universes.ts`
- `MacroUniverseCode`
- `MACRO_UNIVERSE_REGISTRY`

위 두 블록을 17 macro 기준으로 확장

### 우선순위 2. macro 생성 검증
- snapshot row 생성 확인
- latest board row 생성 확인
- `/?universe=DAEGU_ALL`, `/?universe=INCHEON_ALL`, `/ranking?universe=GWANGJU_ALL` 확인

### 우선순위 3. staged exposure 2차 여부 결정
macro 확장 검증 후 필요 시 추가 SGG staged exposure 확대

## 5. 다음 방에서 하지 말 것
- source of truth를 legacy view로 되돌리기
- `complex_rank_history`를 멀티 유니버스 direct source처럼 다루기
- registry 검증 없이 universe를 한 번에 전부 열기
- 이미 완료된 파일에 중복 패치 다시 지시하기
- build/dev 검증 없이 다음 단계로 넘어가기

## 6. 작업 전달/실행 프로세스
- 수정 지시 전에 반드시 현재 로컬 파일 본문을 보고 완료/미완료를 판정한다.
- 이미 반영된 변경은 다시 지시하지 않는다.
- 모든 수정 지시는 아래 7개를 반드시 포함한다.
  1. 이번 단계 목표
  2. 수정할 정확한 파일 경로
  3. 파일 내 검색할 위치/블록
  4. 통교체 또는 exact replacement 코드
  5. 저장 후 실행할 명령
  6. 성공 기준
  7. 실패 시 다시 보낼 로그/스크린샷/파일 본문
- DB 작업도 같은 방식으로 SQL, 실행 순서, 성공 기준, 실패 시 다시 보낼 결과를 함께 제시한다.