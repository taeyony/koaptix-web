# KOAPTIX Stalled SGG Wide Sweep Read-Only Audit - 2026-04-22

## Purpose

This document records a wide-sweep read-only audit after batch-18 remained HOLD.

This was not an actual open, not an open reconciliation, and not a registry/code/API/SQL/source-of-truth change. `src/lib/koaptix/universes.ts` was reviewed but not modified.

The goal was to avoid checking only the previously stalled 9 candidates and to look for any currently non-opened SGG with evidence in the live/source-of-truth read path.

## Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `6011119`
- Latest relevant commit: `6011119 docs(koaptix): add batch-18 readonly audit`
- Batch-17: fully complete
- Batch-18 readiness: HOLD
- Batch-18 evidence refresh: HOLD
- Batch-18 readonly audit: HOLD
- Batch-18 actual open: not performed

Read-only registry parsing confirmed:

- Enabled SGG count: 52
- Last enabled SGG order: 152

## Sweep Scope

Two read-only sweep attempts were made.

### Attempt 1 - Live Source-Of-Truth Wide Sweep

Attempted to query all SGG universe codes returned by `v_koaptix_latest_universe_rank_board_u` with `rank_all=1`, then exclude currently enabled registry entries and check each remaining candidate for:

- latest board sample
- latest snapshot date from `koaptix_rank_snapshot`
- dynamic sample from `v_koaptix_universe_rank_history_dynamic`

Result:

- The live wide sweep query timed out with Supabase/Postgres error `57014`, message `canceling statement due to statement timeout`.
- No write was performed.
- Because this sweep did not complete, it is not used to claim the absence of all possible non-opened SGGs in the live source of truth.

### Attempt 2 - Repo-Discoverable Non-Enabled Candidate Pool

As a bounded fallback, the audit built the full SGG candidate pool discoverable from repo-local docs:

- searched `docs` for all `SGG_\d{5}` codes
- parsed the current enabled SGG registry from `src/lib/koaptix/universes.ts`
- excluded all currently enabled/opened SGGs

Result:

- SGG codes discovered in docs: 61
- Enabled SGGs in registry: 52
- Non-enabled SGGs discoverable from docs: 9

The repo-discoverable non-enabled pool was:

- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`
- `SGG_41590`

This fallback pool is exactly the previously stalled target set. The audit therefore does not overstate this as an exhaustive live DB sweep.

## Read-Only Evidence Commands

Read-only command used for the fallback pool:

```text
KOAPTIX_DIRECT_READ_CODES=SGG_41590,SGG_28115,SGG_28116,SGG_28265,SGG_28720,SGG_41110,SGG_41130,SGG_41170,SGG_41190
KOAPTIX_DIRECT_READ_REPEATS=1
npm run diagnose:sgg-direct
```

The diagnostic reads:

- `koaptix_rank_snapshot`
- `v_koaptix_latest_universe_rank_board_u`
- `v_koaptix_universe_rank_history_dynamic`

It does not mutate data.

## Evidence Findings

Direct read checked at `2026-04-23T03:30:42.222Z` during the preceding readonly audit and was reused as concrete evidence for the same fallback pool. The wide sweep did not produce a broader successful live candidate pool due statement timeout.

| Candidate | Status | Latest board row evidence | Snapshot-date evidence | Dynamic sample evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `SGG_41590` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_28115` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_28116` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_28265` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_28720` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_41110` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_41130` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_41170` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |
| `SGG_41190` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | no DB error; no row evidence |

## Refreshed READY Set

Refreshed READY set:

- `NONE`

## Continued HOLD

The stalled SGG staged exposure line remains HOLD.

Reasons:

- The intended live wide sweep did not complete because the source-of-truth view query hit statement timeout.
- The repo-discoverable fallback pool produced no new candidates beyond the previously stalled 9.
- The direct-read evidence for the fallback pool has no latest board rows, no snapshot dates, and no dynamic samples.
- READY cannot be inferred from membership, code presence, or weak historical mentions.

## Non-Action Statement

- Actual open performed: no
- Registry edit performed: no
- `src/lib/koaptix/universes.ts` modified: no
- API, SQL, source-of-truth, components, scripts, package, env, test/gate, generated artifacts modified: no
- Rollback required: no

Do not run an actual open from this wide-sweep audit because the refreshed READY set is `NONE`.

## Next Recommended Step

Continue HOLD until a bounded read-only query can complete against the live source-of-truth path or until an upstream audit artifact records new candidate evidence:

- latest board row
- snapshot date
- dynamic sample

A useful next read-only task would be a paginated or narrower live SGG discovery query that avoids the statement timeout observed here.
