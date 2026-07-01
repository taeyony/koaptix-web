# KOAPTIX Official Index v1 Service Read Path Inventory — 2024-01-01 Genesis Hold

## One-Line Conclusion
The `KOAPTIX_KOREA` genesis index row is valid and committed, but public exposure remains blocked because current service-facing latest/home payloads still use the existing `2024-07-31` base chain rather than a complete official `2024-01-01` base chain.

## Non-Developer Explanation
KOAPTIX 공식 지수의 기준점은 이제 DB 안에 존재한다. `KOAPTIX_KOREA / KOREA_ALL` 지수는 `2024-01-01 = 1000.0000`이라는 공식 시작점을 갖게 되었고, 이 시작점은 검증된 `151`개 KOREA_ALL 기준 단지를 바탕으로 기록되었다.

하지만 이것이 곧 웹사이트가 공식 지수를 공개 표시하고 있다는 뜻은 아니다. 현재 홈 화면과 최신 지수 payload는 여전히 기존 서비스 체인인 `2024-07-31` 기준 데이터를 보여준다.

지금 그대로 공개하면 사용자는 `2024-01-01` 공식 기준점과 `2024-07-31` 기존 서비스 기준선이 섞인 화면을 보게 된다. 이는 지수의 기준일, 값, 구성 단지 수를 혼동하게 만들 수 있다.

따라서 다음 작업은 배포가 아니다. 다음 작업은 공식 기준 체인을 어떻게 서비스에 연결할지, 기존 서비스 체인과 어떻게 전환하거나 분리할지 결정하는 것이다.

## DB Readiness Summary
- target table: `public.koaptix_index_snapshot`
- index_code: `KOAPTIX_KOREA`
- universe_code: `KOREA_ALL`
- snapshot_date: `2024-01-01`
- row count: `1`
- matching row count: `1`
- index_name: `KOAPTIX Korea`
- base_date: `2024-01-01`
- base_value: `1000.0000`
- index_value: `1000.0000`
- base_market_cap_krw: `61917766392052`
- total_market_cap_krw: `61917766392052`
- component_complex_count: `151`
- payload hash: `03A34979E9FA8905850A1978CE66491E1F69023668C5895A8238515BE0F78A9F`
- KOREA_ALL rank rows at `2024-01-01`: `151`
- rank source market cap sum: `61917766392052`
- `public.v_koaptix_index_timeseries` contains the official genesis row: `YES`

## Service Read Path Inventory
### `src/lib/koaptix/queries.ts`
- `getIndexChartPayload` uses:
  - `public.v_koaptix_latest_index_card`
  - `public.v_koaptix_index_timeseries`
- `getHomeKpi` uses:
  - `public.v_koaptix_home_kpi`
- The service layer expects index payload fields such as:
  - `index_code`
  - `universe_code`
  - `index_value`
  - `total_market_cap_krw`
  - `component_complex_count`

### `src/app/page.tsx`
- The home page calls:
  - `getHomeKpi()`
  - `getIndexChartPayload(universeCode, 24)`
- The home chart is already universe-aware through the selected service universe.

### `src/lib/koaptix/home.ts`
- `getKoaptixHomePayload` uses:
  - `public.v_koaptix_home_latest_payload`
- It returns:
  - `index_card`
  - `index_chart`
  - `top50`
  - ranked complex counts

### `src/app/api/home/route.ts`
- `/api/home` uses `getKoaptixHomePayload`.
- Its response is therefore backed by `public.v_koaptix_home_latest_payload`.

### `src/lib/koaptix/universes.ts`
- `DEFAULT_UNIVERSE_CODE = KOREA_ALL`
- `KOREA_ALL` is currently enabled for:
  - home
  - search
  - ranking
  - map

### Ranking, Map, And Search Paths
- Ranking, map, and search API paths continue to use:
  - `public.koaptix_rank_snapshot`
  - latest/universe rank board views
- They do not read the official index table directly.

## Baseline Mismatch
### Official-Base Chain
- base_date: `2024-01-01`
- row count: `1`
- snapshot_date: `2024-01-01`
- index_value: `1000.0000`
- component_complex_count: `151`

### Existing Service Chain
- base_date: `2024-07-31`
- row count: `80`
- max snapshot_date: `2026-06-30`
- latest index_value: `12350.2940`
- latest component_complex_count: `13497`

### Current Latest Card Resolution
`public.v_koaptix_latest_index_card` currently resolves latest `KOREA_ALL` to:

- snapshot_date: `2026-06-30`
- index_code: `KOAPTIX_KOREA`
- universe_code: `KOREA_ALL`
- base_date: `2024-07-31`
- index_value: `12350.2940`
- component_complex_count: `13497`

### Current Home Payload Resolution
`public.v_koaptix_home_latest_payload` currently resolves latest `KOREA_ALL` to:

- snapshot_date: `2026-06-30`
- index_code: `KOAPTIX_KOREA`
- universe_code: `KOREA_ALL`
- base_date: `2024-07-31`
- index_chart_count: `81`
- top50_count: `50`
- total_ranked_complexes: `13497`

## Public Exposure Decision
- public_exposure_readiness: `NOT_READY_HOLD`

Public display would mix the official `2024-01-01` genesis methodology with the existing `2024-07-31` service chain unless a transition, recompute, gating, or view strategy is approved first.

## Risk Classification
- DB row verification: `SAFE_READ_ONLY_REVIEW`
- service read path documentation: `DOCS_ONLY`
- frontend/API wiring: `CODE_PATCH_REQUIRES_APPROVAL`
- DB view/source transition: `DB_VIEW_OR_SCHEMA_CHANGE_REQUIRES_APPROVAL`
- recompute/backfill: `DB_WRITE_OR_HELPER_REQUIRES_APPROVAL`
- latest-board refresh: `HELPER_OR_REFRESH_REQUIRES_APPROVAL`
- public exposure: `PUBLIC_EXPOSURE_REQUIRES_APPROVAL`
- deploy: `DEPLOY_REQUIRES_APPROVAL`

## Blockers
- No complete official-base time series exists beyond the genesis row.
- Existing latest/home service chain remains `2024-07-31` based.
- No official-index exposure switch or hide/rollback strategy was identified.
- No code patch, build, or lint verification was performed in the readiness lane.
- Apparent mojibake or malformed string literal risk was observed in home chart/hero components and requires a separate compile/lint/code lane before deploy.
- The dirty/untracked queue remains and must not be accidentally staged.
- No latest-board refresh, helper/materializer/finalizer, public exposure, deploy, or `complex_rank_history` write has been performed.

## Recommended Next Lane
`P-KOAPTIX-INDEX-SERVICE-WIRING-PATCH-PLAN.0`

Purpose: produce a read-only/code-inspection plan for how to expose or gate `KOAPTIX_KOREA` official-base data without mutating service code yet.

Alternative lanes:
- `P-KOAPTIX-INDEX-DB-VIEW-READINESS-INSPECTION.0` if CTO decides DB views are the first blocker.
- `P-KOAPTIX-INDEX-PUBLIC-EXPOSURE-STRATEGY-REVIEW.0` only after service read path and baseline transition strategy are clear.

## Do-Not-Run List
- Do not refresh latest-board.
- Do not expose publicly.
- Do not deploy.
- Do not run helpers/materializers/finalizers.
- Do not write `complex_rank_history`.
- Do not recompute official-base snapshots without explicit approval.
- Do not patch frontend/API code without separate approval.
- Do not mix the `2024-01-01` official-base chain with the `2024-07-31` service chain in public UI without a transition rule.

## One-Line Handoff
`KOAPTIX_KOREA` genesis index row is valid, but service exposure remains on hold because current latest/home read paths still use the `2024-07-31` base chain; next action is service wiring patch plan or DB view readiness inspection, not public exposure.
