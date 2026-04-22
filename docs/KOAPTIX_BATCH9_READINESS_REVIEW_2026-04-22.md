# KOAPTIX Batch-9 Readiness Review - 2026-04-22

## Purpose

This document records the read-only batch-9 SGG readiness scan and the later
post-open verification result from commit `5a82c32`.

The readiness review itself did not open batch-9 and did not modify registry
exposure, DB, SQL, source of truth, API routes, gate scripts, package files,
components, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `13e92a8`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- KOREA_ALL home delivery stabilization commit: `9747d07 fix(koaptix): stabilize korea home delivery path`
- KOREA_ALL KPI noise hardening commit: `13e92a8 fix(koaptix): reduce korea home kpi query noise`
- Batch-4 open commit: `306f3dc feat(koaptix): open batch-4 ready sgg exposure`
- Batch-5 open commit: `7cac4e8 feat(koaptix): open batch-5 ready sgg exposure`
- Batch-6 open commit: `dee214d feat(koaptix): open batch-6 ready sgg exposure`
- Batch-7 open commit: `a260e93 feat(koaptix): open batch-7 ready sgg exposure`
- Batch-8 open commit: `b6245f0 feat(koaptix): open batch-8 ready sgg exposure`
- Batch-9 readiness docs commit: `c9bc978 docs(koaptix): add batch-9 readiness review`
- Batch-9 open commit: `5a82c32 feat(koaptix): open batch-9 ready sgg exposure`
- Release gate baseline was re-confirmed after `13e92a8`.

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

Enabled SGG count: 34.

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
- `SGG_41463`
- `SGG_29170`
- `SGG_28260`
- `SGG_27290`

Post-open status:

- `5a82c32 feat(koaptix): open batch-9 ready sgg exposure` opened exactly
  `SGG_31140` and `SGG_27260`.
- Current enabled SGG count after that commit: 36.
- No macro universe exposure policy changed.

## Already-Open Batch Confirmation

Batch-4 is already open:

- `SGG_11545`
- `SGG_11620`

Batch-5 is already open:

- `SGG_41360`
- `SGG_48250`

Batch-6 is already open:

- `SGG_41465`
- `SGG_41220`

Batch-7 is already open:

- `SGG_41463`
- `SGG_29170`

Batch-8 is already open:

- `SGG_28260`
- `SGG_27290`

These ten already-open batch-4 through batch-8 codes were excluded from
batch-9 candidate selection.

## Gate Coverage Hardening Baseline

The gate coverage hardening baseline is present at `d548b5a`.

Reviewed scripts:

- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`
- `scripts/smoke-regional-identity.mjs`
- `scripts/smoke-browser-regional-identity.mjs`

Findings:

- `audit:sgg` reads enabled SGG directly from `src/lib/koaptix/universes.ts`.
- `gate:sgg` runs `audit:sgg`, `smoke:regional`, `smoke:browser`, and `build`.
- `smoke:regional` includes enabled SGG with `order >= 125` automatically.
- `smoke:browser` includes enabled SGG with `order >= 125` automatically.
- Batch-4 through batch-8 SGG are covered by the hardened smoke baseline after
  they are registry enabled.

## KOREA_ALL Stabilization Baseline

The KOREA_ALL home delivery and KPI noise stabilization baseline is present at
`9747d07` and `13e92a8`.

Reviewed file:

- `src/lib/koaptix/queries.ts`

Findings:

- KOREA_ALL home delivery stabilization did not change SGG registry exposure.
- The KPI noise hardening in `13e92a8` is limited to `src/lib/koaptix/queries.ts`.
- The stabilization work does not alter the batch-9 SGG readiness criteria.
- Source-of-truth reads for candidate readiness remain the same official chain.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
- `package.json`
- `src/lib/koaptix/queries.ts`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`
- `scripts/smoke-regional-identity.mjs`
- `scripts/smoke-browser-regional-identity.mjs`
- `docs/KOAPTIX_BATCH8_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH7_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH6_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH5_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_BATCH4_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`

Findings:

- Batch-4, batch-5, batch-6, batch-7, and batch-8 are documented as already
  open.
- `src/lib/koaptix/universes.ts` has all batch-4 through batch-8 SGG enabled.
- Current enabled SGG count is 34.
- `package.json` still exposes `audit:sgg`, `smoke:regional`,
  `smoke:browser`, and `gate:sgg`.
- The built-in audit candidate list is stale for discovery because its fixed
  candidates are already enabled; batch-9 candidate discovery therefore used a
  separate read-only scan from `region_dim` and source-of-truth views.

## Candidate Scan Method

Commands and files reviewed:

- `git status --short`
- `git diff --name-only`
- `git rev-parse --short HEAD`
- `git branch --show-current`
- `git log --oneline -12`
- whole-file review of the files listed above

Read-only checks executed:

- `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run audit:sgg`
- read-only Supabase scan against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

Audit result:

- checked at: `2026-04-22T04:26:16.176Z`
- base URL: `http://127.0.0.1:3004`
- enabled SGG confirmed: 34
- delivery-confirmed enabled SGG: 34
- advisory direct-read misses: none
- blocking failures: none
- candidate results from the built-in audit script: none

Read-only candidate scan summary:

- scan timestamp: `2026-04-22T04:28:43.283Z`
- active sigungu rows from `region_dim`: 308
- enabled SGG excluded: 34
- non-enabled SGG count: 274
- priority and snapshot-bearing non-enabled candidates sampled: 38
- READY candidates observed in the sampled set: 30

The scan avoided DB writes, migrations, snapshot rebuilds, source-of-truth
changes, registry changes, API route changes, and gate script changes.

## Candidate Readiness Criteria

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not a batch-4, batch-5, batch-6, batch-7, or batch-8 code.
3. `v_koaptix_latest_universe_rank_board_u` has at least one row.
4. `koaptix_rank_snapshot` has a latest snapshot.
5. `v_koaptix_universe_rank_history_dynamic` has a row for that latest
   snapshot.
6. `region_dim` has a clear label and region identity.
7. The expected rollback scope is registry-only.

## Candidate Readiness Table

| Rank | Candidate | Region label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_31140` | Ulsan Nam-gu | 165 | `2026-04-21` | true | `complex_id=177939`, rank 1, Daehyeon The Sharp | READY |
| 2 | `SGG_27260` | Daegu Suseong-gu | 160 | `2026-04-21` | true | `complex_id=138454`, rank 1, Doosan We've The Zenith | READY |
| 3 | `SGG_41150` | Gyeonggi-do Uijeongbu-si | 154 | `2026-04-21` | true | `complex_id=192562`, rank 1, Uijeongbu Station Central Xi & Weve Castle | DEFERRED |
| 4 | `SGG_41390` | Gyeonggi-do Siheung-si | 154 | `2026-04-21` | true | `complex_id=237338`, rank 1, Halla Vivaldi Campus 2 | DEFERRED |
| 5 | `SGG_44133` | Chungcheongnam-do Cheonan-si Seobuk-gu | 151 | `2026-04-21` | true | `complex_id=269628`, rank 1, Dujeong Station Hyosung Harrington Place | DEFERRED |
| 6 | `SGG_29200` | Gwangju Gwangsan-gu | 150 | `2026-04-21` | true | `complex_id=170113`, rank 1, Hillstate River Park | DEFERRED |
| 7 | `SGG_27230` | Daegu Buk-gu | 147 | `2026-04-21` | true | `complex_id=137330`, rank 1, Chimsan 1st Prugio | DEFERRED |
| 8 | `SGG_26350` | Busan Haeundae-gu | 141 | `2026-04-21` | true | `complex_id=121684`, rank 1, The Sharp Centum Park 1 | DEFERRED |
| 9 | `SGG_48330` | Gyeongsangnam-do Yangsan-si | 123 | `2026-04-21` | true | `complex_id=294968`, rank 1, Yangsan Daebang Nobland 8 Royal County | DEFERRED |
| 10 | `SGG_41173` | Gyeonggi-do Anyang-si Dongan-gu | 120 | `2026-04-21` | true | `complex_id=198411`, rank 1, Pyeongchon Centum First | DEFERRED |
| 11 | `SGG_48170` | Gyeongsangnam-do Jinju-si | 119 | `2026-04-21` | true | `complex_id=290442`, rank 1, Emco Town The Praha | DEFERRED |
| 12 | `SGG_48310` | Gyeongsangnam-do Geoje-si | 88 | `2026-04-21` | true | `complex_id=294256`, rank 1, e-Pyunhansesang Geoje Euro Sky | DEFERRED |

Deferred candidates are not rejected for data quality. They are deferred because
this review intentionally recommends at most two batch-9 open candidates.

## Rejected Or Deferred Candidates

Rejected from the checked readiness set:

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

Deferred:

- `SGG_41150`
- `SGG_41390`
- `SGG_44133`
- `SGG_29200`
- `SGG_27230`
- `SGG_26350`
- `SGG_48330`
- `SGG_41173`
- `SGG_48170`
- `SGG_48310`

Reason: the review scope caps the recommended open set at two candidates.

Already-open and excluded from batch-9:

- `SGG_11545`
- `SGG_11620`
- `SGG_41360`
- `SGG_48250`
- `SGG_41465`
- `SGG_41220`
- `SGG_41463`
- `SGG_29170`
- `SGG_28260`
- `SGG_27290`

## Recommended batch-9 open set

- `SGG_31140`
- `SGG_27260`

These are the only candidates recommended for a future batch-9 open prompt.

## Expected Rollback Scope

If a future batch-9 open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_31140`
- `SGG_27260`

No DB, SQL, source-of-truth, API route, package, component, or gate script
rollback should be needed for a registry-only open.

## Actual Open Status

Batch-9 was opened later by:

- `5a82c32 feat(koaptix): open batch-9 ready sgg exposure`

That commit changed exactly one runtime file:

- `src/lib/koaptix/universes.ts`

The open exposed exactly:

- `SGG_31140`
- `SGG_27260`

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Post-Open Result

Open result:

- enabled SGG count after open: 36
- `npm run build`: PASS
- home URL checks: PASS
- `/ranking` URL checks: PASS
- `/api/rankings`: PASS
- `/api/map`: PASS
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `failed_command=NONE`
- `failed_universe_or_step=NONE`

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=36`, `confirmed=36`
- home, ranking, manual API checks: PASS
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-9 Open

Batch-9 is open as of commit `5a82c32`.

No DB, SQL, source-of-truth, API route, gate script, package, script, component,
or docs change was part of the open commit. The open commit changed only
`src/lib/koaptix/universes.ts`.

Do not treat batch-9 as an open-ended block. Any additional SGG exposure after
`SGG_31140` and `SGG_27260` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, manual checks, API checks, and the SGG
release gate passed after the registry-only open.

If a later batch-9-specific regression is proven, rollback scope should be
registry-only and exactly the batch-9 block:

- `SGG_31140`
- `SGG_27260`

No DB, SQL, source-of-truth, API route, package, script, or component rollback
should be needed for a batch-9 registry-only rollback.
