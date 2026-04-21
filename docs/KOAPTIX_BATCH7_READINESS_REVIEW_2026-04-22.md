# KOAPTIX Batch-7 Readiness Review - 2026-04-22

## Purpose

This document records a read-only batch-7 SGG readiness scan. It does not open
batch-7 and does not modify the registry, DB, SQL, source of truth, API routes,
gate scripts, package files, components, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `719f463`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-4 open commit: `306f3dc feat(koaptix): open batch-4 ready sgg exposure`
- Batch-5 open commit: `7cac4e8 feat(koaptix): open batch-5 ready sgg exposure`
- Batch-6 open commit: `dee214d feat(koaptix): open batch-6 ready sgg exposure`
- Batch-6 post-open docs commit: `719f463 docs(koaptix): record batch-6 open verification`

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

Enabled SGG count: 30.

Enabled SGG universes:

- `SGG_11710`
- `SGG_11650`
- `SGG_11680`
- `SGG_41135`
- `SGG_11440`
- `SGG_11560`
- `SGG_11590`
- `SGG_11500`
- `SGG_11290`
- `SGG_11230`
- `SGG_11740`
- `SGG_11470`
- `SGG_11170`
- `SGG_11410`
- `SGG_11200`
- `SGG_11110`
- `SGG_11140`
- `SGG_11215`
- `SGG_11260`
- `SGG_11305`
- `SGG_11320`
- `SGG_11350`
- `SGG_11380`
- `SGG_11530`
- `SGG_11545`
- `SGG_11620`
- `SGG_41360`
- `SGG_48250`
- `SGG_41465`
- `SGG_41220`

Batch-4 is already open:

- `SGG_11545`
- `SGG_11620`

Batch-5 is already open:

- `SGG_41360`
- `SGG_48250`

Batch-6 is already open:

- `SGG_41465`
- `SGG_41220`

These six already-open codes must not be treated as batch-7 candidates.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
- `package.json`
- `docs/KOAPTIX_BATCH6_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH5_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_BATCH4_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`

Findings:

- Batch-4, batch-5, and batch-6 are documented as already open.
- `src/lib/koaptix/universes.ts` has the batch-4, batch-5, and batch-6 SGG
  entries enabled.
- `package.json` exposes `audit:sgg` as `node scripts/audit-sgg-readiness.mjs`.
- `scripts/audit-sgg-readiness.mjs` still has a fixed candidate list that is now
  fully enabled, so new batch-7 candidate discovery requires a separate
  read-only scan from `region_dim`.
- `scripts/sgg-release-gate.ps1` preserves the audit, smoke, browser, and build
  release gate order.

## Candidate Scan Method

Commands and files reviewed:

- `git status --short`
- `git diff --name-only`
- `git rev-parse --short HEAD`
- `git branch --show-current`
- `git log --oneline -12`
- whole-file review of the files listed above

Read-only checks executed:

- `npm run audit:sgg`
- `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run audit:sgg`
- read-only Supabase scan against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

The first audit attempt without an active default base URL failed with
`ECONNREFUSED`. A local dev server was then started on `127.0.0.1:3004` and the
audit was rerun with an explicit base URL.

Audit result:

- checked at: `2026-04-21T22:51:32.173Z`
- base URL: `http://127.0.0.1:3004`
- enabled SGG confirmed: 30
- delivery-confirmed enabled SGG: 30
- advisory direct-read misses: none
- blocking failures: none
- candidate results from the built-in audit script: none

The read-only candidate scan checked active `region_dim` sigungu codes that are
not currently registry enabled.

Scan result:

- scan timestamp: `2026-04-21T22:52:25.318Z`
- active sigungu rows: 308
- enabled SGG excluded: 30
- non-enabled SGG checked: 278
- source-of-truth READY candidates observed: 173

No registry changes, DB writes, migrations, snapshot rebuilds, source-of-truth
changes, API route changes, or script changes were made.

## Candidate Readiness Criteria

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not a batch-4, batch-5, or batch-6 code.
3. `v_koaptix_latest_universe_rank_board_u` has at least one row.
4. `koaptix_rank_snapshot` has a latest snapshot.
5. `v_koaptix_universe_rank_history_dynamic` has a row for that latest
   snapshot.
6. `region_dim` has a clear label and region identity.
7. The expected rollback scope is registry-only.

## Candidate Readiness Table

| Rank | Candidate | Region label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_41463` | Gyeonggi-do Yongin-si Giheung-gu | 171 | `2026-04-21` | true | `complex_id=244018`, rank 1, Hangwon Maeul Dong-A Solacity | READY |
| 2 | `SGG_29170` | Gwangju Buk-gu | 169 | `2026-04-21` | true | `complex_id=169040`, rank 1, S-Class The Zenith | READY |
| 3 | `SGG_28260` | Incheon Seo-gu | 167 | `2026-04-21` | true | `complex_id=162773`, rank 1, Geomam Station Royal Park City Prugio 2 | DEFERRED |
| 4 | `SGG_27290` | Daegu Dalseo-gu | 165 | `2026-04-21` | true | `complex_id=140196`, rank 1, Worldmark Westend | DEFERRED |
| 5 | `SGG_31140` | Ulsan Nam-gu | 165 | `2026-04-21` | true | `complex_id=177939`, rank 1, Daehyeon The Sharp | DEFERRED |
| 6 | `SGG_27260` | Daegu Suseong-gu | 160 | `2026-04-21` | true | `complex_id=138454`, rank 1, Doosan We've The Zenith | DEFERRED |
| 7 | `SGG_41150` | Gyeonggi-do Uijeongbu-si | 154 | `2026-04-21` | true | `complex_id=192562`, rank 1, Uijeongbu Station Central Xi & Weve Castle | DEFERRED |
| 8 | `SGG_41390` | Gyeonggi-do Siheung-si | 154 | `2026-04-21` | true | `complex_id=237338`, rank 1, Halla Vivaldi Campus 2 | DEFERRED |
| 9 | `SGG_44133` | Chungcheongnam-do Cheonan-si Seobuk-gu | 151 | `2026-04-21` | true | `complex_id=269628`, rank 1, Dujeong Station Hyosung Harrington Place | DEFERRED |
| 10 | `SGG_29200` | Gwangju Gwangsan-gu | 150 | `2026-04-21` | true | `complex_id=170113`, rank 1, Hillstate River Park | DEFERRED |
| 11 | `SGG_27230` | Daegu Buk-gu | 147 | `2026-04-21` | true | `complex_id=137330`, rank 1, Chimsan 1st Prugio | DEFERRED |
| 12 | `SGG_26350` | Busan Haeundae-gu | 141 | `2026-04-21` | true | `complex_id=121684`, rank 1, The Sharp Centum Park 1 | DEFERRED |

Deferred candidates are not rejected for data quality. They are deferred because
this review intentionally recommends at most two batch-7 open candidates.

## Rejected Or Deferred Candidates

Rejected from the top scanned readiness set:

- none

Deferred:

- `SGG_28260`
- `SGG_27290`
- `SGG_31140`
- `SGG_27260`
- `SGG_41150`
- `SGG_41390`
- `SGG_44133`
- `SGG_29200`
- `SGG_27230`
- `SGG_26350`

Reason: the review scope caps the recommended open set at two candidates.

Not-ready examples observed during the non-enabled SGG scan:

- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

Reason: no latest board rows, no latest snapshot, and no dynamic sample were
observed for these examples during the read-only scan.

## Recommended batch-7 open set

- `SGG_41463`
- `SGG_29170`

These are the only candidates recommended for a future batch-7 open prompt.

## Expected Rollback Scope

If a future batch-7 open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_41463`
- `SGG_29170`

No DB, SQL, source-of-truth, API route, package, component, or gate script
rollback should be needed for a registry-only open.

## Actual Open Status

Batch-7 was not opened in this turn.

No registry exposure was changed. No macro universe policy, code, API route, DB,
SQL, source-of-truth, package, component, or gate script was changed.

## Next Turn Exact Target

If approved, the next actual open prompt should expose exactly:

- `SGG_41463`
- `SGG_29170`

After that registry-only open, run full post-open validation:

1. `npm run build`
2. `npm run dev -- --hostname 127.0.0.1 --port 3004 --webpack`
3. `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run gate:sgg`
