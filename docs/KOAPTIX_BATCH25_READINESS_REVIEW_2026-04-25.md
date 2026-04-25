# KOAPTIX Batch-25 Readiness Review - 2026-04-25

Readiness review only. This document identifies the next safe SGG exposure candidates for a later actual-open step; it does not open registry entries and does not modify product, API, SQL, source-of-truth, or harness code.

## Baseline State

- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD before readiness doc: `2940276 docs(koaptix): record batch-24 open verification`
- Batch-24 status: readiness complete, actual open complete, docs reconciliation complete
- Enabled SGG count before batch-25 actual open: `66`
- Last enabled SGG order before batch-25 actual open: `166`
- Registry source reviewed: `src/lib/koaptix/universes.ts`
- Registry modified in this step: no

Recent enabled SGG tail:

| order | code | region |
| ---: | --- | --- |
| 159 | `SGG_26320` | 부산광역시 북구 |
| 160 | `SGG_26380` | 부산광역시 사하구 |
| 161 | `SGG_26440` | 부산광역시 강서구 |
| 162 | `SGG_26470` | 부산광역시 연제구 |
| 163 | `SGG_26500` | 부산광역시 수영구 |
| 164 | `SGG_26530` | 부산광역시 사상구 |
| 165 | `SGG_26710` | 부산광역시 기장군 |
| 166 | `SGG_27110` | 대구광역시 중구 |

Registry review findings:

- SGG entries: `66`
- Enabled SGG entries: `66`
- Disabled/not-yet-enabled registry placeholders: none
- Duplicate SGG codes: none observed
- Duplicate enabled orders: none observed
- Enabled order anomaly: none observed
- `SGG_27140` and `SGG_27170` do not already exist in the registry and remain unopened
- Existing order now continues from Busan into Daegu; batch-25 should continue the Daegu sequence if readiness evidence remains clean

## Candidate Selection Method

Pattern followed: batch-24, batch-23, and batch-22 readiness reviews.

Read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH24_READINESS_REVIEW_2026-04-24.md`
- `docs/KOAPTIX_BATCH23_READINESS_REVIEW_2026-04-24.md`
- `package.json`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`
- Supabase `region_dim` active sigungu rows
- Supabase `latest_snapshot_by_universe` and `latest_ranked_listings` exact per-code reads
- Supabase `ranking_board_dynamic` exact per-code reads

Readiness criteria:

- Candidate is not currently enabled in the registry
- Latest board row exists for the SGG universe
- Snapshot date is current relative to the established batch pattern
- Latest board sample exists and matches the candidate universe
- Dynamic/latest board sample matches the candidate universe
- No KOREA_ALL fallback is used as positive evidence
- No obvious advisory/blocking issue appears from the audit pattern
- Pre-open API delivery is not treated as final PASS evidence because these candidates are not yet exposed; same-universe API, audit, gate, regional smoke, and browser smoke checks must run after actual registry open

Candidate scan summary:

- `region_dim` active sigungu rows: `308`
- Canonical `SGG_<5-digit>` candidates: `308`
- Currently enabled SGGs excluded: `66`
- Non-enabled candidates after registry exclusion: `242`
- First non-enabled ordered candidates reviewed included `SGG_27140`, `SGG_27170`, `SGG_27200`, and `SGG_27710`
- Selection was capped at two READY candidates

## READY Candidates

| intended order | code | region | snapshot date | sample | complex_id | rank_all | latest board | dynamic board | rankings readiness | search readiness | map readiness | fallback status |
| ---: | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 167 | `SGG_27140` | 대구광역시 동구 | `2026-04-24` | 대구이시아폴리스더샵3차 | `133243` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |
| 168 | `SGG_27170` | 대구광역시 서구 | `2026-04-24` | 서대구센트럴자이 | `136403` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |

### `SGG_27140` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_27140`.
- Dynamic board sample matches `SGG_27140`.
- Sample: `대구이시아폴리스더샵3차`
- `complex_id`: `133243`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and regional continuity after `SGG_27110`.

### `SGG_27170` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_27170`.
- Dynamic board sample matches `SGG_27170`.
- Sample: `서대구센트럴자이`
- `complex_id`: `136403`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and regional continuity after `SGG_27140`.

## Rejected / HOLD Candidates Reviewed

| code | region | snapshot date | sample | complex_id | rank_all | readiness signal | reason not selected |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `SGG_27200` | 대구광역시 남구 | `2026-04-24` | 교대역하늘채뉴센트원 | `137321` | 1 | evidence-positive | HOLD due batch cap of two candidates |
| `SGG_27710` | 대구광역시 달성군 | `2026-04-24` | 예미지더센트럴 | `141208` | 1 | evidence-positive | HOLD due batch cap of two candidates |

`SGG_27200` and `SGG_27710` were not rejected for a blocking defect in this review. They remain later-batch watchlist candidates and must be rechecked with current evidence before any future open.

## Final Readiness Verdict

READY - batch-25 has two candidates ready for a later actual open:

1. `SGG_27140` / 대구광역시 동구 / intended future order `167`
2. `SGG_27170` / 대구광역시 서구 / intended future order `168`

## Explicit Next Step

The next step must be a separate batch-25 actual-open task. Only the READY candidates in this document may be opened in that step:

- `SGG_27140`
- `SGG_27170`

The actual-open task must update only `src/lib/koaptix/universes.ts`, then run build, audit, gate, regional smoke, and browser smoke validation. Docs reconciliation must wait until after the actual-open commit exists and passes validation.

## Actual Open Status

Batch-25 actual open was completed in a separate registry-only implementation
commit:

- Commit: `894a7e8`
- Commit message: `feat(koaptix): open batch-25 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_27140` | 동구 | 167 | true | true | true | true | true |
| `SGG_27170` | 서구 | 168 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

`SGG_27200` and `SGG_27710` remain unopened. They are not part of the batch-25
actual open and must not be listed as opened entries.

## Post-Open Result

Open result:

- enabled SGG count after open: 68
- last enabled SGG order after open: 168
- `npm run build`: PASS
- `npm run audit:sgg`: PASS
- `audit:sgg` `blockingFailed=[]`
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `smoke:regional`: PASS through gate, including both new SGGs
- `smoke:browser`: PASS through gate, including both new SGGs
- console and visible errors: none blocking

Target delivery confirmation:

- `SGG_27140`: rankings/search/map/direct readiness PASS
- `SGG_27140` sample: preserved from the readiness section above
- `SGG_27140` map `isFallback=false`
- `SGG_27140` map `fallbackMode=none`
- `SGG_27140` map `source=dynamic`
- `SGG_27170`: rankings/search/map/direct readiness PASS
- `SGG_27170` sample: preserved from the readiness section above
- `SGG_27170` map `isFallback=false`
- `SGG_27170` map `fallbackMode=none`
- `SGG_27170` map `source=dynamic`
- `/api/rankings`: PASS for both targets, 200 with same-universe rows
- `/api/search`: PASS for both targets, 200 with same-universe local results
- `/api/map`: PASS for both targets, 200 with same-universe dynamic map response
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `SGG_27200` remains unopened
- `SGG_27710` remains unopened

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=68`, `confirmed=68`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-25 Open

Batch-25 readiness is complete.
Batch-25 actual open is complete as of commit `894a7e8`.
Batch-25 docs reconciliation is complete after this docs-only commit.

No DB, SQL, source-of-truth, API route, gate script, package, script,
component, or docs change was part of the open commit. The open commit changed
only `src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-25 as an open-ended block. Any additional SGG exposure after
`SGG_27140` and `SGG_27170` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, audit, smoke, and the SGG release gate
passed after the registry-only open.

If a later batch-25-specific regression is proven, rollback scope should be
registry-only and exactly the batch-25 block:

- `SGG_27140`
- `SGG_27170`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-25 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_27140` and `SGG_27170` was opened
- `SGG_27200` was not opened
- `SGG_27710` was not opened
- no batch-4 through batch-24 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit

## Next Recommended Step After Reconciliation

No immediate runtime step is required from this reconciliation turn. Batch-25
post-open verification is now recorded in this readiness document.
