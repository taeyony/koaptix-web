# KOAPTIX Official Index v1 Service Wiring Baseline Guard Completion — 2026-07-01

## One-Line Conclusion

The official index service wiring baseline guard patch was pushed to `origin/main` and post-push sanity review passed; public exposure, latest-board refresh, DB write, helper execution, and deploy remain blocked/not performed.

## Non-Developer Explanation

KOAPTIX_KOREA 공식 genesis 지수는 DB 안에 존재한다. 이 공식 체인은 `2024-01-01 = 1000`을 기준으로 하는 내부 공식 지수 시작점이다.

하지만 현재 공개 웹사이트는 아직 기존 `2024-07-31` public service chain을 유지해야 한다. 즉, 공개 화면의 차트와 카드가 갑자기 공식 `2024-01-01` genesis row를 정상 공개 지수처럼 보여주면 안 된다.

이번 패치는 그런 혼선을 막기 위한 안전장치다. 공개 차트와 카드가 `2024-07-31` public-service 기준선과 `2024-01-01` official-base 기준선을 조용히 섞어 보여주지 못하게 막고, official genesis row가 공개 서비스 데이터처럼 렌더링되지 않도록 guard metadata와 차단 경로를 추가했다.

이 작업은 공개 런칭이 아니다. deploy, preview, official index public exposure는 모두 별도 승인 단계로 남아 있다.

## Git Closeout

- branch: `main`
- head: `768e8e439d272c9dd0f9896e42b6354216b6aeb2`
- origin_main: `768e8e439d272c9dd0f9896e42b6354216b6aeb2`
- remote_refs_heads_main: `768e8e439d272c9dd0f9896e42b6354216b6aeb2`
- ahead_behind: `0 0`
- latest commit: `feat(koaptix): guard official index service baseline`

## Changed Files

The pushed commit changed exactly:

- `src/app/api/home/route.ts`
- `src/app/page.tsx`
- `src/components/home/MarketChartCard.tsx`
- `src/lib/koaptix/home.ts`
- `src/lib/koaptix/queries.ts`
- `src/types/koaptix.ts`

The pushed commit did not include docs, outputs, scripts, migrations, package files, tests, public exposure routes, ranking/map/search API routes, deploy config, or DB artifacts.

## Guard Result

- public_service_vocabulary_present: `YES`
- official_internal_vocabulary_present: `YES`
- baseline_modes_present: `YES`
- public_service_2024_07_31 present: `YES`
- official_2024_01_01 present: `YES`
- chart_guard_present: `YES`
- home_api_guard_present: `YES`
- official_genesis_public_exposure_blocked: `YES`
- mixed_baseline_prevention: `YES`
- ranking_map_search_untouched: `YES`

## Verification Result

- `npm run lint`: `PASS_WITH_WARNINGS`, exit `0`
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`: `FAIL_KNOWN_BLOCKER`, exit `1`
- tsc noEmit marker: `tsc noEmit`
- tsc blocker classification: `PREEXISTING_ENVIRONMENTAL_DENO_SUPABASE_FUNCTION_TYPES`
- tsc blocker file: `supabase/functions/ingest-market-source/index.ts`
- `npm run build`: `PASS`, exit `0`

## Safety Boundary

- persistent DB write: `NO`
- DB connection / SQL: `NO`
- helper/materializer/finalizer/refresh/latest-board: `NO`
- public exposure route or deployment: `NO`
- package install or package mutation: `NO`
- source/docs/scripts/outputs/migrations/manual_sources modification by post-push review lane: `NO`
- staging/commit/push by post-push review lane: `NO`
- secret/env/key file contents read: `NO`

This completion-note lane created this docs file only. It did not modify source, scripts, outputs, migrations, manual sources, package files, tests, DB artifacts, deploy config, or public exposure routes.

## Known Remaining Local Queue

Pre-existing dirty file remains unstaged and untouched:

- `scripts/generate_molit_2023_raw_match_clean_pilot_payload.py`

## Do-Not-Run List

- Do not deploy yet.
- Do not expose `KOAPTIX_KOREA` official index publicly yet.
- Do not refresh latest-board.
- Do not run helpers/materializers/finalizers.
- Do not write `complex_rank_history`.
- Do not run additional DB writes without explicit approval.
- Do not mix the `2024-01-01` official-base chain and `2024-07-31` public-service chain in the same public chart/card.
- Do not stage the pre-existing dirty script.
- Do not use `git add .` or `git add -A`.

## Recommended Next Lane

`P-KOAPTIX-INDEX-SERVICE-WIRING-COMPLETION-NOTE-DOCS-COMMIT.0`

Commit this completion note as docs-only before any preview/deploy readiness review.

## One-Line Handoff

Official index service wiring baseline guard is pushed and post-push sanity verified; public exposure and deploy remain blocked, and next action is docs-only completion note commit/push.
