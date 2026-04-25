# KOAPTIX Batch-26 Readiness Review - 2026-04-25

Readiness review only. This document identifies the next safe SGG exposure
candidates for a later actual-open step; it does not open registry entries and
does not modify product, API, SQL, source-of-truth, or harness code.

## Baseline State

- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD before readiness doc: `8ca3875 docs(koaptix): record batch-25 open verification`
- Batch-25 status: readiness complete, actual open complete, docs reconciliation complete
- Enabled SGG count before batch-26 actual open: `68`
- Last enabled SGG order before batch-26 actual open: `168`
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
| 167 | `SGG_27140` | 대구광역시 동구 |
| 168 | `SGG_27170` | 대구광역시 서구 |

Registry review findings:

- SGG entries: `68`
- Enabled SGG entries: `68`
- Disabled/not-yet-enabled registry placeholders: none
- Duplicate SGG codes: none observed
- Duplicate enabled orders: none observed
- Enabled order anomaly: none observed
- `SGG_27200` and `SGG_27710` do not already exist in the registry and remain unopened
- Existing order continues the Daegu `region_dim` sequence; batch-26 should continue Daegu if readiness evidence remains clean

## Candidate Selection Method

Pattern followed: batch-25, batch-24, and batch-23 readiness reviews.

Read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH25_READINESS_REVIEW_2026-04-25.md`
- `docs/KOAPTIX_BATCH24_READINESS_REVIEW_2026-04-24.md`
- `package.json`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`
- Supabase `region_dim` active sigungu rows
- Supabase `koaptix_rank_snapshot` exact per-code reads
- Supabase `v_koaptix_latest_universe_rank_board_u` exact per-code reads
- Supabase `v_koaptix_universe_rank_history_dynamic` exact per-code reads

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
- Currently enabled SGGs excluded: `68`
- Non-enabled candidates after registry exclusion: `240`
- First non-enabled ordered candidates reviewed included `SGG_27200`, `SGG_27710`, `SGG_27720`, and `SGG_28110`
- Selection was capped at two READY candidates

The first non-enabled `region_dim` candidates after batch-25 are:

- `SGG_27200` / 대구광역시 남구
- `SGG_27710` / 대구광역시 달성군
- `SGG_27720` / 대구광역시 군위군
- `SGG_28110` / 인천광역시 중구
- `SGG_28115` / 인천광역시 중구영종출장
- `SGG_28116` / 인천광역시 중구용유출장
- `SGG_28140` / 인천광역시 동구
- `SGG_28177` / 인천광역시 미추홀구

## READY Candidates

| intended order | code | region | snapshot date | sample | complex_id | rank_all | latest board | dynamic board | rankings readiness | search readiness | map readiness | fallback status |
| ---: | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 169 | `SGG_27200` | 대구광역시 남구 | `2026-04-24` | 교대역하늘채뉴센트원 | `137321` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |
| 170 | `SGG_27710` | 대구광역시 달성군 | `2026-04-24` | 예미지더센트럴 | `141208` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |

### `SGG_27200` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_27200`.
- Dynamic board sample matches `SGG_27200`.
- Sample: `교대역하늘채뉴센트원`
- `complex_id`: `137321`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and regional continuity after `SGG_27170`.

### `SGG_27710` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_27710`.
- Dynamic board sample matches `SGG_27710`.
- Sample: `예미지더센트럴`
- `complex_id`: `141208`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and regional continuity after `SGG_27200`.

## Rejected / HOLD Candidates Reviewed

| code | region | snapshot date | sample | complex_id | rank_all | readiness signal | reason not selected |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `SGG_27720` | 대구광역시 군위군 | `2026-04-24` | 부국아파트名家 | `141399` | 1 | evidence-positive | HOLD due batch cap of two candidates |
| `SGG_28110` | 인천광역시 중구 | `2026-04-24` | 영종하늘도시한라비발디 | `142133` | 1 | evidence-positive | HOLD due batch cap of two candidates |

`SGG_27720` and `SGG_28110` were not rejected for a blocking defect in this review. They remain later-batch watchlist candidates and must be rechecked with current evidence before any future open.

## Final Readiness Verdict

READY - batch-26 has two candidates ready for a later actual open:

1. `SGG_27200` / 대구광역시 남구 / intended future order `169`
2. `SGG_27710` / 대구광역시 달성군 / intended future order `170`

## Explicit Next Step

The next step must be a separate batch-26 actual-open task. Only the READY candidates in this document may be opened in that step:

- `SGG_27200`
- `SGG_27710`

The actual-open task must update only `src/lib/koaptix/universes.ts`, then run build, audit, gate, regional smoke, and browser smoke validation. Docs reconciliation must wait until after the actual-open commit exists and passes validation.

## Actual Open Status

Batch-26 actual open was completed in a separate registry-only implementation
commit:

- Commit: `916548c`
- Commit message: `feat(koaptix): open batch-26 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_27200` | 남구 | 169 | true | true | true | true | true |
| `SGG_27710` | 달성군 | 170 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

`SGG_27720` and `SGG_28110` remain unopened. They are not part of the batch-26
actual open and must not be listed as opened entries.

## Post-Open Result

Open result:

- enabled SGG count after open: 70
- last enabled SGG order after open: 170
- `npm run build`: PASS
- `npm run audit:sgg`: PASS
- `audit:sgg` `blockingFailed=[]`
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `smoke:regional`: PASS through gate, including both new SGGs
- `smoke:browser`: PASS through gate, including both new SGGs
- console and visible errors: none blocking

Target delivery confirmation:

- `SGG_27200`: rankings/search/map/direct readiness PASS
- `SGG_27200` sample: preserved from the readiness section above
- `SGG_27200` map `isFallback=false`
- `SGG_27200` map `fallbackMode=none`
- `SGG_27200` map `source=dynamic`
- `SGG_27710`: rankings/search/map/direct readiness PASS
- `SGG_27710` sample: preserved from the readiness section above
- `SGG_27710` map `isFallback=false`
- `SGG_27710` map `fallbackMode=none`
- `SGG_27710` map `source=dynamic`
- `/api/rankings`: PASS for both targets, 200 with same-universe rows
- `/api/search`: PASS for both targets, 200 with same-universe local results
- `/api/map`: PASS for both targets, 200 with same-universe dynamic map response
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `SGG_27720` remains unopened
- `SGG_28110` remains unopened

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=70`, `confirmed=70`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-26 Open

Batch-26 readiness is complete.
Batch-26 actual open is complete as of commit `916548c`.
Batch-26 docs reconciliation is complete after this docs-only commit.

No DB, SQL, source-of-truth, API route, gate script, package, script,
component, or docs change was part of the open commit. The open commit changed
only `src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-26 as an open-ended block. Any additional SGG exposure after
`SGG_27200` and `SGG_27710` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, audit, smoke, and the SGG release gate
passed after the registry-only open.

If a later batch-26-specific regression is proven, rollback scope should be
registry-only and exactly the batch-26 block:

- `SGG_27200`
- `SGG_27710`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-26 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_27200` and `SGG_27710` was opened
- `SGG_27720` was not opened
- `SGG_28110` was not opened
- no batch-4 through batch-25 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit

## Next Recommended Step After Reconciliation

No immediate runtime step is required from this reconciliation turn. Batch-26
post-open verification is now recorded in this readiness document.
