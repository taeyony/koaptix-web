# KOAPTIX Batch-14 Readiness Review - 2026-04-22

## Purpose

This document records the batch-14 SGG readiness scan only.

Batch-14 actual open was not performed. This review does not modify registry
exposure, `src/lib/koaptix/universes.ts`, DB, SQL, source of truth, API routes,
gate scripts, package files, components, tests, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `f41bdcf`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-13 actual open commit: `0c4d667 feat(koaptix): open batch-13 ready sgg exposure`
- Batch-13 post-open docs commit: `f41bdcf docs(koaptix): record batch-13 open verification`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- KOREA_ALL home delivery stabilization commit: `9747d07 fix(koaptix): stabilize korea home delivery path`
- KOREA_ALL KPI noise hardening commit: `13e92a8 fix(koaptix): reduce korea home kpi query noise`

This baseline is after batch-13 open and post-open documentation.

## Current Registry Status

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

Enabled SGG count: 44.

Latest staged registry block:

- `SGG_28185` / 연수구 / order 143
- `SGG_48330` / 양산시 / order 144

## Exclusion Set

All currently enabled SGG are excluded from batch-14 recommendation.

Batch-4 through batch-13 actual open SGG are also excluded:

- batch-4: `SGG_11545`, `SGG_11620`
- batch-5: `SGG_41360`, `SGG_48250`
- batch-6: `SGG_41465`, `SGG_41220`
- batch-7: `SGG_41463`, `SGG_29170`
- batch-8: `SGG_28260`, `SGG_27290`
- batch-9: `SGG_31140`, `SGG_27260`
- batch-10: `SGG_41150`, `SGG_41390`
- batch-11: `SGG_44133`, `SGG_29200`
- batch-12: `SGG_27230`, `SGG_26350`
- batch-13: `SGG_28185`, `SGG_48330`

Earlier enabled SGG from the baseline registry remain enabled and are also not
batch-14 candidates.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH13_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH12_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH11_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH10_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH9_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH8_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH7_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH6_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH5_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_BATCH4_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`

Additional commit checks:

- `f41bdcf docs(koaptix): record batch-13 open verification` changed only
  `docs/KOAPTIX_BATCH13_READINESS_REVIEW_2026-04-22.md`.
- `0c4d667 feat(koaptix): open batch-13 ready sgg exposure` changed only
  `src/lib/koaptix/universes.ts`.

Findings:

- Batch-4 through batch-13 are already documented as open.
- `src/lib/koaptix/universes.ts` has all batch-4 through batch-13 SGG enabled.
- Current enabled SGG count is 44.
- Existing readiness review pattern recommends at most two SGG per batch and
  defers other READY candidates without rejecting them for data quality.
- Batch-14 should follow the same pattern: recommend at most two candidates and
  leave other viable candidates as HOLD.

## Candidate Review Method

This review did not run build or release gate because it is not an actual-open
turn.

Read-only checks performed:

- registry parse from `src/lib/koaptix/universes.ts`
- existing batch-4 through batch-13 readiness review comparison
- commit-stat checks for `f41bdcf` and `0c4d667`
- source-of-truth evidence review from the latest batch-13 readiness scan

No DB writes, migrations, snapshot rebuilds, source-of-truth changes, registry
changes, API route changes, package changes, script changes, gate changes, or
build output changes were performed.

## Candidate Review

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not already opened in batch-4 through batch-13.
3. Existing readiness documents provide a deferred candidate basis.
4. `v_koaptix_latest_universe_rank_board_u` has latest board rows.
5. `koaptix_rank_snapshot` has a latest snapshot.
6. `v_koaptix_universe_rank_history_dynamic` has a row for the latest snapshot.
7. `region_dim` has clear identity.
8. A future open can remain registry-scoped with narrow rollback.

| Rank | Candidate | Label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_41173` | 안양시 동안구 | 120 | `2026-04-21` | true | `complex_id=198411`, rank 1, Pyeongchon Centum First | READY |
| 2 | `SGG_48170` | 진주시 | 119 | `2026-04-21` | true | `complex_id=290442`, rank 1, Emco Town The Praha | READY |
| 3 | `SGG_48310` | 거제시 | 88 | `2026-04-21` | true | `complex_id=294256`, rank 1, e-Pyunhansesang Geoje Euro Sky | HOLD |
| 4 | `SGG_26410` | 금정구 | 84 | `2026-04-21` | true | `complex_id=125890`, rank 1, Raemian Jangjeon | HOLD |
| 5 | `SGG_26290` | 남구 | 81 | `2026-04-21` | true | `complex_id=118195`, rank 1, Deobleu | HOLD |
| 6 | `SGG_48123` | 창원시 성산구 | 81 | `2026-04-21` | true | `complex_id=288078`, rank 1, Seongwon | HOLD |
| 7 | `SGG_50110` | 제주시 | 78 | `2026-04-21` | true | `complex_id=299339`, rank 1 | HOLD |
| 8 | `SGG_41171` | 안양시 만안구 | 67 | `2026-04-21` | true | `complex_id=195794`, rank 1 | HOLD |

HOLD candidates are not rejected for data quality. They are held because this
review caps the recommended batch-14 open set at two candidates.

## Non-Recommendations / Hold

Held despite passing direct source-of-truth checks:

- `SGG_48310`
- `SGG_26410`
- `SGG_26290`
- `SGG_48123`
- `SGG_50110`
- `SGG_41171`

Reason: maximum batch-14 recommendation size is two. These candidates require a
separate future readiness review or explicit later batch selection.

Held because direct source-of-truth evidence was absent in the sampled scan:

- `SGG_41590`
- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

Reason: no latest board rows, no latest snapshot, and no dynamic sample were
observed for these examples during the prior read-only scan.

## Recommended Batch-14 Open Set

- `SGG_41173` / 안양시 동안구
- `SGG_48170` / 진주시

Recommendation reason:

- Both are currently not registry enabled.
- Neither overlaps batch-4 through batch-13.
- Both have latest board rows, latest snapshot, and dynamic sample evidence in
  the existing readiness evidence chain.
- Both have clear `region_dim` identity.
- A future actual-open turn can keep rollback scope registry-only and exactly
  these two candidates.

## Current Status

Batch-14 readiness scan is complete.

Batch-14 actual open was not performed. No registry, code, API route, script,
SQL, source-of-truth, package, component, test, or env file was modified.

## Expected Rollback Scope

No rollback is required for this docs-only readiness scan.

If a future batch-14 actual-open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_41173`
- `SGG_48170`

## Next Recommended Step

Run a separate explicit batch-14 actual open turn only if the user approves
opening exactly:

- `SGG_41173`
- `SGG_48170`

Do not treat this readiness review as service exposure.
