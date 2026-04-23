# KOAPTIX Batch-18 Evidence Refresh - 2026-04-22

## Purpose

This document records a batch-18 evidence refresh / audit pass after the batch-18 readiness review ended in HOLD.

This pass is evidence refresh only:

- no actual open was performed
- `src/lib/koaptix/universes.ts` was not modified
- registry, code, API, SQL, source-of-truth, components, scripts, package, env, test/gate, and generated artifacts were not modified
- no build, dev server, smoke, gate, DB mutation, SQL mutation, or open flow was run

The service exposure source of truth remains `src/lib/koaptix/universes.ts`. The universe board source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `530f7c3`
- Latest relevant commit: `530f7c3 docs(koaptix): add batch-18 readiness review`
- Batch-17 actual open: complete
- Batch-17 post-open docs reconciliation: complete
- Batch-18 readiness review: complete with `NONE` / HOLD recommendation
- Batch-18 actual open: not performed

Read-only registry parsing confirmed:

- Enabled macro universe count: 16
- Enabled SGG count: 52
- Current last enabled SGG order: 152

## Files Reviewed

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH18_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH17_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH16_READINESS_REVIEW_2026-04-22.md`
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

Read-only repo searches were run for the audit target codes across `docs` and `src`.

## Audit Targets

Primary audit targets reviewed:

- `SGG_41590`
- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

All already enabled/opened SGGs remain excluded from refreshed recommendation.

## Evidence Findings

| Candidate | Registry status | Evidence found in refresh | Status after refresh |
| --- | --- | --- | --- |
| `SGG_41590` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_28115` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_28116` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_28265` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_28720` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_41110` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_41130` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_41170` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |
| `SGG_41190` | absent from current registry | found only as a prior sampled weak-evidence / insufficient-evidence item; no documented latest board rows, snapshot date, or dynamic sample found | INSUFFICIENT_EVIDENCE |

No target candidate changed from `INSUFFICIENT_EVIDENCE` to `READY` in this refresh pass.

## Refreshed Recommendation

Refreshed READY set:

- `NONE`

Continued HOLD rationale:

- The batch-18 readiness review already excluded the last high-evidence HOLD candidates because they were opened in batch-17.
- This evidence refresh found no new repo-local latest board row evidence for the remaining target candidates.
- This evidence refresh found no new repo-local snapshot-date evidence for the remaining target candidates.
- This evidence refresh found no new repo-local dynamic-path/sample evidence for the remaining target candidates.
- Readiness is not inferred from membership or likelihood.

## Non-Action Statement

- Actual open performed: no
- Registry/code/API/SQL/source-of-truth/components/scripts/package/env/test/gate/generated changes: none
- Rollback required: no

Do not run a batch-18 actual open from this evidence refresh because the refreshed READY set is `NONE`.

## Next Recommended Step

Continue HOLD until an evidence-producing audit can record concrete latest board rows, snapshot-date evidence, and dynamic-path/sample evidence for additional non-opened SGG candidates.

Acceptable future work should remain separate from actual open:

- evidence-producing read-only audit over non-opened SGG candidates
- documentation of concrete candidate rows and samples
- a new readiness review only after stronger evidence exists
