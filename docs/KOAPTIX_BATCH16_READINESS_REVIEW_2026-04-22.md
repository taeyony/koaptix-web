# KOAPTIX Batch-16 Readiness Review - 2026-04-22

## Purpose

This document records the batch-16 SGG readiness scan only.

Batch-16 actual open was not performed. This review does not modify registry
exposure, `src/lib/koaptix/universes.ts`, DB, SQL, source of truth, API routes,
gate scripts, package files, components, tests, generated artifacts, env, or
runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `37cd727`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-15 readiness docs commit: `2b6fce6 docs(koaptix): add batch-15 readiness review`
- Batch-15 actual open commit: `58987a6 feat(koaptix): open batch-15 ready sgg exposure`
- Batch-15 post-open docs commit: `37cd727 docs(koaptix): record batch-15 open verification`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- KOREA_ALL home delivery stabilization commit: `9747d07 fix(koaptix): stabilize korea home delivery path`
- KOREA_ALL KPI noise hardening commit: `13e92a8 fix(koaptix): reduce korea home kpi query noise`

This baseline is after batch-15 open and post-open documentation.

## Current Registry Status

Source reviewed: `src/lib/koaptix/universes.ts`.

Enabled macro universes: 16.

Enabled SGG count: 48.

Current last enabled SGG order: 148.

Latest staged registry block:

- `SGG_48310` / 거제시 / order 147
- `SGG_26410` / 금정구 / order 148

Batch-16 is the next pending batch.

## Exclusion Basis

The registry is the source of truth for service exposure. All currently enabled
SGG are excluded from batch-16 recommendation.

Batch-4 through batch-15 actual open SGG are also excluded:

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
- batch-15: `SGG_48310`, `SGG_26410`

Earlier enabled SGG from the baseline registry remain enabled and are also not
batch-16 candidates.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH15_READINESS_REVIEW_2026-04-22.md`
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

- Batch-15 is fully complete: readiness, actual open, and post-open docs are
  all present.
- `58987a6` opened exactly `SGG_48310` and `SGG_26410`.
- `37cd727` recorded the batch-15 post-open verification.
- Current enabled SGG count is 48.
- Current last enabled SGG order is 148.
- Batch-16 should follow the established pattern: recommend at most two SGG and
  leave additional viable candidates as HOLD.

## Candidate Review Method

This review did not run build, dev server, or release gate because it is not an
actual-open turn.

Read-only checks performed:

- registry parse from `src/lib/koaptix/universes.ts`
- existing batch-8 through batch-15 readiness review comparison
- review of repo-local readiness evidence already recorded in prior documents

No DB writes, migrations, snapshot rebuilds, source-of-truth changes, registry
changes, API route changes, package changes, script changes, gate changes,
build output changes, or generated artifact changes were performed.

## Candidate Review

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not already opened in batch-4 through batch-15.
3. Existing readiness documents provide direct candidate evidence.
4. `v_koaptix_latest_universe_rank_board_u` latest board rows are documented.
5. `koaptix_rank_snapshot` latest snapshot date is documented.
6. `v_koaptix_universe_rank_history_dynamic` dynamic-path evidence is documented.
7. Region identity is clear in the prior readiness evidence.
8. A future open can remain registry-scoped with narrow rollback.

| Candidate | Label | Evidence source | Evidence summary | Status |
| --- | --- | --- | --- | --- |
| `SGG_26290` | 남구 | batch-14 and batch-15 HOLD tables | latest board rows 81, snapshot `2026-04-21`, dynamic true, sample `complex_id=118195`, rank 1, Deobleu | READY |
| `SGG_48123` | 창원시 성산구 | batch-14 and batch-15 HOLD tables | latest board rows 81, snapshot `2026-04-21`, dynamic true, sample `complex_id=288078`, rank 1, Seongwon | READY |
| `SGG_50110` | 제주시 | batch-14 and batch-15 HOLD tables | latest board rows 78, snapshot `2026-04-21`, dynamic true, sample `complex_id=299339`, rank 1 | HOLD |
| `SGG_41171` | 안양시 만안구 | batch-14 and batch-15 HOLD tables | latest board rows 67, snapshot `2026-04-21`, dynamic true, sample `complex_id=195794`, rank 1 | HOLD |
| `SGG_48310` | 거제시 | registry and batch-15 post-open docs | already opened in batch-15, order 147 | ALREADY_ENABLED_OR_OPENED |
| `SGG_26410` | 금정구 | registry and batch-15 post-open docs | already opened in batch-15, order 148 | ALREADY_ENABLED_OR_OPENED |
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
review caps the recommended batch-16 open set at two candidates.

## Recommended Batch-16 Open Set

- `SGG_26290` / 남구
- `SGG_48123` / 창원시 성산구

Recommendation reason:

- Both are currently not registry enabled.
- Neither overlaps batch-4 through batch-15.
- Both have latest board rows, latest snapshot, and dynamic sample evidence in
  repo-local readiness documents.
- Both have clear region identity in the prior readiness evidence.
- A future actual-open turn can keep rollback scope registry-only and exactly
  these two candidates.

## HOLD / Watchlist

Strong but not recommended in batch-16 because of the two-candidate cap:

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

Batch-16 readiness scan is complete.

Batch-16 actual open was not performed. No registry, code, API route, script,
SQL, source-of-truth, package, component, test, generated artifact, or env file
was modified.

## Expected Rollback Scope

No rollback is required for this docs-only readiness scan.

If a future batch-16 actual-open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_26290`
- `SGG_48123`

## Next Recommended Step

Run a separate explicit batch-16 actual open turn only if the user approves
opening exactly:

- `SGG_26290`
- `SGG_48123`

Do not treat this readiness review as service exposure.
