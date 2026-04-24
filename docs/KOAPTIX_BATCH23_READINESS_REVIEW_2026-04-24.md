# KOAPTIX Batch-23 Readiness Review - 2026-04-24

## Purpose

This document records the batch-23 SGG readiness scan only.

This step does not perform an actual open, does not modify
`src/lib/koaptix/universes.ts`, and does not modify product code, API routes,
SQL, source-of-truth, components, scripts, package files, env, test/gate, or
generated artifacts.

The service exposure source of truth remains the registry in
`src/lib/koaptix/universes.ts`. The data source chain used for readiness remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Operating Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `e6e06de`
- Latest relevant commit: `e6e06de docs(koaptix): record batch-22 open verification`
- Batch-22 readiness: complete
- Batch-22 actual open: complete
- Batch-22 docs reconciliation: complete
- Current enabled SGG count baseline: 62
- Current last enabled SGG order baseline: 162
- Batch-23 is the next pending SGG staged-exposure readiness review.

Whole-file review of `src/lib/koaptix/universes.ts` confirmed the latest enabled
SGG entries:

- `SGG_26230` / order 157
- `SGG_26260` / order 158
- `SGG_26320` / order 159
- `SGG_26380` / order 160
- `SGG_26440` / order 161
- `SGG_26470` / order 162

Registry review found:

- SGG registry entries: 62
- enabled SGG entries: 62
- disabled SGG registry entries: none
- duplicate SGG codes: none
- duplicate SGG orders: none
- non-monotonic SGG ordering: none
- current ordering convention continues the Busan `region_dim` sequence.

## Method

- Parsed current enabled SGG registry entries from `src/lib/koaptix/universes.ts`
  and used that parse as the exposure source of truth.
- Used the established lightweight `region_dim` source with
  `region_type = sigungu`, `is_active = true`, ordered by `region_code`, then
  derived canonical `SGG_<5-digit>` codes.
- Excluded all currently enabled registry SGGs.
- Used bounded exact per-code read checks against only each candidate's own
  evidence.
- Did not use a heavy latest-board broad sweep, prefix sweep, or wildcard
  multi-universe latest-board sweep.
- Did not run `gate:sgg` because no registry open was performed.

Pre-open delivery API behavior was observed but not treated as readiness success
because the candidates are intentionally not enabled yet. Current disabled
candidates resolve through the service default path rather than same-universe
delivery. Same-universe `/api/rankings`, `/api/search`, and `/api/map` delivery
must be verified in the later actual-open step after registry exposure.

## Whole-File Review Inputs

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH22_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH21_READINESS_REVIEW_2026-04-22.md`
- `package.json`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`

## Candidate Enumeration Source / Coverage

Read-only discovery output:

- Enumeration source: `region_dim` where `region_type = sigungu` and
  `is_active = true`, ordered by `region_code`
- `region_dim` query duration: 381 ms
- Active sigungu rows enumerated: 308
- Valid canonical `SGG_<5-digit>` candidates: 308
- Current enabled registry SGGs excluded: 62
- Non-enabled candidates after registry exclusion: 246
- Bounded exact-read candidates reviewed: 3
- Stop condition reached: two READY candidates selected after a targeted
  recheck of the first candidate's transient latest-board timeout
- Final reviewed candidate set: `SGG_26500`, `SGG_26530`, `SGG_26710`

The first non-enabled `region_dim` candidates after batch-22 are:

- `SGG_26500` / 부산광역시 수영구
- `SGG_26530` / 부산광역시 사상구
- `SGG_26710` / 부산광역시 기장군
- `SGG_27110` / 대구광역시 중구
- `SGG_27140` / 대구광역시 동구
- `SGG_27170` / 대구광역시 서구
- `SGG_27200` / 대구광역시 남구
- `SGG_27710` / 대구광역시 달성군

`rg` over `docs`, `src`, and `scripts` found `SGG_26500`, `SGG_26530`, and
`SGG_26710` only as unreviewed continuation candidates in prior batch-21 and
batch-22 readiness documents. No registry entry, prior open, or blocking HOLD
record was found for the selected batch-23 READY set.

## Verification Method

For each reviewed candidate, exact per-code reads checked:

- latest snapshot row from `koaptix_rank_snapshot`
- latest board row from `v_koaptix_latest_universe_rank_board_u`
- dynamic sample from `v_koaptix_universe_rank_history_dynamic`

The service delivery APIs were not used as positive readiness evidence because
the candidates remain disabled before actual open. Observed pre-open API
responses resolved to `KOREA_ALL`, so KOREA_ALL fallback/default delivery was
not accepted as a candidate PASS signal.

## Candidate Audit

| SGG code | Region | Currently enabled? | Registry entry exists? | Intended future order | Latest board evidence | Snapshot-date evidence | Dynamic-path/sample evidence | Pre-open API delivery | Verdict |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_26500` | 부산광역시 수영구 | no | no | 163 | yes after targeted recheck: `2026-04-23`, `complex_id=130620`, `rank_all=1`, `apt_name_ko=삼익비치`, read 3641 ms | yes: `2026-04-23`, read 419 ms | yes: `2026-04-23`, `complex_id=130620`, `rank_all=1`, `apt_name_ko=삼익비치`, read 286 ms | not treated as PASS pre-open; disabled registry resolved `/api/rankings` and `/api/map` to `KOREA_ALL` | READY |
| `SGG_26530` | 부산광역시 사상구 | no | no | 164 | yes: `2026-04-23`, `complex_id=130951`, `rank_all=1`, `apt_name_ko=사상중흥에스-클래스그랜드센트럴`, read 2499 ms | yes: `2026-04-23`, read 139 ms | yes: `2026-04-23`, `complex_id=130951`, `rank_all=1`, `apt_name_ko=사상중흥에스-클래스그랜드센트럴`, read 225 ms | not treated as PASS pre-open; disabled registry resolved `/api/rankings` and `/api/map` to `KOREA_ALL` | READY |
| `SGG_26710` | 부산광역시 기장군 | no | no | not selected | yes: `2026-04-23`, `complex_id=132287`, `rank_all=1`, `apt_name_ko=일광자이푸르지오2단지`, read 806 ms | yes: `2026-04-23`, read 93 ms | yes: `2026-04-23`, `complex_id=132287`, `rank_all=1`, `apt_name_ko=일광자이푸르지오2단지`, read 251 ms | not treated as PASS pre-open; disabled registry resolved `/api/rankings` and `/api/map` to `KOREA_ALL` | HOLD: evidence-positive but not selected because batch-23 is capped at two candidates |

Notes:

- `SGG_26500` had one initial latest-board exact-read timeout
  (`canceling statement due to statement timeout`) during the first bounded pass.
  A targeted exact per-code recheck returned the latest-board row cleanly and
  aligned with the snapshot and dynamic sample.
- `SGG_26710` is not rejected for a data blocker. It remains unselected only
  because this batch recommends a maximum of two READY candidates and the first
  two Busan continuation candidates are supportable.

## Recommended Batch-23 Open Set

Batch-23 has a READY set of exactly two candidates:

- `SGG_26500` / 부산광역시 수영구 / intended future order 163
- `SGG_26530` / 부산광역시 사상구 / intended future order 164

Recommendation rationale:

- Both candidates are absent from the current enabled registry.
- Neither candidate has an existing registry entry or prior-open record.
- Both have latest board row evidence, snapshot-date evidence, and dynamic
  sample evidence from bounded exact per-code read-only checks.
- Both continue the Busan `region_dim` order immediately after the batch-22
  openings.
- The recommendation is capped at two SGG candidates to preserve the staged SGG
  exposure pattern.

## HOLD / Watchlist

- `SGG_26710` / 부산광역시 기장군: evidence-positive in the bounded scan, but held
  for a later batch because batch-23 is capped at two READY candidates.
- Later non-enabled `region_dim` candidates remain unreviewed for batch-23 and
  should not be opened without their own exact per-code evidence.

## Final Readiness Verdict

READY — batch-23 has two candidates ready for a later actual open.

## Explicit Non-Action Note

- No actual open was performed.
- No registry file was modified.
- No source, product, API, SQL, source-of-truth, component, script, package,
  env, test/gate, or generated artifact was modified.
- This was a docs-only readiness review.

## Next Recommended Step

Run a separate batch-23 actual-open prompt only for the READY candidates above:

- `SGG_26500`
- `SGG_26530`

The later actual-open step must verify same-universe delivery after registry
exposure, including `/api/rankings`, `/api/search`, `/api/map`, `audit:sgg`,
`smoke:regional`, `smoke:browser`, and `[SGG_RELEASE_GATE_PASS]`.

Do not perform docs reconciliation until after the batch-23 actual-open commit
exists and passes its required gate.

## Actual Open Status

Batch-23 actual open was completed in a separate registry-only implementation
commit:

- Commit: `069973b`
- Commit message: `feat(koaptix): open batch-23 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_26500` | 수영구 | 163 | true | true | true | true | true |
| `SGG_26530` | 사상구 | 164 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

`SGG_26710` remains unopened. It is not part of the batch-23 actual open and
must not be listed as an opened entry.

## Post-Open Result

Open result:

- enabled SGG count after open: 64
- last enabled SGG order after open: 164
- `npm run build`: PASS
- `npm run audit:sgg`: PASS
- `audit:sgg` `blockingFailed=[]`
- `audit:sgg` `advisoryMiss=[]`
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `smoke:regional`: PASS through gate, including both new SGGs
- `smoke:browser`: PASS through gate, including both new SGGs
- console and visible errors: none blocking

Target delivery confirmation:

- `SGG_26500`: rankings/search/map/direct readiness PASS
- `SGG_26500` sample: 삼익비치
- `SGG_26500` map `isFallback=false`
- `SGG_26500` map `fallbackMode=none`
- `SGG_26500` map `source=dynamic`
- `SGG_26530`: rankings/search/map/direct readiness PASS
- `SGG_26530` sample: 사상중흥에스-클래스그랜드센트럴
- `SGG_26530` map `isFallback=false`
- `SGG_26530` map `fallbackMode=none`
- `SGG_26530` map `source=dynamic`
- `/api/rankings`: PASS for both targets, 200 with same-universe rows
- `/api/search`: PASS for both targets, 200 with same-universe local results
- `/api/map`: PASS for both targets, 200 with same-universe dynamic map response
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `SGG_26710` remains unopened

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=64`, `confirmed=64`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-23 Open

Batch-23 readiness is complete.
Batch-23 actual open is complete as of commit `069973b`.
Batch-23 docs reconciliation is complete after this docs-only commit.

No DB, SQL, source-of-truth, API route, gate script, package, script,
component, or docs change was part of the open commit. The open commit changed
only `src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-23 as an open-ended block. Any additional SGG exposure after
`SGG_26500` and `SGG_26530` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, audit, smoke, and the SGG release gate
passed after the registry-only open.

If a later batch-23-specific regression is proven, rollback scope should be
registry-only and exactly the batch-23 block:

- `SGG_26500`
- `SGG_26530`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-23 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_26500` and `SGG_26530` was opened
- `SGG_26710` was not opened
- no batch-4 through batch-22 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit

## Next Recommended Step After Reconciliation

No immediate runtime step is required from this reconciliation turn. Batch-23
post-open verification is now recorded in this readiness document.
