# KOAPTIX Batch-19 Readiness Review - 2026-04-22

## Purpose

This document records the batch-19 SGG readiness scan only.

This step does not perform an actual open, does not modify `src/lib/koaptix/universes.ts`, and does not modify API, SQL, source-of-truth, components, scripts, package, env, test/gate, or generated artifacts.

The service exposure source of truth remains the registry in `src/lib/koaptix/universes.ts`. The data source chain remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `06b914a`
- Latest relevant commit: `06b914a docs(koaptix): record batch-18 open verification`
- Batch-18 readiness: completed
- Batch-18 actual open: completed
- Batch-18 post-open docs reconciliation: completed
- Batch-18 completed opened SGG:
  - `SGG_26110` / 중구 / order 153
  - `SGG_26140` / 서구 / order 154

Batch-19 is the next pending SGG staged-exposure batch.

## Current Registry Status

Whole-file review of `src/lib/koaptix/universes.ts` confirmed:

- Enabled macro universe count: 16
- Enabled SGG count: 54
- Current last enabled SGG order: 154
- Batch-18 registry entries are enabled and ordered as expected:
  - `SGG_26110` / 중구 / order 153
  - `SGG_26140` / 서구 / order 154

No registry edit was performed in this readiness-only step.

## Exclusion Basis

Already enabled or already opened SGGs are excluded from batch-19 recommendation. The current registry is the source of truth for enabled state.

Minimum already-opened exclusion set through batch-18:

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
- batch-16: `SGG_26290`, `SGG_48123`
- batch-17: `SGG_50110`, `SGG_41171`
- batch-18: `SGG_26110`, `SGG_26140`

## Whole-File Review Inputs

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH18_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_REGION_DIM_SGG_DISCOVERY_2026-04-22.md`
- `docs/KOAPTIX_STALLED_SGG_DISCOVERY_PATH_PLAN_2026-04-22.md`
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
- `scripts/audit-sgg-readiness.mjs`
- `scripts/diagnose-sgg-direct-read.mjs`

No build, dev server, smoke, gate, SQL mutation, or runtime mutation command was run for this readiness-only step.

## Candidate Enumeration Source

Candidates were enumerated from the already-proven lightweight `region_dim` path, not by sweeping the heavy latest-board view.

Read-only enumeration shape:

```text
region_dim
where region_type = 'sigungu'
order by region_code asc
derive code as SGG_<5-digit region_code>
```

Coverage:

- Checked at: `2026-04-23T08:23:46.007Z`
- Active sigungu rows from `region_dim`: 308
- Valid canonical `SGG_<5-digit>` candidates after derivation: 308
- Enabled SGGs excluded from registry: 54
- Non-enabled candidates after registry exclusion: 254
- Additional repo-local `rg` check for `SGG_26170` and `SGG_26200`: no prior mentions in `docs`, `src`, or `scripts`

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
- Elapsed verification time: 7824 ms

## Candidate Review

READY requires:

- not currently registry enabled
- not already opened in batch-4 through batch-18
- latest board row evidence
- snapshot-date evidence
- dynamic-path/sample evidence
- no contradiction with prior HOLD or exclusion reasoning

| Candidate | Label | Status | Latest board row evidence | Snapshot-date evidence | Dynamic sample evidence | Evidence summary |
| --- | --- | --- | --- | --- | --- | --- |
| `SGG_26170` | 부산광역시 동구 | READY | yes, `complex_id=111167`, rank 1, `두산위브더제니스하버시티`, read 5200 ms | yes, `2026-04-22`, read 136 ms | yes, `complex_id=111167`, rank 1, `두산위브더제니스하버시티`, read 249 ms | not enabled; no repo-local prior open mention; no query error |
| `SGG_26200` | 부산광역시 영도구 | READY | yes, `complex_id=111404`, rank 1, `영도센트럴에일린의뜰`, read 1981 ms | yes, `2026-04-22`, read 94 ms | yes, `complex_id=111404`, rank 1, `영도센트럴에일린의뜰`, read 163 ms | not enabled; no repo-local prior open mention; no query error |

## Recommended Batch-19 Open Set

Recommended batch-19 open set:

- `SGG_26170` / 부산광역시 동구
- `SGG_26200` / 부산광역시 영도구

Recommendation rationale:

- Both candidates are absent from the current enabled registry.
- Neither candidate is documented as previously opened.
- Both have latest board row evidence, snapshot-date evidence, and dynamic sample evidence from bounded exact per-code read-only checks.
- The recommendation is capped at two SGG candidates to preserve the staged SGG exposure pattern.

## HOLD / Watchlist

No additional strong HOLD candidate was promoted in this scan after selecting the two READY candidates above.

This is an early-success result, not an exhaustive scan of all 254 non-enabled candidates. Any additional non-enabled SGG exposure after the recommended batch-19 set requires a separate future read-only readiness review.

Previously weak candidates from older HOLD/watchlist tables remain `INSUFFICIENT_EVIDENCE` unless a future exact-read audit produces fresh latest board, snapshot-date, and dynamic-path evidence.

## Current Status

- Batch-19 readiness scan: complete
- Recommended READY set: `SGG_26170`, `SGG_26200`
- Actual open performed during this readiness scan step: no
- Registry/code/API/SQL/source-of-truth/components/scripts/package/env/test/gate/generated changes during this readiness scan step: none
- Readiness-scan rollback required: no

## Next Recommended Step

Run a separate batch-19 actual-open prompt only for the READY set above:

- `SGG_26170`
- `SGG_26200`

This readiness scan did not perform the actual open. Do not include any additional batch-19 candidate in the next actual-open step unless a separate future read-only audit produces fresh READY evidence.
