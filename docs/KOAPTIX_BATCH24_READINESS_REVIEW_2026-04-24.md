# KOAPTIX Batch-24 Readiness Review - 2026-04-24

## Purpose

This document records the batch-24 SGG readiness scan only.

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
- HEAD checked: `c683563`
- Latest relevant commit: `c683563 docs(koaptix): record batch-23 open verification`
- Batch-23 readiness: complete
- Batch-23 actual open: complete
- Batch-23 docs reconciliation: complete
- Current enabled SGG count baseline: 64
- Current last enabled SGG order baseline: 164
- Batch-24 is the next pending SGG staged-exposure readiness review.

Whole-file review of `src/lib/koaptix/universes.ts` confirmed the latest enabled
SGG entries:

- `SGG_26230` / order 157
- `SGG_26260` / order 158
- `SGG_26320` / order 159
- `SGG_26380` / order 160
- `SGG_26440` / order 161
- `SGG_26470` / order 162
- `SGG_26500` / order 163
- `SGG_26530` / order 164

Registry review found:

- SGG registry entries: 64
- enabled SGG entries: 64
- disabled SGG registry entries: none
- duplicate SGG codes: none
- duplicate SGG orders: none
- non-monotonic SGG ordering: none
- `SGG_26710` registry entry: none
- `SGG_26710` enabled status: not enabled / still unopened
- current ordering convention continues the `region_dim` sequence after the
  batch-23 Busan openings.

## Method

- Parsed current enabled SGG registry entries from `src/lib/koaptix/universes.ts`
  and used that parse as the exposure source of truth.
- Used the established lightweight `region_dim` source with
  `region_type = sigungu`, `is_active = true`, ordered by `region_code`, then
  derived canonical `SGG_<5-digit>` codes.
- Excluded all currently enabled registry SGGs.
- Re-reviewed `SGG_26710` because it was evidence-positive but not selected in
  batch-23 and remains absent from the enabled registry.
- Used bounded exact per-code read checks against only each candidate's own
  evidence.
- Did not use a heavy latest-board broad sweep, prefix sweep, or wildcard
  multi-universe latest-board sweep.
- Did not run `gate:sgg` because no registry open was performed.

Pre-open delivery API behavior was not used as positive readiness evidence
because the candidates are intentionally not enabled yet. Same-universe
`/api/rankings`, `/api/search`, and `/api/map` delivery must be verified in the
later actual-open step after registry exposure.

## Whole-File Review Inputs

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH23_READINESS_REVIEW_2026-04-24.md`
- `docs/KOAPTIX_BATCH22_READINESS_REVIEW_2026-04-22.md`
- `package.json`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`

## Candidate Enumeration Source / Coverage

Read-only discovery output:

- Enumeration source: `region_dim` where `region_type = sigungu` and
  `is_active = true`, ordered by `region_code`
- `region_dim` query duration: 1079 ms
- Active sigungu rows enumerated: 308
- Valid canonical `SGG_<5-digit>` candidates: 308
- Current enabled registry SGGs excluded: 64
- Non-enabled candidates after registry exclusion: 244
- Bounded exact-read candidates reviewed: 4
- Stop condition reached: two READY candidates selected from the first ordered
  non-enabled candidates
- Final reviewed candidate set: `SGG_26710`, `SGG_27110`, `SGG_27140`,
  `SGG_27170`

The first non-enabled `region_dim` candidates after batch-23 are:

- `SGG_26710` / 부산광역시 기장군
- `SGG_27110` / 대구광역시 중구
- `SGG_27140` / 대구광역시 동구
- `SGG_27170` / 대구광역시 서구
- `SGG_27200` / 대구광역시 남구
- `SGG_27710` / 대구광역시 달성군
- `SGG_27720` / 대구광역시 군위군
- `SGG_28110` / 인천광역시 중구

`SGG_26710` was carried forward from the batch-23 watchlist. It was not opened
in batch-23 and has no registry entry in the current source-of-truth registry.

## Verification Method

For each reviewed candidate, exact per-code reads checked:

- latest snapshot row from `koaptix_rank_snapshot`
- latest board row from `v_koaptix_latest_universe_rank_board_u`
- dynamic sample from `v_koaptix_universe_rank_history_dynamic`

The service delivery APIs were not used as positive readiness evidence because
the candidates remain disabled before actual open. Same-universe delivery is an
actual-open requirement after registry exposure.

## Candidate Audit

| SGG code | Region | Currently enabled? | Registry entry exists? | Intended future order | Latest board evidence | Snapshot-date evidence | Dynamic-path/sample evidence | Pre-open API delivery | Verdict |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_26710` | 부산광역시 기장군 | no | no | 165 | yes: `2026-04-24`, `complex_id=132287`, `rank_all=1`, `apt_name_ko=일광자이푸르지오2단지`, read 4767 ms | yes: `2026-04-24`, read 152 ms | yes: `2026-04-24`, `complex_id=132287`, `rank_all=1`, `apt_name_ko=일광자이푸르지오2단지`, read 227 ms | not treated as PASS pre-open; same-universe delivery must be verified after registry exposure | READY |
| `SGG_27110` | 대구광역시 중구 | no | no | 166 | yes: `2026-04-24`, `complex_id=132563`, `rank_all=1`, `apt_name_ko=남산자이하늘채`, read 2055 ms | yes: `2026-04-24`, read 63 ms | yes: `2026-04-24`, `complex_id=132563`, `rank_all=1`, `apt_name_ko=남산자이하늘채`, read 95 ms | not treated as PASS pre-open; same-universe delivery must be verified after registry exposure | READY |
| `SGG_27140` | 대구광역시 동구 | no | no | not selected | yes: `2026-04-24`, `complex_id=133243`, `rank_all=1`, `apt_name_ko=대구이시아폴리스더샵3차`, read 375 ms | yes: `2026-04-24`, read 62 ms | yes: `2026-04-24`, `complex_id=133243`, `rank_all=1`, `apt_name_ko=대구이시아폴리스더샵3차`, read 96 ms | not treated as PASS pre-open; same-universe delivery must be verified after registry exposure | HOLD: evidence-positive but not selected because batch-24 is capped at two candidates |
| `SGG_27170` | 대구광역시 서구 | no | no | not selected | yes: `2026-04-24`, `complex_id=136403`, `rank_all=1`, `apt_name_ko=서대구센트럴자이`, read 449 ms | yes: `2026-04-24`, read 67 ms | yes: `2026-04-24`, `complex_id=136403`, `rank_all=1`, `apt_name_ko=서대구센트럴자이`, read 107 ms | not treated as PASS pre-open; same-universe delivery must be verified after registry exposure | HOLD: evidence-positive but not selected because batch-24 is capped at two candidates |

Notes:

- `SGG_26710` remains evidence-positive on the current scan and is now selected
  because it is the first ordered non-enabled candidate after batch-23.
- `SGG_27110` begins the next ordered `region_dim` area after Busan and has
  clean current snapshot, latest-board, and dynamic-path evidence.
- `SGG_27140` and `SGG_27170` are not rejected for data blockers. They remain
  unselected only because this batch recommends a maximum of two READY
  candidates.

## Recommended Batch-24 Open Set

Batch-24 has a READY set of exactly two candidates:

- `SGG_26710` / 부산광역시 기장군 / intended future order 165
- `SGG_27110` / 대구광역시 중구 / intended future order 166

Recommendation rationale:

- Both candidates are absent from the current enabled registry.
- Neither candidate has an existing registry entry or prior-open record.
- Both have latest board row evidence, snapshot-date evidence, and dynamic
  sample evidence from bounded exact per-code read-only checks.
- `SGG_26710` closes the Busan continuation after batch-23.
- `SGG_27110` is the next ordered non-enabled `region_dim` candidate after
  Busan.
- The recommendation is capped at two SGG candidates to preserve the staged SGG
  exposure pattern.

## HOLD / Watchlist

- `SGG_27140` / 대구광역시 동구: evidence-positive in the bounded scan, but held
  for a later batch because batch-24 is capped at two READY candidates.
- `SGG_27170` / 대구광역시 서구: evidence-positive in the bounded scan, but held
  for a later batch because batch-24 is capped at two READY candidates.
- Later non-enabled `region_dim` candidates remain unreviewed for batch-24 and
  should not be opened without their own exact per-code evidence.

## Final Readiness Verdict

READY - batch-24 has two candidates ready for a later actual open.

## Explicit Non-Action Note

- No actual open was performed.
- No registry file was modified.
- No source, product, API, SQL, source-of-truth, component, script, package,
  env, test/gate, or generated artifact was modified.
- This was a docs-only readiness review.

## Next Recommended Step

Run a separate batch-24 actual-open prompt only for the READY candidates above:

- `SGG_26710`
- `SGG_27110`

The later actual-open step must verify same-universe delivery after registry
exposure, including `/api/rankings`, `/api/search`, `/api/map`, `audit:sgg`,
`smoke:regional`, `smoke:browser`, and `[SGG_RELEASE_GATE_PASS]`.

Do not perform docs reconciliation until after the batch-24 actual-open commit
exists and passes its required gate.

## Actual Open Status

Batch-24 actual open was completed in a separate registry-only implementation
commit:

- Commit: `6669228`
- Commit message: `feat(koaptix): open batch-24 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_26710` | 기장군 | 165 | true | true | true | true | true |
| `SGG_27110` | 중구 | 166 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

`SGG_27140` and `SGG_27170` remain unopened. They are not part of the batch-24
actual open and must not be listed as opened entries.

## Post-Open Result

Open result:

- enabled SGG count after open: 66
- last enabled SGG order after open: 166
- `npm run build`: PASS
- `npm run audit:sgg`: PASS
- `audit:sgg` `blockingFailed=[]`
- first standalone `audit:sgg` run had advisory-only latest-board misses on
  pre-existing SGGs
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `smoke:regional`: PASS through gate, including both new SGGs
- `smoke:browser`: PASS through gate, including both new SGGs
- console and visible errors: none blocking

Target delivery confirmation:

- `SGG_26710`: rankings/search/map/direct readiness PASS
- `SGG_26710` sample: 일광자이푸르지오2단지
- `SGG_26710` map `isFallback=false`
- `SGG_26710` map `fallbackMode=none`
- `SGG_26710` map `source=dynamic`
- `SGG_27110`: rankings/search/map/direct readiness PASS
- `SGG_27110` sample: 남산자이하늘채
- `SGG_27110` map `isFallback=false`
- `SGG_27110` map `fallbackMode=none`
- `SGG_27110` map `source=dynamic`
- `/api/rankings`: PASS for both targets, 200 with same-universe rows
- `/api/search`: PASS for both targets, 200 with same-universe local results
- `/api/map`: PASS for both targets, 200 with same-universe dynamic map response
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `SGG_27140` remains unopened
- `SGG_27170` remains unopened

Gate breakdown from the post-open run:

- `audit:sgg`: PASS after allowed rerun, `enabled=66`, `confirmed=66`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-24 Open

Batch-24 readiness is complete.
Batch-24 actual open is complete as of commit `6669228`.
Batch-24 docs reconciliation is complete after this docs-only commit.

No DB, SQL, source-of-truth, API route, gate script, package, script,
component, or docs change was part of the open commit. The open commit changed
only `src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-24 as an open-ended block. Any additional SGG exposure after
`SGG_26710` and `SGG_27110` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, audit, smoke, and the SGG release gate
passed after the registry-only open.

If a later batch-24-specific regression is proven, rollback scope should be
registry-only and exactly the batch-24 block:

- `SGG_26710`
- `SGG_27110`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-24 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_26710` and `SGG_27110` was opened
- `SGG_27140` was not opened
- `SGG_27170` was not opened
- no batch-4 through batch-23 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit

## Next Recommended Step After Reconciliation

No immediate runtime step is required from this reconciliation turn. Batch-24
post-open verification is now recorded in this readiness document.
