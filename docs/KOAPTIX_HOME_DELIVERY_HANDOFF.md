# KOAPTIX Home Delivery Handoff

## 고정 원칙
- BUSAN 문제를 프론트 원인으로 되돌리지 않는다.
- 멀티 유니버스는 additive only다.
- complex_rank_history는 universe_code 없는 단일 이력 엔진이다.
- universe board source of truth:
  koaptix_rank_snapshot
  -> v_koaptix_universe_rank_history_dynamic
  -> v_koaptix_latest_universe_rank_board_u
- 홈 유니버스 전환은 page-level SSR full reload로 되돌리지 않는다.
- 성능 문제는 source rollback이 아니라 delivery layer 최적화로 해결한다.

## 홈 구조
- RankingBoardClient -> /api/rankings -> v_koaptix_latest_universe_rank_board_u
- CommandPalette -> /api/search -> v_koaptix_latest_universe_rank_board_u
- NeonMap -> /api/map -> v_koaptix_latest_universe_rank_board_u

## 현재 남은 문제
- /api/rankings cold timeout이 서울/부산/경기에서 간헐적으로 남아 있음
- /api/map MAP_TIMEOUT이 간헐적으로 남아 있음
- 같은 지역 재클릭은 빨라지나, cache 식은 뒤 재진입은 다시 느려질 수 있음
- 최대값 레인지 칩은 선 아래가 UX상 더 나음

## 다음 우선순위
1. src/app/api/rankings/route.ts tactical retry/fallback 강화
2. src/app/api/map/route.ts tactical retry/fallback 강화
3. src/components/home/RankingBoardClient.tsx prewarm 정리
4. src/components/home/NeonMap.tsx 칩/timeout UX 정리
5. 그래도 timeout 지속 시 DB read path 재검증

## 먼저 열 파일
- src/app/api/rankings/route.ts
- src/app/api/map/route.ts
- src/components/home/RankingBoardClient.tsx
- src/components/home/NeonMap.tsx