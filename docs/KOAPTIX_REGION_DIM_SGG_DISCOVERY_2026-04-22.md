# KOAPTIX Region-Dim SGG Discovery Audit - 2026-04-22

## Purpose / Baseline

This document records a region_dim-seeded read-only SGG candidate discovery pass for stalled SGG staged exposure.

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `436c135`
- Latest relevant commit: `436c135 docs(koaptix): add stalled sgg discovery path plan`
- Batch-17: fully complete
- Batch-18 readiness: HOLD
- Batch-18 evidence refresh: HOLD
- Batch-18 readonly audit: HOLD
- Batch-18 wide sweep: HOLD
- Stalled discovery-path investigation: `EXISTING_LIGHTWEIGHT_PATH_FOUND`
- Batch-18 actual open: not performed

## Current Enabled Count / Last Order Baseline

Read-only registry parsing from `src/lib/koaptix/universes.ts` confirmed:

- Enabled SGG count: 52
- Current last enabled SGG order: 152

## Candidate Enumeration Source

The lighter candidate source was `region_dim`, not the heavy latest-board view.

Read-only enumeration shape:

```text
region_dim
where region_type = 'sigungu'
order by region_code asc
derive code as SGG_<5-digit region_code>
```

Coverage:

- Checked at: `2026-04-23T05:45:21.362Z`
- Active sigungu rows from `region_dim`: 308
- Valid canonical `SGG_<5-digit>` candidates after derivation: 308
- Non-enabled candidates after registry exclusion: 256

## Exclusion Basis

Currently enabled/opened SGGs were parsed from `src/lib/koaptix/universes.ts` and excluded before evidence checks.

Additional repo-local check:

- `rg` for `SGG_26110` and `SGG_26140` across `docs`, `src`, and `scripts` returned no prior mentions.
- Therefore neither surfaced code is currently enabled, documented as previously opened, or contradicted by prior HOLD reasoning.

## Verification Method

Verification used bounded exact per-code read-only checks. It did not retry the heavy latest-board wide sweep or prefix `LIKE` discovery query.

Per candidate:

1. latest snapshot:
   - `koaptix_rank_snapshot`
   - exact `universe_code = <candidate>`
   - order `snapshot_date desc`
   - limit 1
2. latest board sample:
   - `v_koaptix_latest_universe_rank_board_u`
   - exact `universe_code = <candidate>`
   - order `rank_all asc`
   - limit 1
3. dynamic sample:
   - `v_koaptix_universe_rank_history_dynamic`
   - exact `universe_code = <candidate>`
   - exact latest `snapshot_date`
   - order `rank_all asc`
   - limit 1

Bound:

- Chunk size: 10 candidates
- Stop condition: stop after 2 READY candidates, 80 checked candidates, or 120000 ms deadline
- Actual checked candidates: 2
- Actual stop reason: early success with 2 READY candidates inside the first chunk
- Query timeouts: none
- Query errors: none

## Evidence Findings

| Candidate | Label | Status | Latest board row evidence | Snapshot-date evidence | Dynamic sample evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SGG_26110` | 부산광역시 중구 | READY | yes, `complex_id=108267`, rank 1, `금호`, read 6974 ms | yes, `2026-04-22`, read 161 ms | yes, `complex_id=108267`, rank 1, `금호`, read 510 ms | not enabled; no repo-local prior open mention; no query error |
| `SGG_26140` | 부산광역시 서구 | READY | yes, `complex_id=110352`, rank 1, `힐스테이트이진베이시티아파트`, read 3773 ms | yes, `2026-04-22`, read 233 ms | yes, `complex_id=110352`, rank 1, `힐스테이트이진베이시티아파트`, read 234 ms | not enabled; no repo-local prior open mention; no query error |

## Refreshed READY Set

Refreshed READY set:

- `SGG_26110`
- `SGG_26140`

This is an early-success result, not an exhaustive scan of all 256 non-enabled candidates.

## Explicit Non-Action Statement

- Actual open performed: no
- Registry edit performed: no
- `src/lib/koaptix/universes.ts` modified: no
- Code, API routes, SQL, source-of-truth, components, scripts, package, env, test/gate, and generated artifacts modified: no
- DB evidence fabricated: no
- Build, dev server, smoke, gate, and SQL mutation commands run: no
