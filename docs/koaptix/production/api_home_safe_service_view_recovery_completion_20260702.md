# KOAPTIX /api/home Safe Service View Recovery Completion

Review marker: `P-KOAPTIX-PRODUCTION-API-HOME-SMOKE-AFTER-SAFE-SERVICE-VIEW-DDL.0`

Final status: `PASS_HOME_RECOVERED_PUBLIC_SAFE`

One-line conclusion: Production `/api/home` recovered safely through the additive public-service `2024-07-31` home payload view, while official `2024-01-01` public exposure remains blocked.

## Timeline Summary

1. `/api/home` `503 OFFICIAL_INDEX_PUBLIC_EXPOSURE_BLOCKED` was diagnosed as an official guard/read-path exposure issue, not as approval to expose official `2024-01-01` publicly.
2. A safe fallback selection plan chose additive public-service read-path alignment over replacing latest/official views or redesigning the KOREA_ALL engine.
3. An additive migration and app wiring patch added `public.v_koaptix_home_public_service_payload` support and a guarded `/api/home` fallback path.
4. The approved local commit was created as `d9117b9510b4b69f536fc30a681e7ec69d2deed9` with subject `fix(koaptix): add public service home payload fallback`.
5. The approved commit was pushed to `origin/main`.
6. The DB view apply DDL-only lane created exactly one additive view: `public.v_koaptix_home_public_service_payload`.
7. Production read-only smoke passed and `/api/home` returned `200` with `ok=true`.

## Commit And DB View

Committed app/migration commit: `d9117b9510b4b69f536fc30a681e7ec69d2deed9`

Commit subject: `fix(koaptix): add public service home payload fallback`

DB view created: `public.v_koaptix_home_public_service_payload`

DB view verification:

- row_count: `1`
- snapshot_date: `2026-06-30`
- index_code: `KOAPTIX_KOREA`
- universe_code: `KOREA_ALL`
- base_date: `2024-07-31`
- top50_count: `50`
- total_ranked_complexes: `13497`
- index_chart_point_count: `80`
- source_mode: `public_service`
- baseline_mode: `public_service_2024_07_31`
- public_exposure_status: `blocked`
- official marker risk: `NO`

## Production Smoke Evidence

Production read-only smoke evidence:

- root `/`: `200`
- `/api/home`: `200`, `ok=true`
- `/api/rankings`: `200`, `ok=true`
- `/api/search`: `200`, `ok=true`

No full JSON payloads, chart arrays, top50 rows, or search results were included in the completion note.

## Public Marker Safety

Safe `/api/home` markers present:

- `2024-07-31`
- `public_service`
- `public_service_2024_07_31`
- `blocked`

Forbidden public markers absent across checked public responses:

- `2024-01-01`
- `official_internal`
- `official_2024_01_01`
- `official_v1_public`

## Prohibited Actions Summary

During the smoke and completion-note workflow:

- no deploy command was run
- no additional DB mutation was performed during smoke
- no helper/materializer/finalizer/latest-board refresh was run
- no public exposure change was made for official `2024-01-01`
- no source or migration files were mutated during smoke
- no commit, push, or staging occurred during smoke
- no secret/env values were exposed

## Current Public/Service Decision

`/api/home` is recovered through the safe `2024-07-31` public-service path.

Official `2024-01-01` public exposure remains blocked.

KOREA_ALL engine behavior was not redesigned. This recovery used additive read-path alignment only.

## Do Not Run Without Separate Approval

- do not public-expose official `2024-01-01`
- do not refresh latest-board unless separately approved
- do not rerun broad helpers
- do not replace existing latest/official views casually
- do not mutate the KOREA_ALL engine
- do not stage the protected dirty script `scripts/generate_molit_2023_raw_match_clean_pilot_payload.py`

## Recommended Next Steps

1. Completion note commit-only lane.
2. Completion note push-only lane.
3. Then return to the deferred dirty queue/protected dirty script review or the next service stabilization lane.

## Handoff

Production `/api/home` recovered safely via additive public-service `2024-07-31` home payload view; official `2024-01-01` remains blocked.
