# KOAPTIX Batch-13 Readiness Review - 2026-04-22

## Purpose

This document records the batch-13 SGG readiness scan and the later post-open
verification result from commit `0c4d667`.

The readiness review itself did not open batch-13 and did not modify registry
exposure, `src/lib/koaptix/universes.ts`, DB, SQL, source of truth, API routes,
gate scripts, package files, components, tests, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `f9094d8`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-12 actual open commit: `47639fe feat(koaptix): open batch-12 ready sgg exposure`
- Batch-12 post-open docs commit: `f9094d8 docs(koaptix): record batch-12 open verification`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- KOREA_ALL home delivery stabilization commit: `9747d07 fix(koaptix): stabilize korea home delivery path`
- KOREA_ALL KPI noise hardening commit: `13e92a8 fix(koaptix): reduce korea home kpi query noise`
- Batch-13 readiness docs commit: `651e492 docs(koaptix): add batch-13 readiness review`
- Batch-13 open commit: `0c4d667 feat(koaptix): open batch-13 ready sgg exposure`

This baseline is after batch-12 open and post-open documentation.

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

Enabled SGG count: 42.

Latest staged registry block:

- `SGG_27230` / 북구 / order 141
- `SGG_26350` / 해운대구 / order 142

## Exclusion Set

All currently enabled SGG are excluded from batch-13 recommendation.

Batch-4 through batch-12 actual open SGG are also excluded:

- batch-4: `SGG_11545`, `SGG_11620`
- batch-5: `SGG_41360`, `SGG_48250`
- batch-6: `SGG_41465`, `SGG_41220`
- batch-7: `SGG_41463`, `SGG_29170`
- batch-8: `SGG_28260`, `SGG_27290`
- batch-9: `SGG_31140`, `SGG_27260`
- batch-10: `SGG_41150`, `SGG_41390`
- batch-11: `SGG_44133`, `SGG_29200`
- batch-12: `SGG_27230`, `SGG_26350`

Earlier enabled SGG from the baseline registry remain enabled and are also not
batch-13 candidates.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
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

- `f9094d8 docs(koaptix): record batch-12 open verification` changed only
  `docs/KOAPTIX_BATCH12_READINESS_REVIEW_2026-04-22.md`.
- `47639fe feat(koaptix): open batch-12 ready sgg exposure` changed only
  `src/lib/koaptix/universes.ts`.

Findings:

- Batch-4 through batch-12 are already documented as open.
- `src/lib/koaptix/universes.ts` has all batch-4 through batch-12 SGG enabled.
- Current enabled SGG count is 42.
- Existing readiness review pattern recommends at most two SGG per batch and
  defers other READY candidates without rejecting them for data quality.
- Batch-13 should follow the same pattern: recommend at most two candidates and
  leave other viable candidates as HOLD.

## Candidate Review Method

This review did not run build or release gate because it is not an actual-open
turn.

Read-only checks performed:

- registry parse from `src/lib/koaptix/universes.ts`
- existing batch-4 through batch-12 readiness review comparison
- read-only Supabase candidate recheck against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

Read-only scan summary:

- checked at: `2026-04-22T07:36:51.392Z`
- enabled SGG excluded: 42
- priority and not-ready candidates sampled: 19
- READY candidates observed in the sampled set: 10

The scan avoided DB writes, migrations, snapshot rebuilds, source-of-truth
changes, registry changes, API route changes, package changes, script changes,
gate changes, and build output changes.

## Candidate Review

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not already opened in batch-4 through batch-12.
3. Existing readiness documents provide a deferred candidate basis.
4. `v_koaptix_latest_universe_rank_board_u` has latest board rows.
5. `koaptix_rank_snapshot` has a latest snapshot.
6. `v_koaptix_universe_rank_history_dynamic` has a row for the latest snapshot.
7. `region_dim` has clear identity.
8. A future open can remain registry-scoped with narrow rollback.

| Rank | Candidate | Label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_28185` | 인천광역시 연수구 | 136 | `2026-04-21` | true | `complex_id=149576`, rank 1, 더샵송도마리나베이 | READY |
| 2 | `SGG_48330` | 경상남도 양산시 | 123 | `2026-04-21` | true | `complex_id=294968`, rank 1, 양산대방노블랜드8차로얄카운티 | READY |
| 3 | `SGG_41173` | 경기도 안양시 동안구 | 120 | `2026-04-21` | true | `complex_id=198411`, rank 1, 평촌센텀퍼스트 | HOLD |
| 4 | `SGG_48170` | 경상남도 진주시 | 119 | `2026-04-21` | true | `complex_id=290442`, rank 1, 엠코타운더프라하 | HOLD |
| 5 | `SGG_48310` | 경상남도 거제시 | 88 | `2026-04-21` | true | `complex_id=294256`, rank 1, 이편한세상거제유로스카이 | HOLD |
| 6 | `SGG_26410` | 부산광역시 금정구 | 84 | `2026-04-21` | true | `complex_id=125890`, rank 1, 래미안장전 | HOLD |
| 7 | `SGG_26290` | 부산광역시 남구 | 81 | `2026-04-21` | true | `complex_id=118195`, rank 1, 더블유 | HOLD |
| 8 | `SGG_48123` | 경상남도 창원시 성산구 | 81 | `2026-04-21` | true | `complex_id=288078`, rank 1, 성원 | HOLD |
| 9 | `SGG_50110` | 제주특별자치도 제주시 | 78 | `2026-04-21` | true | `complex_id=299339`, rank 1, 노형뜨란채 | HOLD |
| 10 | `SGG_41171` | 경기도 안양시 만안구 | 67 | `2026-04-21` | true | `complex_id=195794`, rank 1, 래미안안양메가트리아 | HOLD |

HOLD candidates are not rejected for data quality. They are held because this
review caps the recommended batch-13 open set at two candidates.

## Non-Recommendations / Hold

Held despite passing direct source-of-truth checks:

- `SGG_41173`
- `SGG_48170`
- `SGG_48310`
- `SGG_26410`
- `SGG_26290`
- `SGG_48123`
- `SGG_50110`
- `SGG_41171`

Reason: maximum batch-13 recommendation size is two. These candidates require a
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

## Recommended Batch-13 Open Set

- `SGG_28185` / 인천광역시 연수구
- `SGG_48330` / 경상남도 양산시

Recommendation reason:

- Both are currently not registry enabled.
- Neither overlaps batch-4 through batch-12.
- Both have latest board rows, latest snapshot, and dynamic sample evidence.
- Both have clear `region_dim` identity.
- A future actual-open turn can keep rollback scope registry-only and exactly
  these two candidates.

## Actual Open Status

Batch-13 was opened later by:

- `0c4d667 feat(koaptix): open batch-13 ready sgg exposure`

That commit changed exactly one runtime file:

- `src/lib/koaptix/universes.ts`

The open exposed exactly:

- `SGG_28185`
- `SGG_48330`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_28185` | 연수구 | 143 | true | true | true | true | true |
| `SGG_48330` | 양산시 | 144 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Post-Open Result

Open result:

- enabled SGG count after open: 44
- `npm run build`: PASS
- home URL checks: PASS
  - `/?universe=SGG_28185`: 200
  - `/?universe=SGG_48330`: 200
- `/ranking` URL checks: PASS
  - `/ranking?universe=SGG_28185`: 200
  - `/ranking?universe=SGG_48330`: 200
- `/api/rankings`: PASS
  - `/api/rankings?universe_code=SGG_28185&limit=20`: 200, count 20
  - `/api/rankings?universe_code=SGG_48330&limit=20`: 200, count 20
- `/api/map`: PASS
  - `/api/map?universe_code=SGG_28185&limit=20`: 200
  - `/api/map?universe_code=SGG_48330&limit=20`: 200
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

- `audit:sgg`: PASS, `enabled=44`, `confirmed=44`
- home, ranking, manual API checks: PASS
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-13 Open

Batch-13 is open as of commit `0c4d667`.

No DB, SQL, source-of-truth, API route, gate script, package, script, component,
or docs change was part of the open commit. The open commit changed only
`src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, or env.

Do not treat batch-13 as an open-ended block. Any additional SGG exposure after
`SGG_28185` and `SGG_48330` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, manual checks, API checks, and the SGG
release gate passed after the registry-only open.

If a later batch-13-specific regression is proven, rollback scope should be
registry-only and exactly the batch-13 block:

- `SGG_28185`
- `SGG_48330`

No DB, SQL, source-of-truth, API route, package, script, or component rollback
should be needed for a batch-13 registry-only rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_28185` and `SGG_48330` was opened
- no batch-4 through batch-12 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit
- `dev.log`, `tsconfig.tsbuildinfo`, and `next-env.d.ts` were not committed

## Next Recommended Step

Run a separate batch-14 readiness review before any additional SGG exposure.
