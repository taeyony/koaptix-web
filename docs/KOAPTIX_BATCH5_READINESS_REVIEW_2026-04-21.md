# KOAPTIX Batch-5 Readiness Review - 2026-04-21

## Purpose

This document records the read-only batch-5 SGG readiness scan and the later
post-open verification result from commit `7cac4e8`.

The readiness review itself did not open batch-5 and did not modify the
registry, DB, SQL, source of truth, API routes, gate scripts, or runtime code.

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
- Batch-5 readiness docs commit: `a1242d0 docs(koaptix): add batch-5 readiness review`
- Batch-5 open commit: `7cac4e8 feat(koaptix): open batch-5 ready sgg exposure`

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

## Post-Open Result

Batch-5 was opened later by:

- `7cac4e8 feat(koaptix): open batch-5 ready sgg exposure`

That commit changed exactly one runtime file:

- `src/lib/koaptix/universes.ts`

The open exposed exactly:

- `SGG_41360`
- `SGG_48250`

Open result:

- enabled SGG count after open: 28
- `npm run build`: PASS
- home URLs: PASS
- `/ranking` URLs: PASS
- `/api/rankings`: PASS for both new SGG, same-universe delivery retained
- `/api/map`: PASS for both new SGG, dynamic source with `isFallback=false`
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `failed_command=NONE`
- `failed_universe_or_step=NONE`

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=28`, `confirmed=28`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- `build`: PASS

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Current Status After Batch-5 Open

Batch-5 is open as of commit `7cac4e8`.

No DB, SQL, source-of-truth, API route, gate script, package, component, or docs
change was part of the open commit.

Do not treat batch-5 as an open-ended block. Any additional SGG exposure after
`SGG_41360` and `SGG_48250` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, manual checks, and the full release gate
passed after the registry-only open.

If a later batch-5-specific regression is proven, rollback scope should be
registry-only and exactly the batch-5 block:

- `SGG_41360`
- `SGG_48250`

No DB, SQL, source-of-truth, API route, package, script, or component rollback
should be needed for a batch-5 registry-only rollback.
