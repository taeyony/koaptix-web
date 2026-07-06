# KOAPTIX Search Exact-Name TOP1000 Coverage Production Completion

Review marker: `P-KOAPTIX-SEARCH-EXACT-NAME-TOP1000-COVERAGE-PUSH-DEPLOY-PLAN.0`

Status: `PASS_PUSH_AND_PRODUCTION_OBSERVATION_FIXED`

CTO decision: `ACCEPT_PUSH_AND_PRODUCTION_OBSERVATION_FIXED`

One-line conclusion: The exact-name TOP1000 search reliability gap is fixed in production, with no broad general-search expansion and no DB, helper, read-model, source-import, or explicit deploy action in the observed release lane.

## Baseline Git State

- branch: `main`
- HEAD after push: `b843e1df5d6bba79de12d8ab65a80621a255bcb3`
- origin/main after push: `b843e1df5d6bba79de12d8ab65a80621a255bcb3`
- remote refs/heads/main after push: `b843e1df5d6bba79de12d8ab65a80621a255bcb3`
- ahead/behind after push: `0 0`
- push type: `NORMAL_NON_FORCE_PUSH_ORIGIN_MAIN`
- explicit deploy command attempted: `NO`

## Target Commit

- target commit: `b843e1df5d6bba79de12d8ab65a80621a255bcb3`
- commit subject: `fix(koaptix): cover exact-name top1000 search results`
- pushed file: `src/app/api/search/route.ts`

## Accepted Patch Behavior

- `/api/search` general search source window remains `80`.
- Bounded same-universe exact-name TOP1000 fallback was added.
- Fallback source limit is `1000`.
- Fallback result limit is `5`.
- Fallback is restricted to `is_top1000=true` where available or `1 <= rank_all <= 1000`.
- Results are deduped by `complexId`.
- Existing `localItems` and `globalItems` behavior is preserved.
- Disabled/hold guard is preserved before source access.
- No public response metadata churn was introduced.
- No `public.koaptix_latest_board_read_model` usage was added.
- `/api/ranking`, `/api/rankings`, and `/api/complex-detail` were not modified.

## Production Observation Evidence

- GET count: `19 / 40`
- broad crawl/load test: `NO`
- production currentness status: `PRODUCTION_SERVING_FIXED_BEHAVIOR`

Known failing cases fixed:

- `KOREA_ALL rank 501`: `FIXED`
- `KOREA_ALL rank 900`: `FIXED`
- `SEOUL_ALL rank 500`: `FIXED`
- `BUSAN_ALL rank 500`: `FIXED`
- `GYEONGGI_ALL rank 500`: `FIXED`

Controls passed:

- `KOREA_ALL rank 1`: `PASS`
- `GANGWON_ALL rank 50`: `PASS`
- `SGG_51110 rank 50`: `PASS`

Disabled/hold guard:

- `JEONBUK_ALL`: `PASS`
- `SGG_51150`: `PASS`

Observation counters:

- blank recognition count: `0`
- fallback/degraded count: `0`
- HTTP error count: `0`
- max search observation duration: `2777ms`
- hard duration failures over `5000ms`: `[]`

## Minimal Smoke Summary

- `/api/ranking?universe_code=KOREA_ALL&limit=1000`: `PASS`
- `/api/rankings?universe_code=KOREA_ALL&limit=20`: `PASS`
- `/api/complex-detail?complexId=<derived KOREA_ALL rank 501>`: `PASS`
- smoke HTTP error count: `0`

## Interpretation

- Production is serving the fixed behavior.
- The exact-name TOP1000 search reliability gap is closed.
- The user-facing issue where TOP1000-visible complexes outside the initial 80-row search source window could fail exact-name search is fixed.
- Broad general search expansion was not performed.
- The fast 80-row general search path remains intact, with only bounded exact-name TOP1000 fallback added.
- Disabled/hold universes still return safe empty/unavailable behavior without KOREA_ALL masquerade.

## Safety Boundary

- DB write: `NO`
- DB connection: `NO`
- SQL: `NO`
- DDL/DML: `NO`
- read model refresh: `NO`
- helper execution: `NO`
- source import: `NO`
- explicit deploy command: `NO`
- code change in this docs lane: `NO`
- commit/push/deploy in this docs lane: `NO`
- secrets/env/credentials logged: `NO`

## Recommended Next Lane

`STOP_OR_RETURN_TO_BACKLOG`

The search exact-name TOP1000 coverage lane is complete unless a new, separately scoped search bug is reported.

## One-Line Handoff

Exact-name TOP1000 search now resolves previously missed same-universe visible complexes in production; keep general search broadening out of scope unless a new product lane explicitly asks for it.
