# KOAPTIX Batch-21 Readiness Review - 2026-04-22

## Purpose

This document records the batch-21 SGG readiness scan only.

This step does not perform an actual open, does not modify `src/lib/koaptix/universes.ts`, and does not modify API, SQL, source-of-truth, components, scripts, package, env, test/gate, or generated artifacts.

The service exposure source of truth remains the registry in `src/lib/koaptix/universes.ts`. The data source chain remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Operating Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `72e8ad9`
- Latest relevant commit: `72e8ad9 docs(koaptix): record batch-20 open verification`
- Batch-20 readiness: completed
- Batch-20 actual open: completed
- Batch-20 post-open docs reconciliation: completed
- Current enabled SGG count baseline: 58
- Current last enabled SGG order baseline: 158
- Batch-21 is the next pending SGG staged-exposure batch.

Whole-file review of `src/lib/koaptix/universes.ts` confirmed the latest enabled SGG entries:

- `SGG_26140` / 서구 / order 154
- `SGG_26170` / 동구 / order 155
- `SGG_26200` / 영도구 / order 156
- `SGG_26230` / 부산진구 / order 157
- `SGG_26260` / 동래구 / order 158

## Method

- Parsed current enabled SGG registry entries from `src/lib/koaptix/universes.ts` and used that parse as the exposure source of truth.
- Used the established lightweight `region_dim` source with `region_type = sigungu`, ordered by `region_code`, then derived canonical `SGG_<5-digit>` codes.
- Excluded all currently enabled registry SGGs and the minimum previously opened batch-4 through batch-20 set.
- Used bounded exact per-code read checks against only each candidate's own evidence.
- Did not use a heavy latest-board broad sweep, prefix sweep, or wildcard multi-universe latest-board sweep.

## Exclusion Basis

Already enabled or already opened SGGs are excluded from batch-21 recommendation. Membership in `region_dim` alone was not treated as readiness evidence.

Minimum already-opened exclusion set through batch-20:

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
- batch-19: `SGG_26170`, `SGG_26200`
- batch-20: `SGG_26230`, `SGG_26260`

## Whole-File Review Inputs

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH20_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH19_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH18_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH17_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH16_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH15_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH14_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_REGION_DIM_SGG_DISCOVERY_2026-04-22.md`

The existing readiness naming convention is `docs/KOAPTIX_BATCH<N>_READINESS_REVIEW_2026-04-22.md`, so this batch-21 document follows the established pattern.

## Candidate Enumeration Source / Coverage

Read-only discovery output:

- Enumeration source: `region_dim` where `region_type = sigungu`, ordered by `region_code`
- `region_dim` query duration: 746 ms
- Active sigungu rows enumerated: 308
- Valid canonical `SGG_<5-digit>` candidates: 308
- Current enabled registry SGGs excluded: 58
- Minimum opened history set count: 34
- Non-enabled / non-opened candidates after exclusion: 250
- Bounded verification chunk size: 10
- Maximum bounded coverage: 80 candidates
- Stop condition reached: stopped after 2 READY candidates
- Candidates actually checked: 2
- Final exact-read verification duration: 6507 ms
- Timeouts in final verification: none
- Read errors in final verification: none

The first non-excluded `region_dim` candidates were:

- `SGG_26320` / 부산광역시 북구
- `SGG_26380` / 부산광역시 사하구
- `SGG_26440` / 부산광역시 강서구
- `SGG_26470` / 부산광역시 연제구
- `SGG_26500` / 부산광역시 수영구
- `SGG_26530` / 부산광역시 사상구
- `SGG_26710` / 부산광역시 기장군

`rg` over `src/lib/koaptix/universes.ts`, `docs`, and `scripts` found no existing references to `SGG_26320` or `SGG_26380`.

## Verification Method

For each non-excluded candidate, bounded exact per-code reads checked:

- latest board row from `v_koaptix_latest_universe_rank_board_u`
- snapshot-date evidence from `koaptix_rank_snapshot`
- dynamic sample from `v_koaptix_universe_rank_history_dynamic`

The scan stopped after `SGG_26320` and `SGG_26380` both met the READY evidence standard.

## Candidate Audit

| SGG code | Region | Currently enabled? | Previously opened? | Latest board evidence | Snapshot-date evidence | Dynamic-path/sample evidence | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SGG_26320` | 부산광역시 북구 | no | no | yes: `2026-04-22`, `complex_id=118930`, `rank_all=1`, `apt_name_ko=화명롯데캐슬카이저` | yes: `2026-04-22` | yes: `2026-04-22`, `complex_id=118930`, `rank_all=1` | READY |
| `SGG_26380` | 부산광역시 사하구 | no | no | yes: `2026-04-22`, `complex_id=124145`, `rank_all=1`, `apt_name_ko=다대동롯데캐슬몰운대` | yes: `2026-04-22` | yes: `2026-04-22`, `complex_id=124145`, `rank_all=1` | READY |

No prior HOLD reasoning was found that contradicts opening either candidate; both were absent from the current enabled registry and from the prior-opened exclusion set.

## Recommended Batch-21 Open Set

Batch-21 has a refreshed READY set of exactly two candidates:

- `SGG_26320` / 부산광역시 북구
- `SGG_26380` / 부산광역시 사하구

The next step should be a batch-21 actual-open prompt for only the two READY candidates above.

## HOLD / Watchlist

No additional candidate was evaluated after the two READY candidates were confirmed. Later non-excluded `region_dim` candidates remain unreviewed for batch-21 and should not be opened without their own exact per-code evidence.

## Explicit Non-Action Note

- No actual open was performed.
- No registry file was modified.
- No code, API, SQL, source-of-truth, component, script, package, env, test/gate, or generated artifact was modified.
- This was a docs-only readiness review.
