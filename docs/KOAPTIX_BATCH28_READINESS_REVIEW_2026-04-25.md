# KOAPTIX Batch-28 Readiness Review - 2026-04-25

Readiness review only. This document identifies the next safe SGG exposure
candidates for a later actual-open step; it does not open registry entries and
does not modify product, API, SQL, source-of-truth, or harness code.

## Baseline State

- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD before readiness doc: `e5c5e4a docs(koaptix): record batch-27 open verification`
- Batch-27 status: readiness complete, actual open complete, docs reconciliation complete
- Enabled SGG count before batch-28 actual open: `72`
- Last enabled SGG order before batch-28 actual open: `172`
- Registry source reviewed: `src/lib/koaptix/universes.ts`
- Registry modified in this step: no

Recent enabled SGG tail:

| order | code | region |
| ---: | --- | --- |
| 161 | `SGG_26440` | 부산광역시 강서구 |
| 162 | `SGG_26470` | 부산광역시 연제구 |
| 163 | `SGG_26500` | 부산광역시 수영구 |
| 164 | `SGG_26530` | 부산광역시 사상구 |
| 165 | `SGG_26710` | 부산광역시 기장군 |
| 166 | `SGG_27110` | 대구광역시 중구 |
| 167 | `SGG_27140` | 대구광역시 동구 |
| 168 | `SGG_27170` | 대구광역시 서구 |
| 169 | `SGG_27200` | 대구광역시 남구 |
| 170 | `SGG_27710` | 대구광역시 달성군 |
| 171 | `SGG_27720` | 대구광역시 군위군 |
| 172 | `SGG_28110` | 인천광역시 중구 |

Registry review findings:

- SGG entries: `72`
- Enabled SGG entries: `72`
- Disabled/not-yet-enabled registry placeholders: none
- Duplicate SGG codes: none observed
- Duplicate enabled orders: none observed
- Enabled order anomaly: none observed
- `SGG_28115`, `SGG_28116`, `SGG_28140`, and `SGG_28177` do not already exist in the registry and remain unopened
- Existing order has entered Incheon; batch-28 should continue the Incheon `region_dim` sequence while skipping candidates that still lack board evidence

## Candidate Selection Method

Pattern followed: batch-27, batch-26, and batch-25 readiness reviews.

Read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH27_READINESS_REVIEW_2026-04-25.md`
- `docs/KOAPTIX_BATCH26_READINESS_REVIEW_2026-04-25.md`
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
- Currently enabled SGGs excluded: `72`
- Non-enabled candidates after registry exclusion: `236`
- First non-enabled ordered candidates reviewed included `SGG_28115`, `SGG_28116`, `SGG_28140`, `SGG_28177`, `SGG_28200`, `SGG_28237`, `SGG_28245`, and `SGG_28265`
- Selection was capped at two READY candidates

The first non-enabled `region_dim` candidates after batch-27 are:

- `SGG_28115` / 인천광역시 중구영종출장
- `SGG_28116` / 인천광역시 중구용유출장
- `SGG_28140` / 인천광역시 동구
- `SGG_28177` / 인천광역시 미추홀구
- `SGG_28200` / 인천광역시 남동구
- `SGG_28237` / 인천광역시 부평구
- `SGG_28245` / 인천광역시 계양구
- `SGG_28265` / 인천광역시 서구검단출장
- `SGG_28710` / 인천광역시 강화군
- `SGG_28720` / 인천광역시 옹진군
- `SGG_29110` / 광주광역시 동구
- `SGG_29140` / 광주광역시 서구

## READY Candidates

| intended order | code | region | snapshot date | sample | complex_id | rank_all | latest board | dynamic board | rankings readiness | search readiness | map readiness | fallback status |
| ---: | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 173 | `SGG_28140` | 인천광역시 동구 | `2026-04-24` | 동인천역파크푸르지오 | `142653` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |
| 174 | `SGG_28177` | 인천광역시 미추홀구 | `2026-04-24` | 인천SKSkyVIEW | `144536` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |

### `SGG_28140` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_28140`.
- Dynamic board sample matches `SGG_28140`.
- Sample: `동인천역파크푸르지오`
- `complex_id`: `142653`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and Incheon regional continuity after `SGG_28110` while skipping `SGG_28115` and `SGG_28116` due missing board evidence.

### `SGG_28177` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_28177`.
- Dynamic board sample matches `SGG_28177`.
- Sample: `인천SKSkyVIEW`
- `complex_id`: `144536`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and Incheon regional continuity after `SGG_28140`.

## Rejected / HOLD Candidates Reviewed

| code | region | snapshot date | sample | complex_id | rank_all | readiness signal | reason not selected |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `SGG_28115` | 인천광역시 중구영종출장 | none observed | none observed | n/a | n/a | missing latest board evidence | HOLD due missing snapshot/latest/dynamic board signal |
| `SGG_28116` | 인천광역시 중구용유출장 | none observed | none observed | n/a | n/a | missing latest board evidence | HOLD due missing snapshot/latest/dynamic board signal |
| `SGG_28200` | 인천광역시 남동구 | `2026-04-24` | 구월힐스테이트1단지 | `149676` | 1 | evidence-positive | HOLD due batch cap of two candidates |
| `SGG_28237` | 인천광역시 부평구 | `2026-04-24` | 더샵부평센트럴시티 | `157472` | 1 | evidence-positive | HOLD due batch cap of two candidates |
| `SGG_28245` | 인천광역시 계양구 | `2026-04-24` | 계양효성해링턴플레이스 | `161484` | 1 | evidence-positive | HOLD due batch cap of two candidates |
| `SGG_28265` | 인천광역시 서구검단출장 | none observed | none observed | n/a | n/a | missing latest board evidence | HOLD due missing snapshot/latest/dynamic board signal |

`SGG_28200`, `SGG_28237`, and `SGG_28245` were not rejected for a blocking defect in this review. They remain later-batch watchlist candidates and must be rechecked with current evidence before any future open.

## Final Readiness Verdict

READY - batch-28 has two candidates ready for a later actual open:

1. `SGG_28140` / 인천광역시 동구 / intended future order `173`
2. `SGG_28177` / 인천광역시 미추홀구 / intended future order `174`

## Explicit Next Step

The next step must be a separate batch-28 actual-open task. Only the READY candidates in this document may be opened in that step:

- `SGG_28140`
- `SGG_28177`

The actual-open task must update only `src/lib/koaptix/universes.ts`, then run build, audit, gate, regional smoke, and browser smoke validation. Docs reconciliation must wait until after the actual-open commit exists and passes validation.

## Actual Open Status

Batch-28 actual open was completed in a separate registry-only implementation
commit:

- Commit: `2663b7c`
- Commit message: `feat(koaptix): open batch-28 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_28140` | 동구 | 173 | true | true | true | true | true |
| `SGG_28177` | 미추홀구 | 174 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

`SGG_28115`, `SGG_28116`, `SGG_28265`, `SGG_28200`, `SGG_28237`, and
`SGG_28245` remain unopened. They are not part of the batch-28 actual open and
must not be listed as opened entries.

## Post-Open Result

Open result:

- enabled SGG count after open: 74
- last enabled SGG order after open: 174
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

- `SGG_28140`: rankings/search/map/direct readiness PASS
- `SGG_28140` sample: preserved from the readiness section above
- `SGG_28177`: rankings/search/map/direct readiness PASS
- `SGG_28177` sample: preserved from the readiness section above
- `/api/rankings`: PASS for both targets, 200 with same-universe rows
- `/api/search`: PASS for both targets, 200 with same-universe local results
- `/api/map`: PASS for both targets, 200 with same-universe dynamic map response
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `SGG_28115` remains unopened
- `SGG_28116` remains unopened
- `SGG_28265` remains unopened
- `SGG_28200` remains unopened
- `SGG_28237` remains unopened
- `SGG_28245` remains unopened

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=74`, `confirmed=74`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-28 Open

Batch-28 readiness is complete.
Batch-28 actual open is complete as of commit `2663b7c`.
Batch-28 docs reconciliation is complete after this docs-only commit.

No DB, SQL, source-of-truth, API route, gate script, package, script,
component, or docs change was part of the open commit. The open commit changed
only `src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-28 as an open-ended block. Any additional SGG exposure after
`SGG_28140` and `SGG_28177` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, audit, smoke, and the SGG release gate
passed after the registry-only open.

If a later batch-28-specific regression is proven, rollback scope should be
registry-only and exactly the batch-28 block:

- `SGG_28140`
- `SGG_28177`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-28 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_28140` and `SGG_28177` was opened
- `SGG_28115` was not opened
- `SGG_28116` was not opened
- `SGG_28265` was not opened
- `SGG_28200` was not opened
- `SGG_28237` was not opened
- `SGG_28245` was not opened
- no batch-4 through batch-27 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit

## Next Recommended Step After Reconciliation

No immediate runtime step is required from this reconciliation turn. Batch-28
post-open verification is now recorded in this readiness document.
