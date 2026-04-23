# KOAPTIX Batch-18 Read-Only Audit - 2026-04-22

## Purpose

This document records a read-only evidence-producing audit for stalled SGG staged exposure after the batch-18 readiness review and evidence refresh both ended in HOLD.

This audit did not perform an actual open, did not modify `src/lib/koaptix/universes.ts`, and did not modify registry, code, API, SQL, source-of-truth, components, scripts, package, env, test/gate, or generated artifacts.

The service exposure registry remains `src/lib/koaptix/universes.ts`. The board source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `bdc8f38`
- Latest relevant commit: `bdc8f38 docs(koaptix): add batch-18 evidence refresh`
- Batch-17: fully complete
- Batch-18 readiness: completed with `NONE` / HOLD
- Batch-18 evidence refresh: completed with `NONE` / HOLD
- Batch-18 actual open: not performed

Read-only registry parsing confirmed:

- Enabled macro universe count: 16
- Enabled SGG count: 52
- Current last enabled SGG order: 152

## Files And Commands Reviewed

Read-only files reviewed:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH18_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH18_EVIDENCE_REFRESH_2026-04-22.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- prior batch readiness docs as needed

Read-only commands used:

- `rg` over `docs`, `src`, and `scripts` for target candidate codes
- registry parsing of `src/lib/koaptix/universes.ts`
- `npm run diagnose:sgg-direct` with:
  - `KOAPTIX_DIRECT_READ_CODES=SGG_41590,SGG_28115,SGG_28116,SGG_28265,SGG_28720,SGG_41110,SGG_41130,SGG_41170,SGG_41190`
  - `KOAPTIX_DIRECT_READ_REPEATS=1`

The direct-read command is read-only. It reads:

- `koaptix_rank_snapshot`
- `v_koaptix_latest_universe_rank_board_u`
- `v_koaptix_universe_rank_history_dynamic`

It does not mutate DB, SQL, registry, source code, package, scripts, test/gate logic, or generated artifacts.

## Audit Targets

Primary stalled targets reviewed:

- `SGG_41590`
- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

All currently enabled/opened SGGs remain excluded from recommendation.

## Evidence Findings

Direct read checked at `2026-04-23T03:30:42.222Z` with one attempt per target.

| Candidate | Registry status | Latest board row evidence | Snapshot-date evidence | Dynamic sample evidence | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SGG_41590` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_28115` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_28116` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_28265` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_28720` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_41110` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_41130` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_41170` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |
| `SGG_41190` | absent from current registry | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | INSUFFICIENT_EVIDENCE | Supabase read returned no row evidence and no error |

No target candidate satisfies the READY evidence bundle:

1. not currently enabled in registry
2. not previously opened
3. latest board row evidence exists
4. snapshot-date evidence exists
5. dynamic-path/sample evidence exists
6. no contradiction from prior HOLD reasoning

The first two conditions are true for the target set, but conditions 3, 4, and 5 are not met for any candidate.

## Refreshed READY Set

Refreshed READY set:

- `NONE`

## Continued HOLD

The batch-18 staged exposure line remains HOLD.

Reason:

- direct read-only DB evidence found no latest board row for any target
- direct read-only DB evidence found no latest snapshot date for any target
- dynamic sample reads were not possible because no snapshot date existed for the target codes
- repo-local docs still only support weak-evidence / insufficient-evidence classification
- no candidate can be promoted without fabricated evidence

## Non-Action Statement

- Actual open performed: no
- Registry edit performed: no
- `src/lib/koaptix/universes.ts` modified: no
- API, SQL, source-of-truth, components, scripts, package, env, test/gate, generated artifacts modified: no
- Rollback required: no

Do not run a batch-18 actual open from this audit because the refreshed READY set is `NONE`.

## Next Recommended Step

Continue HOLD until candidate evidence is produced by a successful read-only audit or upstream snapshot/board generation that records:

- latest board rows
- snapshot dates
- dynamic-path/sample rows

Only after that evidence exists should a new readiness review recommend another narrow actual open set.
