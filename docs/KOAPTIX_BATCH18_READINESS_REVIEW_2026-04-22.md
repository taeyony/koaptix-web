# KOAPTIX Batch-18 Readiness Review - 2026-04-22

## Purpose

This document records the batch-18 SGG readiness scan only.

This document was later updated by a docs-only readiness refresh after a region_dim-seeded read-only discovery pass found a concrete refreshed READY set. The original HOLD outcome is preserved below as historical context.

This step does not perform an actual open, does not modify `src/lib/koaptix/universes.ts`, and does not modify API, SQL, source-of-truth, components, scripts, package, env, test/gate, or generated artifacts.

The service exposure source of truth remains the registry in `src/lib/koaptix/universes.ts`. The data source chain remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `23e9f16`
- Latest relevant commit: `23e9f16 docs(koaptix): record batch-17 open verification`
- Batch-17 readiness commit: `b590eb3 docs(koaptix): add batch-17 readiness review`
- Batch-17 actual open commit: `5ab0cbd feat(koaptix): open batch-17 ready sgg exposure`
- Batch-17 post-open docs reconciliation commit: `23e9f16 docs(koaptix): record batch-17 open verification`
- Batch-17 completed opened SGG:
  - `SGG_50110` / 제주시 / order 151
  - `SGG_41171` / 안양시 만안구 / order 152

Batch-18 is the next pending SGG staged-exposure batch.

Docs-only readiness refresh baseline:

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `6ee935d`
- Latest relevant commit: `6ee935d docs(koaptix): add region-dim sgg discovery audit`
- Region-dim discovery audit: `docs/KOAPTIX_REGION_DIM_SGG_DISCOVERY_2026-04-22.md`
- Discovery-path plan: `docs/KOAPTIX_STALLED_SGG_DISCOVERY_PATH_PLAN_2026-04-22.md`
- Batch-18 actual open after refresh: not performed

## Current Registry Status

Whole-file review of `src/lib/koaptix/universes.ts` confirmed:

- Enabled macro universe count: 16
- Enabled SGG count: 52
- Current last enabled SGG order: 152
- Batch-17 registry entries are enabled and ordered as expected:
  - `SGG_50110` / 제주시 / order 151
  - `SGG_41171` / 안양시 만안구 / order 152

No registry edit was performed in this readiness-only step.

## Exclusion Basis

Already enabled or already opened SGGs are excluded from batch-18 recommendation. The current registry is the source of truth for enabled state.

Minimum already-opened exclusion set through batch-17:

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

## Whole-File Review Inputs

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
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

No build, dev server, smoke, gate, DB, SQL, or runtime mutation command was run for this readiness-only step.

## Candidate Review Method

Candidates were classified using only repo-local evidence and read-only command outputs.

READY requires:

- not currently registry enabled
- not already opened in batch-4 through batch-17
- repo-local documentation evidence for latest board rows
- snapshot-date evidence
- dynamic-path/sample evidence
- no contradiction with prior HOLD or exclusion reasoning

Candidates without direct latest board/snapshot/dynamic evidence remain `INSUFFICIENT_EVIDENCE`.

## Candidate Review

| Candidate | Label | Evidence source | Evidence summary | Status |
| --- | --- | --- | --- | --- |
| `SGG_50110` | 제주시 | registry and batch-17 post-open verification | already opened in batch-17, enabled=true, order 151 | ALREADY_ENABLED_OR_OPENED |
| `SGG_41171` | 안양시 만안구 | registry and batch-17 post-open verification | already opened in batch-17, enabled=true, order 152 | ALREADY_ENABLED_OR_OPENED |
| `SGG_41590` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28115` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28116` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28265` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28720` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41110` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41130` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41170` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41190` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |

## Original Batch-18 Readiness Outcome

The original batch-18 readiness scan ended in HOLD.

Reason:

- The remaining previously held high-evidence candidates, `SGG_50110` and `SGG_41171`, were already enabled/opened in batch-17.
- The remaining watchlist candidates found in repo-local docs did not have documented latest board rows, snapshot-date evidence, or dynamic-path/sample evidence.
- The original scan did not force two candidates just to fill a batch.

## Original Recommended Batch-18 Open Set

Original recommended batch-18 open set:

- `NONE`

Reason:

- The remaining previously held high-evidence candidates, `SGG_50110` and `SGG_41171`, are now already enabled/opened in batch-17.
- The remaining watchlist candidates found in repo-local docs do not have documented latest board rows, snapshot-date evidence, or dynamic-path/sample evidence.
- This scan does not force two candidates just to fill a batch.

## Recovery Path Summary

After the original HOLD:

- Batch-18 evidence refresh remained HOLD.
- Batch-18 readonly audit remained HOLD for the known stalled target set.
- The stalled wide sweep remained HOLD because a broad `SGG_%` read against `v_koaptix_latest_universe_rank_board_u` timed out.
- The stalled paginated discovery remained HOLD because active SGG-heavy `LIKE 'SGG_XX%'` prefixes still timed out.
- The stalled discovery-path plan identified an existing lighter source: enumerate active sigungu codes from `region_dim`, exclude enabled registry SGGs, then run bounded exact per-code source-of-truth reads.
- The region_dim-seeded read-only discovery found a refreshed READY set without retrying the heavy board sweep.

## Refreshed Candidate Review

READY after the region_dim discovery refresh requires:

1. not currently registry enabled
2. not previously opened
3. latest board row evidence exists
4. snapshot-date evidence exists
5. dynamic-path/sample evidence exists
6. no contradiction from prior HOLD reasoning

| Candidate | Label | Evidence source | Evidence summary | Status |
| --- | --- | --- | --- | --- |
| `SGG_26110` | 부산광역시 중구 | `docs/KOAPTIX_REGION_DIM_SGG_DISCOVERY_2026-04-22.md` | latest board yes; snapshot `2026-04-22`; dynamic sample yes; sample `complex_id=108267`, rank 1, `금호`; absent from enabled registry; no repo-local prior open mention | READY |
| `SGG_26140` | 부산광역시 서구 | `docs/KOAPTIX_REGION_DIM_SGG_DISCOVERY_2026-04-22.md` | latest board yes; snapshot `2026-04-22`; dynamic sample yes; sample `complex_id=110352`, rank 1, `힐스테이트이진베이시티아파트`; absent from enabled registry; no repo-local prior open mention | READY |

## Final Batch-18 Open Recommendation

Final refreshed batch-18 READY open set:

- `SGG_26110` / 부산광역시 중구
- `SGG_26140` / 부산광역시 서구

Recommendation rationale:

- Both candidates are absent from the current enabled registry.
- Neither candidate is documented as previously opened.
- Both have latest board row evidence, snapshot-date evidence, and dynamic sample evidence from bounded exact per-code read-only checks.
- The recommendation remains capped at two SGG candidates.
- The next actual-open turn should expose only this refreshed READY set.

## HOLD / Watchlist

Keep the following as `INSUFFICIENT_EVIDENCE` until repo-local evidence includes latest board rows, snapshot-date evidence, and dynamic-path/sample evidence:

- `SGG_41590`
- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

No candidate was promoted to READY in the original batch-18 scan. The later region_dim-seeded readiness refresh supersedes that original HOLD for the next actual-open decision with `SGG_26110` and `SGG_26140`.

## Current Status

- Batch-18 original readiness scan: complete with HOLD
- Batch-18 docs-only readiness refresh: complete with refreshed READY set
- Actual open performed in this step: no
- Registry/code/API/SQL/source-of-truth/components/scripts/package/env/test/gate/generated changes: none
- Rollback required: no

## Next Recommended Step

Run a separate batch-18 actual-open prompt only for the refreshed READY set:

- `SGG_26110`
- `SGG_26140`

This readiness refresh did not perform the actual open. Do not include the original HOLD/watchlist candidates in the next actual-open step unless a separate future read-only audit produces fresh READY evidence for them.
