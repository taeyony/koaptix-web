# KOAPTIX Stalled SGG Paginated Discovery Audit - 2026-04-22

## Purpose

This document records a narrower / paginated live discovery audit after the stalled SGG wide sweep also ended in HOLD.

This audit did not perform an actual open, did not modify `src/lib/koaptix/universes.ts`, and did not modify registry, code, API, SQL, source-of-truth, components, scripts, package, env, test/gate, or generated artifacts.

## Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `9491457`
- Latest relevant commit: `9491457 docs(koaptix): add stalled sgg wide sweep audit`
- Batch-18 readiness: HOLD
- Batch-18 evidence refresh: HOLD
- Batch-18 readonly audit: HOLD
- Batch-18 wide sweep: HOLD
- Batch-18 actual open: not performed

Read-only registry parsing confirmed:

- Enabled SGG count: 52
- Last enabled SGG order: 152

## Discovery Method

The prior wide sweep timed out when querying all `SGG_%` rows at once. This audit did not retry that exact query.

Instead, it used a prefix-chunked live read-only discovery query:

- source view: `v_koaptix_latest_universe_rank_board_u`
- filter: `universe_code LIKE 'SGG_XX%'`
- prefix chunks: `SGG_00%` through `SGG_99%`
- per chunk filter: `rank_all=1`
- per chunk limit: 200
- exclusion: current enabled SGG registry from `src/lib/koaptix/universes.ts`

If a non-enabled candidate surfaced from a completed prefix chunk, the audit planned to verify:

- latest board sample
- latest snapshot date from `koaptix_rank_snapshot`
- dynamic sample from `v_koaptix_universe_rank_history_dynamic`

## Coverage Achieved

Checked at `2026-04-23T04:14:26.097Z`.

Summary:

- Prefix chunks attempted: 100
- Chunk pattern: `SGG_00%` through `SGG_99%`
- Completed chunks with rows: 0
- SGG rank-1 codes discovered from completed chunks: 0
- Non-enabled candidates discovered from completed chunks: 0
- READY candidates discovered from completed chunks: 0

The following prefixes returned statement timeout and therefore were not completed:

- `SGG_11%`
- `SGG_26%`
- `SGG_27%`
- `SGG_28%`
- `SGG_29%`
- `SGG_30%`
- `SGG_31%`
- `SGG_32%`
- `SGG_33%`
- `SGG_36%`
- `SGG_41%`
- `SGG_43%`
- `SGG_44%`
- `SGG_46%`
- `SGG_47%`
- `SGG_48%`
- `SGG_50%`

Error for those chunks:

```text
canceling statement due to statement timeout
```

This is meaningful but not exhaustive live coverage. The query was narrower than the prior wide sweep, but active SGG-heavy prefixes still timed out.

## Exact Fallback Check For Stalled Targets

Because no new candidate surfaced from completed prefix chunks, the audit reran exact read-only direct diagnostics for the previously stalled non-enabled target set:

```text
KOAPTIX_DIRECT_READ_CODES=SGG_41590,SGG_28115,SGG_28116,SGG_28265,SGG_28720,SGG_41110,SGG_41130,SGG_41170,SGG_41190
KOAPTIX_DIRECT_READ_REPEATS=1
npm run diagnose:sgg-direct
```

Checked at `2026-04-23T04:14:51.287Z`.

## Evidence Findings

No new non-enabled candidate surfaced from completed prefix chunks. The exact fallback target evidence remained insufficient:

| Candidate | Status | Latest board row evidence | Snapshot-date evidence | Dynamic sample evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `SGG_41590` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_28115` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_28116` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_28265` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_28720` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_41110` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_41130` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_41170` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |
| `SGG_41190` | INSUFFICIENT_EVIDENCE | no, `latestBoardPasses=0`, `latestComplexId=null` | no, `snapshotPasses=0`, `snapshotDate=null` | no, `dynamicBoardPasses=0`, `dynamicComplexId=null` | exact direct read completed without DB error |

## Refreshed READY Set

Refreshed READY set:

- `NONE`

No candidate satisfies the READY evidence bundle:

1. not currently enabled in registry
2. not previously opened
3. latest board row evidence exists
4. snapshot-date evidence exists
5. dynamic-path/sample evidence exists
6. no contradiction from prior HOLD reasoning

## Continued HOLD

The stalled SGG staged exposure line remains HOLD.

Reasons:

- No new non-enabled SGG candidate surfaced from completed prefix chunks.
- Active SGG-heavy prefixes timed out even under prefix chunking.
- Exact direct-read diagnostics for the previously stalled targets still found no latest board rows, no snapshot dates, and no dynamic samples.
- The audit does not fabricate readiness from code presence or weak historical mentions.

## Non-Action Statement

- Actual open performed: no
- Registry edit performed: no
- `src/lib/koaptix/universes.ts` modified: no
- API, SQL, source-of-truth, components, scripts, package, env, test/gate, generated artifacts modified: no
- Rollback required: no

Do not run an actual open from this paginated discovery audit because the refreshed READY set is `NONE`.

## Next Recommended Step

Continue HOLD.

If further discovery is needed, use a more selective live-read strategy than prefix `LIKE`, such as an indexed candidate source or an upstream materialized candidate list. The current live prefix chunks still time out on active SGG-heavy regions.
