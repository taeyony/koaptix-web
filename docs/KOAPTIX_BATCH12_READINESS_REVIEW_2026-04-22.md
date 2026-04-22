# KOAPTIX Batch-12 Readiness Review - 2026-04-22

## Purpose

This document records the batch-12 SGG readiness scan only.

Batch-12 actual open was not performed. This review does not modify registry
exposure, `src/lib/koaptix/universes.ts`, DB, SQL, source of truth, API routes,
gate scripts, package files, components, tests, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `328b11f`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-11 actual open commit: `17b64a3 feat(koaptix): open batch-11 ready sgg exposure`
- Batch-11 post-open docs commit: `328b11f docs(koaptix): record batch-11 open verification`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- KOREA_ALL home delivery stabilization commit: `9747d07 fix(koaptix): stabilize korea home delivery path`
- KOREA_ALL KPI noise hardening commit: `13e92a8 fix(koaptix): reduce korea home kpi query noise`

This baseline is after batch-11 open and post-open documentation.

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

Enabled SGG count: 40.

Latest staged registry block:

- `SGG_44133` / 천안시 서북구 / order 139
- `SGG_29200` / 광산구 / order 140

## Exclusion Set

All currently enabled SGG are excluded from batch-12 recommendation.

Batch-4 through batch-11 actual open SGG are also excluded:

- batch-4: `SGG_11545`, `SGG_11620`
- batch-5: `SGG_41360`, `SGG_48250`
- batch-6: `SGG_41465`, `SGG_41220`
- batch-7: `SGG_41463`, `SGG_29170`
- batch-8: `SGG_28260`, `SGG_27290`
- batch-9: `SGG_31140`, `SGG_27260`
- batch-10: `SGG_41150`, `SGG_41390`
- batch-11: `SGG_44133`, `SGG_29200`

Earlier enabled SGG from the baseline registry remain enabled and are also not
batch-12 candidates.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
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

- `328b11f docs(koaptix): record batch-11 open verification` changed only
  `docs/KOAPTIX_BATCH11_READINESS_REVIEW_2026-04-22.md`.
- `17b64a3 feat(koaptix): open batch-11 ready sgg exposure` changed only
  `src/lib/koaptix/universes.ts`.

Findings:

- Batch-4 through batch-11 are already documented as open.
- `src/lib/koaptix/universes.ts` has all batch-4 through batch-11 SGG enabled.
- Current enabled SGG count is 40.
- Existing readiness review pattern recommends at most two SGG per batch and
  defers other READY candidates without rejecting them for data quality.
- Batch-12 should follow the same pattern: recommend at most two candidates and
  leave all other viable candidates as HOLD.

## Candidate Review Method

This review did not run build or release gate because it is not an actual-open
turn.

Read-only checks performed:

- registry parse from `src/lib/koaptix/universes.ts`
- existing batch-4 through batch-11 readiness review comparison
- read-only Supabase candidate recheck against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

Read-only scan summary:

- checked at: `2026-04-22T06:59:38.466Z`
- enabled SGG excluded: 40
- priority and not-ready candidates sampled: 21
- READY candidates observed in the sampled set: 12

The scan avoided DB writes, migrations, snapshot rebuilds, source-of-truth
changes, registry changes, API route changes, package changes, script changes,
and gate changes.

## Candidate Review

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not already opened in batch-4 through batch-11.
3. Existing readiness documents provide a deferred candidate basis.
4. `v_koaptix_latest_universe_rank_board_u` has latest board rows.
5. `koaptix_rank_snapshot` has a latest snapshot.
6. `v_koaptix_universe_rank_history_dynamic` has a row for the latest snapshot.
7. `region_dim` has clear identity.
8. A future open can remain registry-scoped with narrow rollback.

| Rank | Candidate | Label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_27230` | 대구광역시 북구 | 147 | `2026-04-21` | true | `complex_id=137330`, rank 1, 침산1차푸르지오(2-2) | READY |
| 2 | `SGG_26350` | 부산광역시 해운대구 | 141 | `2026-04-21` | true | `complex_id=121684`, rank 1, 더샵센텀파크1차 | READY |
| 3 | `SGG_28185` | 인천광역시 연수구 | 136 | `2026-04-21` | true | `complex_id=149576`, rank 1, 더샵송도마리나베이 | HOLD |
| 4 | `SGG_48330` | 경상남도 양산시 | 123 | `2026-04-21` | true | `complex_id=294968`, rank 1, 양산대방노블랜드8차로얄카운티 | HOLD |
| 5 | `SGG_41173` | 경기도 안양시 동안구 | 120 | `2026-04-21` | true | `complex_id=198411`, rank 1, 평촌센텀퍼스트 | HOLD |
| 6 | `SGG_48170` | 경상남도 진주시 | 119 | `2026-04-21` | true | `complex_id=290442`, rank 1, 엠코타운더프라하 | HOLD |
| 7 | `SGG_48310` | 경상남도 거제시 | 88 | `2026-04-21` | true | `complex_id=294256`, rank 1, 이편한세상거제유로스카이 | HOLD |
| 8 | `SGG_26410` | 부산광역시 금정구 | 84 | `2026-04-21` | true | `complex_id=125890`, rank 1, 래미안장전 | HOLD |
| 9 | `SGG_26290` | 부산광역시 남구 | 81 | `2026-04-21` | true | `complex_id=118195`, rank 1, 더블유 | HOLD |
| 10 | `SGG_48123` | 경상남도 창원시 성산구 | 81 | `2026-04-21` | true | `complex_id=288078`, rank 1, 성원 | HOLD |

HOLD candidates are not rejected for data quality. They are held because this
review caps the recommended batch-12 open set at two candidates.

## Non-Recommendations / Hold

Held despite passing direct source-of-truth checks:

- `SGG_28185`
- `SGG_48330`
- `SGG_41173`
- `SGG_48170`
- `SGG_48310`
- `SGG_26410`
- `SGG_26290`
- `SGG_48123`
- `SGG_50110`
- `SGG_41171`

Reason: maximum batch-12 recommendation size is two. These candidates require a
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
observed for these examples during this read-only scan.

## Recommended Batch-12 Open Set

- `SGG_27230` / 대구광역시 북구
- `SGG_26350` / 부산광역시 해운대구

Recommendation reason:

- Both are currently not registry enabled.
- Neither overlaps batch-4 through batch-11.
- Both have latest board rows, latest snapshot, and dynamic sample evidence.
- Both have clear `region_dim` identity.
- A future actual-open turn can keep rollback scope registry-only and exactly
  these two candidates.

## Current Status

Batch-12 readiness scan is complete.

Batch-12 actual open was not performed. No registry, code, API route, script,
SQL, source-of-truth, package, component, test, or env file was modified.

## Expected Rollback Scope

No rollback is required for this docs-only readiness scan.

If a future batch-12 actual-open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_27230`
- `SGG_26350`

## Next Recommended Step

Run a separate explicit batch-12 actual open turn only if the user approves
opening exactly:

- `SGG_27230`
- `SGG_26350`

Do not treat this readiness review as service exposure.
