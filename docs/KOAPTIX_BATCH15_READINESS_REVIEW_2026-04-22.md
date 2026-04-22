# KOAPTIX Batch-15 Readiness Review - 2026-04-22

## Purpose

This document records the batch-15 SGG readiness scan and the later post-open
verification result from commit `58987a6`.

The readiness review itself did not open batch-15 and did not modify registry
exposure, `src/lib/koaptix/universes.ts`, DB, SQL, source of truth, API routes,
gate scripts, package files, components, tests, generated artifacts, or runtime
code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `d10effc`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-14 readiness docs commit: `c6d4812 docs(koaptix): add batch-14 readiness review`
- Batch-14 actual open commit: `a5188a6 feat(koaptix): open batch-14 ready sgg exposure`
- Batch-14 post-open docs commit: `d10effc docs(koaptix): record batch-14 open verification`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- KOREA_ALL home delivery stabilization commit: `9747d07 fix(koaptix): stabilize korea home delivery path`
- KOREA_ALL KPI noise hardening commit: `13e92a8 fix(koaptix): reduce korea home kpi query noise`

This baseline is after batch-14 open and post-open documentation.

## Current Registry Status

Source reviewed: `src/lib/koaptix/universes.ts`.

Enabled macro universes: 16.

Enabled SGG count: 46.

Latest staged registry block:

- `SGG_41173` / 안양시 동안구 / order 145
- `SGG_48170` / 진주시 / order 146

Batch-15 is the next pending batch.

## Exclusion Basis

The registry is the source of truth for service exposure. All currently enabled
SGG are excluded from batch-15 recommendation.

Batch-4 through batch-14 actual open SGG are also excluded:

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
- batch-14: `SGG_41173`, `SGG_48170`

Earlier enabled SGG from the baseline registry remain enabled and are also not
batch-15 candidates.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH14_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH13_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH12_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH11_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH10_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH9_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH8_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`

Findings:

- Batch-14 is fully complete: readiness, actual open, and post-open docs are
  all present.
- `a5188a6` opened exactly `SGG_41173` and `SGG_48170`.
- `d10effc` recorded the batch-14 post-open verification.
- Current enabled SGG count is 46.
- Batch-15 should follow the established pattern: recommend at most two SGG and
  leave additional viable candidates as HOLD.

## Candidate Review Method

This review did not run build, dev server, or release gate because it is not an
actual-open turn.

Read-only checks performed:

- registry parse from `src/lib/koaptix/universes.ts`
- existing batch-8 through batch-14 readiness review comparison
- review of repo-local readiness evidence already recorded in prior documents

No DB writes, migrations, snapshot rebuilds, source-of-truth changes, registry
changes, API route changes, package changes, script changes, gate changes, or
build output changes were performed.

## Candidate Review

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not already opened in batch-4 through batch-14.
3. Existing readiness documents provide direct candidate evidence.
4. `v_koaptix_latest_universe_rank_board_u` latest board rows are documented.
5. `koaptix_rank_snapshot` latest snapshot date is documented.
6. `v_koaptix_universe_rank_history_dynamic` dynamic-path evidence is documented.
7. `region_dim` identity is clear in the prior readiness evidence.
8. A future open can remain registry-scoped with narrow rollback.

| Candidate | Label | Evidence source | Evidence summary | Status |
| --- | --- | --- | --- | --- |
| `SGG_48310` | 거제시 | batch-14 HOLD table | latest board rows 88, snapshot `2026-04-21`, dynamic true, sample `complex_id=294256`, rank 1, e-Pyunhansesang Geoje Euro Sky | READY |
| `SGG_26410` | 금정구 | batch-14 HOLD table | latest board rows 84, snapshot `2026-04-21`, dynamic true, sample `complex_id=125890`, rank 1, Raemian Jangjeon | READY |
| `SGG_26290` | 남구 | batch-14 HOLD table | latest board rows 81, snapshot `2026-04-21`, dynamic true, sample `complex_id=118195`, rank 1, Deobleu | HOLD |
| `SGG_48123` | 창원시 성산구 | batch-14 HOLD table | latest board rows 81, snapshot `2026-04-21`, dynamic true, sample `complex_id=288078`, rank 1, Seongwon | HOLD |
| `SGG_50110` | 제주시 | batch-14 HOLD table | latest board rows 78, snapshot `2026-04-21`, dynamic true, sample `complex_id=299339`, rank 1 | HOLD |
| `SGG_41171` | 안양시 만안구 | batch-14 HOLD table | latest board rows 67, snapshot `2026-04-21`, dynamic true, sample `complex_id=195794`, rank 1 | HOLD |
| `SGG_41173` | 안양시 동안구 | registry and batch-14 post-open docs | already opened in batch-14, order 145 | ALREADY_ENABLED_OR_OPENED |
| `SGG_48170` | 진주시 | registry and batch-14 post-open docs | already opened in batch-14, order 146 | ALREADY_ENABLED_OR_OPENED |
| `SGG_41590` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_28115` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_28116` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_28265` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_28720` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_41110` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_41130` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_41170` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |
| `SGG_41190` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, no latest snapshot, no dynamic sample were documented in the sampled scan | INSUFFICIENT_EVIDENCE |

HOLD candidates are not rejected for data quality. They are held because this
review caps the recommended batch-15 open set at two candidates.

## Recommended Batch-15 Open Set

- `SGG_48310` / 거제시
- `SGG_26410` / 금정구

Recommendation reason:

- Both are currently not registry enabled.
- Neither overlaps batch-4 through batch-14.
- Both have latest board rows, latest snapshot, and dynamic sample evidence in
  repo-local readiness documents.
- Both have clear region identity in the prior readiness evidence.
- A future actual-open turn can keep rollback scope registry-only and exactly
  these two candidates.

## HOLD / Watchlist

Strong but not recommended in batch-15 because of the two-candidate cap:

- `SGG_26290`
- `SGG_48123`
- `SGG_50110`
- `SGG_41171`

Insufficient direct evidence in the sampled documents:

- `SGG_41590`
- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

## Current Status

Batch-15 readiness scan is complete.

Batch-15 actual open was not performed during the readiness scan. No registry,
code, API route, script, SQL, source-of-truth, package, component, test,
generated artifact, or env file was modified by the readiness scan.

## Expected Rollback Scope

No rollback is required for this docs-only readiness scan.

If a future batch-15 actual-open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_48310`
- `SGG_26410`

## Actual Open Status

Batch-15 was opened later by:

- `58987a6 feat(koaptix): open batch-15 ready sgg exposure`

That commit changed exactly one runtime file:

- `src/lib/koaptix/universes.ts`

The open exposed exactly:

- `SGG_48310`
- `SGG_26410`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_48310` | 거제시 | 147 | true | true | true | true | true |
| `SGG_26410` | 금정구 | 148 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Post-Open Result

Open result:

- enabled SGG count after open: 48
- `npm run build`: PASS
- build note: existing `metadataBase` warning only
- home URL checks: PASS
  - `/?universe=SGG_48310`: 200
  - `/?universe=SGG_26410`: 200
- `/ranking` URL checks: PASS
  - `/ranking?universe=SGG_48310`: 200
  - `/ranking?universe=SGG_26410`: 200
- `/api/rankings`: PASS
  - `/api/rankings?universe_code=SGG_48310&limit=20`: 200, count 20, same-universe rows
  - `/api/rankings?universe_code=SGG_26410&limit=20`: 200, count 20, same-universe rows
- `/api/map`: PASS
  - `/api/map?universe_code=SGG_48310&limit=20`: 200
  - `/api/map?universe_code=SGG_26410&limit=20`: 200
- map requested and rendered universe matched the requested SGG
- map `fallback=false`
- map `source=dynamic`
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `failed_command=NONE`
- `failed_universe_or_step=NONE`

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=48`, `confirmed=48`
- home, ranking, manual API checks: PASS
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-15 Open

Batch-15 is open as of commit `58987a6`.

No DB, SQL, source-of-truth, API route, gate script, package, script, component,
or docs change was part of the open commit. The open commit changed only
`src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-15 as an open-ended block. Any additional SGG exposure after
`SGG_48310` and `SGG_26410` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, manual checks, API checks, and the SGG
release gate passed after the registry-only open.

If a later batch-15-specific regression is proven, rollback scope should be
registry-only and exactly the batch-15 block:

- `SGG_48310`
- `SGG_26410`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-15 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_48310` and `SGG_26410` was opened
- no batch-4 through batch-14 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit
- `dev.log`, `tsconfig.tsbuildinfo`, and `next-env.d.ts` were not committed

## Next Recommended Step

Run a separate batch-16 readiness review before any additional SGG exposure.
