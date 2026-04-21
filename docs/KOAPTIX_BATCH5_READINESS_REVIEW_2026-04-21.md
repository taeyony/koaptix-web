# KOAPTIX Batch-5 Readiness Review - 2026-04-21

## Purpose

This document records a read-only batch-5 SGG readiness scan. It does not open
batch-5 and does not modify the registry, DB, SQL, source of truth, API routes,
gate scripts, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `0b1b42e`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-4 open commit: `306f3dc feat(koaptix): open batch-4 ready sgg exposure`
- Batch-4 readiness docs commit: `cf9c2a4 docs(koaptix): add batch-4 readiness review`
- Artifact cleanup commit: `0b1b42e chore(koaptix): ignore local build and dev artifacts`

## Current Enabled Exposure

Source reviewed: `src/lib/koaptix/universes.ts`.

Enabled macro universes: 16.

- `KOREA_ALL`
- `SEOUL_ALL`
- `BUSAN_ALL`
- `DAEGU_ALL`
- `INCHEON_ALL`
- `GWANGJU_ALL`
- `DAEJEON_ALL`
- `ULSAN_ALL`
- `SEJONG_ALL`
- `GYEONGGI_ALL`
- `CHUNGBUK_ALL`
- `CHUNGNAM_ALL`
- `JEONNAM_ALL`
- `GYEONGBUK_ALL`
- `GYEONGNAM_ALL`
- `JEJU_ALL`

Macro universes intentionally not enabled:

- `GANGWON_ALL`
- `JEONBUK_ALL`

Enabled SGG count: 26.

Batch-4 is already open:

- `SGG_11545`
- `SGG_11620`

These two codes must not be treated as batch-5 candidates.

## Candidate Scan Method

Commands and files reviewed:

- `git status --short`
- `git diff --name-only`
- `git rev-parse --short HEAD`
- `git branch --show-current`
- `git log --oneline -12`
- `src/lib/koaptix/universes.ts`
- `package.json`
- `docs/KOAPTIX_BATCH4_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`

Read-only checks executed:

- `npm run audit:sgg`
- read-only Supabase scan against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

`npm run audit:sgg` confirmed the current enabled exposure:

- checked at: `2026-04-21T14:28:30.711Z`
- enabled SGG confirmed: 26
- advisory direct-read misses: none
- blocking failures: none
- candidate results from the built-in audit script: none

The built-in audit script has a fixed candidate list that is now fully exposed
through batch-4, so batch-5 candidate discovery used a separate read-only scan.

The first whole-view latest-board scan timed out, so the final scan used smaller
per-SGG read-only checks from `region_dim`.

## Candidate Readiness Criteria

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not a batch-4 code.
3. `v_koaptix_latest_universe_rank_board_u` has at least one row.
4. `koaptix_rank_snapshot` has a latest snapshot.
5. `v_koaptix_universe_rank_history_dynamic` has a row for that latest
   snapshot.
6. `region_dim` has a clear label/identity.
7. The expected rollback scope is registry-only.

## Candidate Readiness Table

Read-only scan timestamp: `2026-04-21T14:32:02.061Z`.

| Rank | Candidate | Region label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_41360` | Gyeonggi-do Namyangju-si | 187 | `2026-04-19` | true | `complex_id=230059`, rank 1 | READY |
| 2 | `SGG_48250` | Gyeongsangnam-do Gimhae-si | 187 | `2026-04-19` | true | `complex_id=293320`, rank 1 | READY |
| 3 | `SGG_41465` | Gyeonggi-do Yongin-si Suji-gu | 175 | `2026-04-19` | true | `complex_id=244476`, rank 1 | DEFERRED |
| 4 | `SGG_41220` | Gyeonggi-do Pyeongtaek-si | 171 | `2026-04-19` | true | `complex_id=212774`, rank 1 | DEFERRED |
| 5 | `SGG_41463` | Gyeonggi-do Yongin-si Giheung-gu | 171 | `2026-04-19` | true | `complex_id=244018`, rank 1 | DEFERRED |
| 6 | `SGG_29170` | Gwangju Buk-gu | 169 | `2026-04-19` | true | `complex_id=169040`, rank 1 | DEFERRED |
| 7 | `SGG_28260` | Incheon Seo-gu | 167 | `2026-04-19` | true | `complex_id=162773`, rank 1 | DEFERRED |
| 8 | `SGG_27290` | Daegu Dalseo-gu | 165 | `2026-04-19` | true | `complex_id=140196`, rank 1 | DEFERRED |
| 9 | `SGG_31140` | Ulsan Nam-gu | 165 | `2026-04-19` | true | `complex_id=177939`, rank 1 | DEFERRED |
| 10 | `SGG_27260` | Daegu Suseong-gu | 160 | `2026-04-19` | true | `complex_id=138454`, rank 1 | DEFERRED |
| 11 | `SGG_41150` | Gyeonggi-do Uijeongbu-si | 154 | `2026-04-19` | true | `complex_id=192562`, rank 1 | DEFERRED |
| 12 | `SGG_41390` | Gyeonggi-do Siheung-si | 154 | `2026-04-19` | true | `complex_id=237338`, rank 1 | DEFERRED |

Deferred candidates are not rejected for data quality. They are deferred because
this review intentionally recommends at most two batch-5 open candidates.

## Recommended batch-5 open set

- `SGG_41360`
- `SGG_48250`

These are the only candidates recommended for a future batch-5 open prompt.

## Rejected Or Deferred Candidates

Rejected:

- none from the top scanned readiness set

Deferred:

- `SGG_41465`
- `SGG_41220`
- `SGG_41463`
- `SGG_29170`
- `SGG_28260`
- `SGG_27290`
- `SGG_31140`
- `SGG_27260`
- `SGG_41150`
- `SGG_41390`

Reason: the review scope caps the recommended open set at two candidates.

## Expected Rollback Scope

If a future batch-5 open prompt exposes only the recommended candidates, rollback
scope should be registry-only and exactly:

- `SGG_41360`
- `SGG_48250`

No DB, SQL, source-of-truth, API route, or gate script rollback should be needed
for a registry-only open.

## Actual Open Status

Batch-5 was not opened in this turn.

No registry exposure was changed. No code, API route, DB, SQL, source-of-truth,
or gate script was changed.

## Next Turn Exact Target

If approved, the next actual open prompt should expose exactly:

- `SGG_41360`
- `SGG_48250`

After that registry-only open, run full post-open validation:

1. `npm run build`
2. `npm run dev -- --hostname 127.0.0.1 --port 3004 --webpack`
3. `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run gate:sgg`
