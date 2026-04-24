# KOAPTIX Batch-22 Readiness Review - 2026-04-22

## Purpose

This document records the batch-22 SGG readiness scan only.

This step does not perform an actual open, does not modify `src/lib/koaptix/universes.ts`, and does not modify API, SQL, source-of-truth, components, scripts, package, env, test/gate, or generated artifacts.

The service exposure source of truth remains the registry in `src/lib/koaptix/universes.ts`. The data source chain remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Operating Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `1fc2aae`
- Latest relevant commit: `1fc2aae docs(koaptix): record batch-21 open verification`
- Batch-14 through batch-21: complete
- Current enabled SGG count baseline: 60
- Current last enabled SGG order baseline: 160
- Batch-21 is fully complete and this step is batch-22 readiness only.

Whole-file review of `src/lib/koaptix/universes.ts` confirmed the latest enabled SGG entries:

- `SGG_26200` / order 156
- `SGG_26230` / order 157
- `SGG_26260` / order 158
- `SGG_26320` / order 159
- `SGG_26380` / order 160

## Method

- Parsed current enabled SGG registry entries from `src/lib/koaptix/universes.ts` and used that parse as the exposure source of truth.
- Used the established lightweight `region_dim` source with `region_type = sigungu`, ordered by `region_code`, then derived canonical `SGG_<5-digit>` codes.
- Built the exclusion set from all currently enabled registry SGGs plus the minimum previously opened batch-4 through batch-21 set.
- Used bounded exact per-code read checks against only each candidate's own evidence.
- Did not use a heavy latest-board broad sweep, prefix sweep, or wildcard multi-universe latest-board sweep.

## Exclusion Basis

Already enabled or already opened SGGs are excluded from batch-22 recommendation. Membership in `region_dim` alone was not treated as readiness evidence.

Minimum already-opened exclusion set through batch-21:

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
- batch-21: `SGG_26320`, `SGG_26380`

## Whole-File Review Inputs

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH21_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH20_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH19_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH18_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH17_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH16_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH15_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH14_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_REGION_DIM_SGG_DISCOVERY_2026-04-22.md`

The existing readiness naming convention is `docs/KOAPTIX_BATCH<N>_READINESS_REVIEW_2026-04-22.md`, so this batch-22 document follows the established pattern.

## Candidate Enumeration Source / Coverage

Read-only discovery output:

- Enumeration source: `region_dim` where `region_type = sigungu`, ordered by `region_code`
- Active sigungu rows enumerated: 308
- Valid canonical `SGG_<5-digit>` candidates: 308
- Current enabled registry SGGs excluded: 60
- Minimum opened history set count: 36
- Non-enabled / non-opened candidates after exclusion: 248
- Bounded verification chunk size: 10
- Maximum bounded coverage: 80 candidates
- Stop condition reached: stopped after 2 READY candidates
- Candidates actually checked in the bounded pass: 2
- Final exact-read verification duration: 5356 ms
- Timeouts in final verification: none
- Read errors in final verification: none

The first non-excluded `region_dim` candidates were:

- `SGG_26440` / 부산광역시 강서구
- `SGG_26470` / 부산광역시 연제구
- `SGG_26500` / 부산광역시 수영구
- `SGG_26530` / 부산광역시 사상구
- `SGG_26710` / 부산광역시 기장군

`rg` over `docs`, `src`, and `scripts` found the first five batch-22 candidate codes only as the unreviewed continuation list recorded in the batch-21 readiness doc. No prior HOLD reasoning was found that contradicts opening `SGG_26440` or `SGG_26470`.

## Verification Method

For each non-excluded candidate in the bounded pass, exact per-code reads checked:

- latest snapshot row from `koaptix_rank_snapshot`
- latest board row from `v_koaptix_latest_universe_rank_board_u`
- dynamic sample from `v_koaptix_universe_rank_history_dynamic`

The bounded pass stopped after `SGG_26440` and `SGG_26470` both met the READY evidence standard.

## Candidate Audit

| SGG code | Region | Currently enabled? | Previously opened? | Latest board evidence | Snapshot-date evidence | Dynamic-path/sample evidence | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SGG_26440` | 부산광역시 강서구 | no | no | yes: `2026-04-23`, `complex_id=126744`, `rank_all=1`, `apt_name_ko=더힐시그니처`, read 3959 ms | yes: `2026-04-23`, read 298 ms | yes: `2026-04-23`, `complex_id=126744`, `rank_all=1`, read 229 ms | READY |
| `SGG_26470` | 부산광역시 연제구 | no | no | yes: `2026-04-23`, `complex_id=128423`, `rank_all=1`, `apt_name_ko=더샵파크시티`, read 583 ms | yes: `2026-04-23`, read 76 ms | yes: `2026-04-23`, `complex_id=128423`, `rank_all=1`, read 211 ms | READY |

## Recommended Batch-22 Open Set

Batch-22 has a READY set of exactly two candidates:

- `SGG_26440` / 부산광역시 강서구
- `SGG_26470` / 부산광역시 연제구

Recommendation rationale:

- Both candidates are absent from the current enabled registry.
- Neither candidate is documented as previously opened in batch-4 through batch-21.
- Both have latest board row evidence, snapshot-date evidence, and dynamic sample evidence from bounded exact per-code read-only checks.
- The recommendation is capped at two SGG candidates to preserve the staged SGG exposure pattern.

## HOLD / Watchlist

No additional candidate was evaluated after the two READY candidates were confirmed in the bounded pass. Later non-excluded `region_dim` candidates remain unreviewed for batch-22 and should not be opened without their own exact per-code evidence.

## Explicit Non-Action Note

- No actual open was performed.
- No registry file was modified.
- No code, API, SQL, source-of-truth, component, script, package, env, test/gate, or generated artifact was modified.
- This was a docs-only readiness review.

## Next Recommended Step

Run a separate batch-22 actual-open prompt only for the READY candidates above:

- `SGG_26440`
- `SGG_26470`

This readiness scan did not perform the actual open. Do not include any additional batch-22 candidate in the next actual-open step unless a separate future read-only audit produces fresh READY evidence.

## Actual Open Status

Batch-22 actual open was completed in a separate registry-only implementation commit:

- Commit: `2b91165`
- Commit message: `feat(koaptix): open batch-22 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_26440` | 강서구 | 161 | true | true | true | true | true |
| `SGG_26470` | 연제구 | 162 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Post-Open Result

Open result:

- enabled SGG count after open: 62
- last enabled SGG order after open: 162
- `npm run build`: PASS
- `npm run audit:sgg`: PASS
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `smoke:regional`: PASS through gate, including both new SGGs
- `smoke:browser`: PASS through gate, including both new SGGs
- console and visible errors: none blocking

Target delivery confirmation:

- `SGG_26440`: rankings/search/map/direct readiness PASS
- `SGG_26440` sample: 더힐시그니처
- `SGG_26470`: rankings/search/map/direct readiness PASS
- `SGG_26470` sample: 더샵파크시티
- `/api/rankings`: PASS for both targets, 200 with same-universe rows
- `/api/search`: PASS for both targets, 200 with same-universe local results
- `/api/map`: PASS for both targets, 200 with same-universe dynamic map response
- map `isFallback=false`
- map `fallbackMode=none`
- map `source=dynamic`
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=62`, `confirmed=62`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-22 Open

Batch-22 readiness is complete.
Batch-22 actual open is complete as of commit `2b91165`.
Batch-22 docs reconciliation is complete after this docs-only commit.

No DB, SQL, source-of-truth, API route, gate script, package, script,
component, or docs change was part of the open commit. The open commit changed
only `src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-22 as an open-ended block. Any additional SGG exposure after
`SGG_26440` and `SGG_26470` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, audit, smoke, and the SGG release gate
passed after the registry-only open.

If a later batch-22-specific regression is proven, rollback scope should be
registry-only and exactly the batch-22 block:

- `SGG_26440`
- `SGG_26470`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-22 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_26440` and `SGG_26470` was opened
- no batch-4 through batch-21 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit
- `dev.log`, `tsconfig.tsbuildinfo`, and `next-env.d.ts` were not committed

## Next Recommended Step After Reconciliation

No immediate runtime step is required from this reconciliation turn. Batch-22
post-open verification is now recorded in this readiness document.
