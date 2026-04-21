# KOAPTIX Nationwide Onboarding Baseline — 2026-04-13

## 목적
현재 살아난 KOREA_ALL home/ranking/map delivery 상태를 기준선으로 고정한다.
이 문서는 전국 데이터 온보딩 대작전의 1단계 체크포인트다.

## 현재 기준선
- KOREA_ALL 엔진은 다시 뜯지 않는다.
- 전국 onboard와 서비스 노출은 분리한다.
- 멀티 유니버스는 additive only로 유지한다.
- universe board source of truth는 아래 체인을 유지한다.

`koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`

## 현재 살아 있는 것
- home SSR seed는 degraded 허용 상태로 동작한다.
- /api/rankings 는 KOREA_ALL에서 dynamic tactical delivery를 사용한다.
- /api/map 는 KOREA_ALL에서 dynamic tactical delivery를 사용한다.
- NeonMap은 scoped district naming을 사용한다.
- cold first-hit timeout 민감도는 잔존할 수 있으나, 동일 세션에서 응답이 살아나는 상태를 확인했다.

## 이번 단계에서 수정 고정 대상
- src/app/page.tsx
- src/lib/koaptix/queries.ts
- src/app/api/rankings/route.ts
- src/app/api/map/route.ts
- src/components/home/NeonMap.tsx

## 다음 단계 목표
- 전국 universe readiness 판정표 작성
- onboard와 visible을 분리한 registry 운영
- macro 전체 우선 정렬
- 이후 SGG batch exposure 진행

## 운영 경고
- 현재 기준선 확인 없이 patch-on-patch 금지
- 맥락이 꼬이면 새 채팅방으로 이동 후 현재 파일 본문부터 다시 확인
- source rollback 금지

## 현재 상태 메모

- macro universe 전체 공개 레이어는 이미 registry 기준으로 열려 있다.
- selector / search / ranking은 universe_code 계약 기준으로 정렬된 상태다.
- 현재 미완료는 SGG staged exposure의 Batch 2 확장이다.
- cold first-hit에서 KOREA_ALL home SSR seed / KPI timeout은 잔존 가능하나, nationwide onboarding 자체를 막는 blocker로 보지 않는다.

## 다음 액션

- Batch 2 대상 SGG를 DB에서 코드 + 라벨 + readiness 기준으로 추출한다.
- 서울/경기/광역시 핵심 SGG를 우선 batch로 구성한다.
- 그 결과를 기준으로 src/lib/koaptix/universes.ts exact replacement를 진행한다.

## Batch 2 적용 메모

- SGG Batch 2는 현재 KOREA_ALL tactical radar payload에서 실제로 상위권에 드러난 미공개 서울 core SGG를 기준으로 먼저 연다.
- 이번에 추가한 staged exposure:
  - SGG_11740 강동구
  - SGG_11470 양천구
  - SGG_11170 용산구
  - SGG_11410 서대문구
  - SGG_11200 성동구
- 경기/광역시 Batch 3는 별도 candidate audit 결과를 보고 이어서 연다.

## Macro readiness alignment 메모

- JEONBUK_ALL은 현재 사용자 확인 기준 latest board / dynamic readiness가 확인되지 않아 임시로 서비스 노출에서 제외한다.
- JEONNAM_ALL은 서비스 가능 상태로 유지한다.
- 다음 단계는 macro 전체 readiness를 한 번에 점검해, exposure와 DB readiness가 어긋난 macro가 더 있는지 확인하는 것이다.

## Macro readiness alignment 결과

- macro readiness audit 기준 `GANGWON_ALL`, `JEONBUK_ALL` 두 macro만 `NOT_READY`로 판정됐다.
- 따라서 현재 서비스 노출 macro는 readiness와 맞추기 위해 `강원 전체`, `전북 전체`를 임시 비노출로 둔다.
- `GWANGJU_ALL`은 `READY_FOR_EXPOSURE` 상태이므로 비노출 대상이 아니다. 첫 진입 timeout은 cold-path 관찰 이슈로 분리한다.

## 현재 상태 메모

- macro universe 공개 레이어는 registry 기준으로 구현돼 있다.
- selector / search / ranking은 universe_code 계약 기준으로 정렬된 상태다.
- KOREA_ALL home/ranking/map delivery는 살아 있으나 cold first-hit timeout 민감도는 잔존한다.
- chart 안정화 1차는 들어가서, 지역 필터 상태에서도 전국 공통 차트가 완전히 쉽게 비지 않도록 보강된 상태다.
- 현재 MarketChartCard는 아직 전국 공통 차트 개념으로 동작한다.
- 제품 방향상 지역 필터를 걸면 그 지역의 KOAPTIX 시가총액 지수가 표시되도록 universe-aware chart로 전환해야 한다.

## Macro readiness alignment 결과

- macro readiness SQL 결과 기준:
  - GANGWON_ALL = NOT_READY
  - JEONBUK_ALL = NOT_READY
  - 그 외 macro = READY_FOR_EXPOSURE
- 따라서 강원 전체와 전북 전체는 DB readiness와 서비스 노출을 정렬할 필요가 있다.
- 광주 전체, 충북 전체 등은 readiness상 공개 가능 상태이며, 간헐적 timeout은 cold-path/delivery 이슈로 본다.

## SGG readiness 결과

- sgg_total_detected = 204
- sgg_ready_for_service = 204
- 즉 SGG coverage는 DB 기준으로 상당 수준 올라와 있다.
- 다음 공개 전략은 서울 다음으로 경기 + 광역시 핵심 SGG Batch 3 staged exposure가 자연스럽다.

## 다음 액션

- universes.ts 에서 GANGWON_ALL / JEONBUK_ALL 노출 상태를 readiness와 맞춘다.
- 지역 필터 시 지역별 KOAPTIX 시가총액 지수를 보여주는 universe-aware chart 전환을 진행한다.
- 이후 경기 + 광역시 핵심 SGG Batch 3 공개로 이동한다.

## 2026-04-14 Index Pipeline Investigation
/api/map route service gating 정렬 완료. 기존 normalizeUniverseCode 기반 direct hit 허용 상태를 resolveServiceUniverseCode 기준으로 교체해 hidden macro 및 비노출 SGG direct query를 KOREA_ALL fallback으로 접도록 수정했다. 실검증 결과 GANGWON_ALL, JEONBUK_ALL은 KOREA_ALL로 fallback, GWANGJU_ALL은 그대로 유지 확인.

2026-04-14 index pipeline 조사 결과, daily cron job(public.capture_koaptix_daily_snapshot)은 정상 실행 중이나 koaptix_index_snapshot / v_koaptix_index_timeseries / v_koaptix_latest_index_card 계열을 직접 갱신하지 않는 것으로 확인됐다. 현재 홈 전국 공통 차트 소스(v_koaptix_total_market_cap_history)는 2026-04-12까지 최신 상태이나, index timeseries는 KOREA_ALL/SEOUL_ALL만 존재하고 snapshot_date가 2025-01-31에서 멈춰 있다. 따라서 지역 차트 전환은 프론트 문제가 아니라 DB index write path 부재/미연결 문제로 판정하며, 복구 전까지 홈 메인 차트는 전국 공통 fallback 유지가 맞다.

## 2026-04-14 Index Pipeline Investigation

### 결론
현재 KOAPTIX index chain은 DB read layer(`koaptix_index_snapshot -> v_koaptix_index_timeseries -> v_koaptix_latest_index_card -> v_koaptix_home_latest_payload`)는 존재하나, 현재 운영 중인 daily capture / safe finalize / public helper chain에는 index snapshot write path가 연결되어 있지 않은 것으로 확인되었다.

### 확인 결과
- `capture_koaptix_daily_snapshot()` 내부 dependency check 기준:
  - `koaptix_index_snapshot`
  - `v_koaptix_index_timeseries`
  - `v_koaptix_latest_index_card`
  - `refresh_koaptix_total_market_cap_history()`
  - `refresh_koaptix_home_kpi()`
  - `refresh_koaptix_latest_rank_board()`
  - `sync_rank_snapshot_from_history()`
  - `run_koaptix_safe_finalize(date)`
  전부 direct touch/call 없음으로 확인.
- public helper chain 스캔 결과:
  - `refresh_koaptix_front_views()`
  - `refresh_koaptix_front_views_legacy()`
  - `run_koaptix_safe_finalize(date)`
  - `refresh_koaptix_total_market_cap_history()`
  - `refresh_koaptix_home_kpi()`
  전부 index chain touch 없음.
- `koaptix_index_snapshot` 현 상태:
  - `KOREA_ALL / KOAPTIX_KOREA`: 6 rows, last_created_at = 2026-03-27
  - `SEOUL_ALL / KOAPTIX_SEOUL`: 7 rows, last_created_at = 2026-03-19
  - 최신 `snapshot_date`는 여전히 2025-01-31에서 멈춤.
- 반면 `v_koaptix_total_market_cap_history` 최신 `snapshot_date`는 2026-04-12까지 살아 있음.
- 따라서 홈 전국 공통 차트 fallback은 정상이나, 지역별 index chart source는 stale 상태로 판정.

### 운영 판정
- 지역 차트 전환 blocker는 프론트가 아니라 DB index write path 부재/미연결 문제다.
- 복구 전까지 홈 메인 차트는 전국 공통 fallback 유지가 맞다.
- `v_koaptix_home_latest_payload`는 현재 전국 고정 legacy payload로 취급한다.

### 다음 액션
1. `refresh_koaptix_index_snapshot(run_date)` 신규 helper 설계
2. helper source를 현행 universe/rank snapshot 구조와 정렬
3. safe finalize 또는 dedicated finalize chain에 index refresh 단계 편입
4. `v_koaptix_index_timeseries` 최신성 및 universe coverage 복구 후 지역 차트 전환 재개


refresh_koaptix_index_snapshot() 1차안은 latest/forward generation에는 정상 동작하나, 이미 생성된 최초 snapshot_date보다 더 과거 날짜를 나중에 backfill하는 경우 base_date > snapshot_date 제약(chk_koaptix_index_snapshot_base_date)에 걸릴 수 있음 확인. 따라서 현재 버전은 운영용 forward-only helper로 간주하고, historical rebase/backfill support는 2차 작업으로 분리한다.

2026-04-15 기준 cron job #1 schedule을 5 15 * * * / command=select public.run_koaptix_safe_finalize(((now() at time zone 'Asia/Seoul')::date - 1)) 형태로 전환 확인. 수동 실행 기준 2026-04-14 macro index snapshot 16건 생성까지 검증 완료. 현재 남은 것은 다음 실제 스케줄 실행 1회 확인뿐이며, 완료 시 DB index write path 자동화 전환도 완료로 판정한다.

2026-04-15 기준 cron job #1은 schedule=5 15 * * * / command=select public.run_koaptix_safe_finalize(((now() at time zone 'Asia/Seoul')::date - 1)) 형태로 safe finalize 체인으로 전환 확인. koaptix_index_snapshot에는 2026-04-14 기준 16개 macro row 생성 확인. 다만 job_run_details 상 새 command로 실행된 첫 예약 run은 아직 확인 전이며, 다음 실제 스케줄 실행 1회 확인 후 자동화 전환 완료로 확정한다.

## 2026-04-16 Macro Index Common-Base Selective Cutover

- 대상: non-KOREA/SEOUL 14개 macro universe
- 전략: `2026-04-01` common-base family를 stage 검증 후 production `koaptix_index_snapshot`에 selective cutover
- 유지: `KOREA_ALL`, `SEOUL_ALL` 기존 `2024-07-31` legacy family 유지
- 결과:
  - 14개 universe `min_snapshot_date = 2026-04-01`
  - 14개 universe `base_date = 2026-04-01`
  - `2026-04-01` base row `index_value = 1000.0000`
- helper continuity:
  - `refresh_koaptix_index_snapshot(p_run_date)`는 기존 earliest base를 재사용하는 구조이므로 cutover 후 common-base continuity 유지 가능
- 주의:
  - `2026-04-13` 누락은 stage/차트 버그가 아니라 upstream source gap으로 해석
  - 광주 등 flat universe는 현재 `History Building` 정책 유지
  - historical backfill은 별도 2차 작업

  ## 2026-04-16 Macro Index Selective Cutover Status

- non-KOREA/SEOUL 14개 macro universe를 `2026-04-01 common-base family`로 production 반영 완료
- `KOREA_ALL`, `SEOUL_ALL`은 기존 `2024-07-31` legacy family 유지
- 광주/부산 등 regional home chart는 새 family를 읽으며, flat universe는 `History Building` 정책 유지
- `2026-04-13` 누락은 stage/프론트 문제가 아니라 upstream source gap으로 해석
- 초기 홈 로딩 timeout은 별도 성능 안정화 과제로 분리

## 2026-04-16 Macro Index Selective Cutover Final Status

- non-KOREA/SEOUL 14개 macro universe를 `2026-04-01 common-base family`로 production 반영 완료
- `KOREA_ALL`, `SEOUL_ALL`은 기존 `2024-07-31` legacy family 유지
- helper 재실행 후에도 14개 universe의 `base_date = 2026-04-01` continuity 유지 확인
- `2026-04-13` 누락은 stage/프론트 문제가 아니라 upstream source gap으로 해석
- 광주/부산 등 regional home chart는 새 family를 읽으며, flat universe는 `History Building` 정책 유지
- 초기 홈 로딩 timeout은 별도 성능 안정화 과제로 분리

홈/상세 차트의 Recharts width(-1)/height(-1) 경고는 ResponsiveContainer 제거 및 실측 width/height 직접 주입 방식으로 해소됨. 현재 홈/맵은 정상 응답하며, 남은 이슈는 기능 장애가 아니라 KOREA_ALL cold path 응답 편차 및 일부 regional latest fallback 로그 정리 수준임.