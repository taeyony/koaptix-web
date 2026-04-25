# KOAPTIX Batch-27 Readiness Review - 2026-04-25

Readiness review only. This document identifies the next safe SGG exposure
candidates for a later actual-open step; it does not open registry entries and
does not modify product, API, SQL, source-of-truth, or harness code.

## Baseline State

- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD before readiness doc: `149b889 docs(koaptix): record batch-26 open verification`
- Batch-26 status: readiness complete, actual open complete, docs reconciliation complete
- Enabled SGG count before batch-27 actual open: `70`
- Last enabled SGG order before batch-27 actual open: `170`
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
| 169 | `SGG_27200` | 대구광역시 남구 |
| 170 | `SGG_27710` | 대구광역시 달성군 |

Registry review findings:

- SGG entries: `70`
- Enabled SGG entries: `70`
- Disabled/not-yet-enabled registry placeholders: none
- Duplicate SGG codes: none observed
- Duplicate enabled orders: none observed
- Enabled order anomaly: none observed
- `SGG_27720` and `SGG_28110` do not already exist in the registry and remain unopened
- Existing order finishes the current Daegu sequence and then proceeds into Incheon by `region_dim` order

## Candidate Selection Method

Pattern followed: batch-26, batch-25, and batch-24 readiness reviews.

Read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH26_READINESS_REVIEW_2026-04-25.md`
- `docs/KOAPTIX_BATCH25_READINESS_REVIEW_2026-04-25.md`
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
- Currently enabled SGGs excluded: `70`
- Non-enabled candidates after registry exclusion: `238`
- First non-enabled ordered candidates reviewed included `SGG_27720`, `SGG_28110`, `SGG_28115`, `SGG_28116`, `SGG_28140`, and `SGG_28177`
- Selection was capped at two READY candidates

The first non-enabled `region_dim` candidates after batch-26 are:

- `SGG_27720` / 대구광역시 군위군
- `SGG_28110` / 인천광역시 중구
- `SGG_28115` / 인천광역시 중구영종출장
- `SGG_28116` / 인천광역시 중구용유출장
- `SGG_28140` / 인천광역시 동구
- `SGG_28177` / 인천광역시 미추홀구
- `SGG_28200` / 인천광역시 남동구
- `SGG_28237` / 인천광역시 부평구
- `SGG_28245` / 인천광역시 계양구
- `SGG_28265` / 인천광역시 서구검단출장

## READY Candidates

| intended order | code | region | snapshot date | sample | complex_id | rank_all | latest board | dynamic board | rankings readiness | search readiness | map readiness | fallback status |
| ---: | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 171 | `SGG_27720` | 대구광역시 군위군 | `2026-04-24` | 부국아파트名家 | `141399` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |
| 172 | `SGG_28110` | 인천광역시 중구 | `2026-04-24` | 영종하늘도시한라비발디 | `142133` | 1 | PASS | PASS | post-open gate required | post-open gate required | post-open gate required | no KOREA_ALL fallback used as evidence |

### `SGG_27720` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_27720`.
- Dynamic board sample matches `SGG_27720`.
- Sample: `부국아파트名家`
- `complex_id`: `141399`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and regional continuity after `SGG_27710`.

### `SGG_28110` Readiness Notes

- Registry target is not currently enabled and has no existing registry entry.
- Latest snapshot exists for `2026-04-24`.
- Latest ranked listing sample matches `SGG_28110`.
- Dynamic board sample matches `SGG_28110`.
- Sample: `영종하늘도시한라비발디`
- `complex_id`: `142133`
- `rank_all`: `1`
- Reason READY: strong direct/latest board and dynamic board evidence, current snapshot date, and clean transition from Daegu into the next Incheon candidate by canonical `region_dim` order.

## Rejected / HOLD Candidates Reviewed

| code | region | snapshot date | sample | complex_id | rank_all | readiness signal | reason not selected |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `SGG_28115` | 인천광역시 중구영종출장 | none observed | none observed | n/a | n/a | missing latest board evidence | HOLD due missing snapshot/latest/dynamic board signal |
| `SGG_28116` | 인천광역시 중구용유출장 | none observed | none observed | n/a | n/a | missing latest board evidence | HOLD due missing snapshot/latest/dynamic board signal |
| `SGG_28140` | 인천광역시 동구 | `2026-04-24` | 동인천역파크푸르지오 | `142653` | 1 | evidence-positive | HOLD due batch cap of two candidates |
| `SGG_28177` | 인천광역시 미추홀구 | `2026-04-24` | 인천SKSkyVIEW | `144536` | 1 | evidence-positive | HOLD due batch cap of two candidates |

`SGG_28140` and `SGG_28177` were not rejected for a blocking defect in this review. They remain later-batch watchlist candidates and must be rechecked with current evidence before any future open.

## Final Readiness Verdict

READY - batch-27 has two candidates ready for a later actual open:

1. `SGG_27720` / 대구광역시 군위군 / intended future order `171`
2. `SGG_28110` / 인천광역시 중구 / intended future order `172`

## Explicit Next Step

The next step must be a separate batch-27 actual-open task. Only the READY candidates in this document may be opened in that step:

- `SGG_27720`
- `SGG_28110`

The actual-open task must update only `src/lib/koaptix/universes.ts`, then run build, audit, gate, regional smoke, and browser smoke validation. Docs reconciliation must wait until after the actual-open commit exists and passes validation.
