# KOAPTIX Batch-11 Readiness Review - 2026-04-22

## Purpose

This document records the read-only batch-11 SGG readiness scan and the later
post-open verification result from commit `17b64a3`.

The readiness review itself did not open batch-11 and did not modify registry
exposure, `src/lib/koaptix/universes.ts`, DB, SQL, source of truth, API routes,
gate scripts, package files, components, tests, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `56bfae0`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-10 actual open commit: `3ba22ef feat(koaptix): open batch-10 ready sgg exposure`
- Batch-10 post-open docs commit: `56bfae0 docs(koaptix): record batch-10 open verification`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- KOREA_ALL home delivery stabilization commit: `9747d07 fix(koaptix): stabilize korea home delivery path`
- KOREA_ALL KPI noise hardening commit: `13e92a8 fix(koaptix): reduce korea home kpi query noise`
- Batch-11 readiness docs commit: `7ef43c3 docs(koaptix): add batch-11 readiness review`
- Batch-11 open commit: `17b64a3 feat(koaptix): open batch-11 ready sgg exposure`

This baseline is after batch-10 open and post-open documentation.

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

Enabled SGG count: 38.

Latest staged registry block:

- `SGG_41150` / Uijeongbu-si / order 137
- `SGG_41390` / Siheung-si / order 138

## Exclusion Set

All currently enabled SGG are excluded from batch-11 recommendation.

Batch-4 through batch-10 actual open SGG are also excluded:

- batch-4: `SGG_11545`, `SGG_11620`
- batch-5: `SGG_41360`, `SGG_48250`
- batch-6: `SGG_41465`, `SGG_41220`
- batch-7: `SGG_41463`, `SGG_29170`
- batch-8: `SGG_28260`, `SGG_27290`
- batch-9: `SGG_31140`, `SGG_27260`
- batch-10: `SGG_41150`, `SGG_41390`

Earlier enabled SGG from the baseline registry remain enabled and are also not
batch-11 candidates.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
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

- `56bfae0 docs(koaptix): record batch-10 open verification` changed only
  `docs/KOAPTIX_BATCH10_READINESS_REVIEW_2026-04-22.md`.
- `3ba22ef feat(koaptix): open batch-10 ready sgg exposure` changed only
  `src/lib/koaptix/universes.ts`.

Findings:

- Batch-4 through batch-10 are already documented as open.
- `src/lib/koaptix/universes.ts` has all batch-4 through batch-10 SGG enabled.
- Current enabled SGG count is 38.
- Existing readiness review pattern recommends at most two SGG per batch and
  defers other READY candidates without rejecting them for data quality.
- Batch-11 should follow the same pattern: recommend at most two candidates and
  leave all other candidates as HOLD.

## Candidate Review Method

This review did not run build or release gate because it is not an actual-open
turn.

Read-only checks performed:

- registry parse from `src/lib/koaptix/universes.ts`
- existing batch-4 through batch-10 readiness review comparison
- read-only Supabase candidate recheck against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

Read-only scan summary:

- checked at: `2026-04-22T06:06:33.101Z`
- enabled SGG excluded: 38
- priority and not-ready candidates sampled: 23
- READY candidates observed in the sampled set: 14

The scan avoided DB writes, migrations, snapshot rebuilds, source-of-truth
changes, registry changes, API route changes, package changes, script changes,
and gate changes.

## Candidate Review

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not already opened in batch-4 through batch-10.
3. Existing readiness documents provide a deferred candidate basis.
4. `v_koaptix_latest_universe_rank_board_u` has latest board rows.
5. `koaptix_rank_snapshot` has a latest snapshot.
6. `v_koaptix_universe_rank_history_dynamic` has a row for the latest snapshot.
7. `region_dim` has clear identity.
8. A future open can remain registry-scoped with narrow rollback.

| Rank | Candidate | Label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_44133` | 천안시 서북구 | 151 | `2026-04-21` | true | `complex_id=269628`, rank 1, Dujeong Station Hyosung Harrington Place | READY |
| 2 | `SGG_29200` | 광산구 | 150 | `2026-04-21` | true | `complex_id=170113`, rank 1, Hillstate River Park | READY |
| 3 | `SGG_27230` | 북구 | 147 | `2026-04-21` | true | `complex_id=137330`, rank 1, Chimsan 1st Prugio | HOLD |
| 4 | `SGG_26350` | 해운대구 | 141 | `2026-04-21` | true | `complex_id=121684`, rank 1, The Sharp Centum Park 1 | HOLD |
| 5 | `SGG_28185` | 연수구 | 136 | `2026-04-21` | true | `complex_id=149576`, rank 1, The Sharp Songdo Marina Bay | HOLD |
| 6 | `SGG_48330` | 양산시 | 123 | `2026-04-21` | true | `complex_id=294968`, rank 1, Yangsan Daebang Nobland 8 Royal County | HOLD |
| 7 | `SGG_41173` | 안양시 동안구 | 120 | `2026-04-21` | true | `complex_id=198411`, rank 1, Pyeongchon Centum First | HOLD |
| 8 | `SGG_48170` | 진주시 | 119 | `2026-04-21` | true | `complex_id=290442`, rank 1, Emco Town The Praha | HOLD |
| 9 | `SGG_48310` | 거제시 | 88 | `2026-04-21` | true | `complex_id=294256`, rank 1, e-Pyunhansesang Geoje Euro Sky | HOLD |
| 10 | `SGG_26410` | 금정구 | 84 | `2026-04-21` | true | `complex_id=125890`, rank 1, Raemian Jangjeon | HOLD |

HOLD candidates are not rejected for data quality. They are held because this
review caps the recommended batch-11 open set at two candidates.

## Non-Recommendations / Hold

Held despite passing direct source-of-truth checks:

- `SGG_27230`
- `SGG_26350`
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

Reason: maximum batch-11 recommendation size is two. These candidates require a
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

## Recommended Batch-11 Open Set

- `SGG_44133` / 천안시 서북구
- `SGG_29200` / 광산구

Recommendation reason:

- Both are currently not registry enabled.
- Neither overlaps batch-4 through batch-10.
- Both have latest board rows, latest snapshot, and dynamic sample evidence.
- Both have clear `region_dim` identity.
- A future actual-open turn can keep rollback scope registry-only and exactly
  these two candidates.

## Actual Open Status

Batch-11 was opened later by:

- `17b64a3 feat(koaptix): open batch-11 ready sgg exposure`

That commit changed exactly one runtime file:

- `src/lib/koaptix/universes.ts`

The open exposed exactly:

- `SGG_44133`
- `SGG_29200`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_44133` | Cheonan-si Seobuk-gu | 139 | true | true | true | true | true |
| `SGG_29200` | Gwangsan-gu | 140 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Post-Open Result

Open result:

- enabled SGG count after open: 40
- `npm run build`: PASS
- home URL checks: PASS
  - `/?universe=SGG_44133`: 200
  - `/?universe=SGG_29200`: 200
- `/ranking` URL checks: PASS
  - `/ranking?universe=SGG_44133`: 200
  - `/ranking?universe=SGG_29200`: 200
- `/api/rankings`: PASS
  - `/api/rankings?universe_code=SGG_44133&limit=20`: 200, count 20
  - `/api/rankings?universe_code=SGG_29200&limit=20`: 200, count 20
- `/api/map`: PASS
  - `/api/map?universe_code=SGG_44133&limit=20`: 200
  - `/api/map?universe_code=SGG_29200&limit=20`: 200
- map requested and rendered universe matched the requested SGG
- map `fallback=False`
- map `source=dynamic`
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `failed_command=NONE`
- `failed_universe_or_step=NONE`

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=40`, `confirmed=40`
- home, ranking, manual API checks: PASS
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-11 Open

Batch-11 is open as of commit `17b64a3`.

No DB, SQL, source-of-truth, API route, gate script, package, script, component,
or docs change was part of the open commit. The open commit changed only
`src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, or env.

Do not treat batch-11 as an open-ended block. Any additional SGG exposure after
`SGG_44133` and `SGG_29200` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, manual checks, API checks, and the SGG
release gate passed after the registry-only open.

If a later batch-11-specific regression is proven, rollback scope should be
registry-only and exactly the batch-11 block:

- `SGG_44133`
- `SGG_29200`

No DB, SQL, source-of-truth, API route, package, script, or component rollback
should be needed for a batch-11 registry-only rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_44133` and `SGG_29200` was opened
- no batch-4 through batch-10 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit
- `dev.log`, `tsconfig.tsbuildinfo`, and `next-env.d.ts` were not committed
