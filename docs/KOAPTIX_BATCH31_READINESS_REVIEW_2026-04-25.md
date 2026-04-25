# KOAPTIX Batch-31 Readiness Review - 2026-04-25

## Purpose

This document records the batch-31 SGG readiness review only.

- No registry entries are opened in this commit.
- No source, script, API, SQL, or source-of-truth files are modified.
- Actual open must be performed in a separate follow-up step after this readiness review is accepted.

## Baseline State

- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD before readiness doc: `9696433 docs(koaptix): record batch-30 open verification`
- Batch-30 status: readiness complete, actual open complete, docs reconciliation complete
- Enabled SGG count before batch-31 actual open: `78`
- Last enabled SGG order before batch-31 actual open: `178`
- Registry source reviewed: `src/lib/koaptix/universes.ts`
- Registry modified in this step: no

Current enabled SGG tail:

| Order | Code | Region |
| ---: | --- | --- |
| 167 | `SGG_27140` | 대구광역시 동구 |
| 168 | `SGG_27170` | 대구광역시 서구 |
| 169 | `SGG_27200` | 대구광역시 남구 |
| 170 | `SGG_27710` | 대구광역시 달성군 |
| 171 | `SGG_27720` | 대구광역시 군위군 |
| 172 | `SGG_28110` | 인천광역시 중구 |
| 173 | `SGG_28140` | 인천광역시 동구 |
| 174 | `SGG_28177` | 인천광역시 미추홀구 |
| 175 | `SGG_28200` | 인천광역시 남동구 |
| 176 | `SGG_28237` | 인천광역시 부평구 |
| 177 | `SGG_28245` | 인천광역시 계양구 |
| 178 | `SGG_28710` | 인천광역시 강화군 |

Registry review findings:

- Current enabled SGG count: `78`
- Current last enabled SGG order: `178`
- Disabled or not-yet-enabled placeholders in the registry: none
- Duplicate SGG code check: none found
- Duplicate enabled order check: none found
- `SGG_28115`, `SGG_28116`, `SGG_28265`, `SGG_28720`, `SGG_29110`, and `SGG_29140` are not present in the registry and remain unopened
- Existing registry order should move to Gwangju for batch-31 because the remaining reviewed Incheon candidates still lack board evidence

Current enabled SGG codes:

`SGG_11710`, `SGG_11650`, `SGG_11680`, `SGG_41135`, `SGG_11440`, `SGG_11560`, `SGG_11590`, `SGG_11500`, `SGG_11290`, `SGG_11230`, `SGG_11740`, `SGG_11470`, `SGG_11170`, `SGG_11410`, `SGG_11200`, `SGG_11110`, `SGG_11140`, `SGG_11215`, `SGG_11260`, `SGG_11305`, `SGG_11320`, `SGG_11350`, `SGG_11380`, `SGG_11530`, `SGG_11545`, `SGG_11620`, `SGG_41360`, `SGG_48250`, `SGG_41465`, `SGG_41220`, `SGG_41463`, `SGG_29170`, `SGG_28260`, `SGG_27290`, `SGG_31140`, `SGG_27260`, `SGG_41150`, `SGG_41390`, `SGG_44133`, `SGG_29200`, `SGG_27230`, `SGG_26350`, `SGG_28185`, `SGG_48330`, `SGG_41173`, `SGG_48170`, `SGG_48310`, `SGG_26410`, `SGG_26290`, `SGG_48123`, `SGG_50110`, `SGG_41171`, `SGG_26110`, `SGG_26140`, `SGG_26170`, `SGG_26200`, `SGG_26230`, `SGG_26260`, `SGG_26320`, `SGG_26380`, `SGG_26440`, `SGG_26470`, `SGG_26500`, `SGG_26530`, `SGG_26710`, `SGG_27110`, `SGG_27140`, `SGG_27170`, `SGG_27200`, `SGG_27710`, `SGG_27720`, `SGG_28110`, `SGG_28140`, `SGG_28177`, `SGG_28200`, `SGG_28237`, `SGG_28245`, `SGG_28710`

## Candidate Selection Method

The scan followed the same readiness-review pattern used in batch-30, batch-29, and batch-28.

Read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH30_READINESS_REVIEW_2026-04-25.md`
- `docs/KOAPTIX_BATCH29_READINESS_REVIEW_2026-04-25.md`
- `package.json`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`
- Supabase `region_dim` active `sigungu` rows
- Supabase `koaptix_rank_snapshot` exact per-code reads
- Supabase `v_koaptix_latest_universe_rank_board_u` exact per-code reads
- Supabase `v_koaptix_universe_rank_history_dynamic` exact per-code reads

Readiness criteria used:

- Candidate is not currently enabled in the registry.
- Latest board row exists for the SGG universe.
- Snapshot date is current relative to the established batch pattern.
- Latest board sample exists and matches the candidate universe.
- Dynamic/latest board sample matches the candidate universe.
- No KOREA_ALL fallback is used as positive evidence.
- No obvious advisory/blocking issue appears from the audit pattern.
- Pre-open API delivery is not treated as final PASS evidence because these candidates are not yet exposed; same-universe API, audit, gate, regional smoke, and browser smoke checks must run after actual registry open.

Scan summary:

- Active SGG rows in `region_dim`: `308`
- Canonical `SGG_<5-digit>` candidates: `308`
- Currently enabled SGGs excluded: `78`
- Non-enabled candidates after registry exclusion: `230`
- First non-enabled ordered candidates reviewed included `SGG_28115`, `SGG_28116`, `SGG_28265`, `SGG_28720`, `SGG_29110`, `SGG_29140`, `SGG_29155`, `SGG_30110`, `SGG_30140`, `SGG_30170`, `SGG_30200`, `SGG_30230`, `SGG_31110`, and `SGG_31170`
- Selection was capped at two READY candidates

## READY Candidates

| Future order | Code | Region | Latest snapshot | Latest board sample | complex_id | rank_all | Direct/latest board | Dynamic board | API delivery | Fallback status |
| ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| 179 | `SGG_29110` | 광주광역시 동구 | `2026-04-24` | 그랜드센트럴 | `167864` | `1` | PASS | PASS | post-open gate required | no KOREA_ALL fallback used as evidence |
| 180 | `SGG_29140` | 광주광역시 서구 | `2026-04-24` | 더샵염주센트럴파크 | `168428` | `1` | PASS | PASS | post-open gate required | no KOREA_ALL fallback used as evidence |

### `SGG_29110` / 광주광역시 동구

- Intended future order: `179`
- Registry status: not currently enabled; no existing disabled placeholder found.
- Latest board evidence: `2026-04-24`, `그랜드센트럴`, `complex_id=167864`, `rank_all=1`.
- Dynamic board evidence matches `SGG_29110` and the same sample.
- Rankings/search/map readiness: must be confirmed by the actual-open gate after the registry entry is opened.
- Reason READY: clean current latest-board and dynamic-board evidence, expected universe match, no fallback evidence, and appropriate move to Gwangju after remaining reviewed Incheon candidates still lack board evidence.

### `SGG_29140` / 광주광역시 서구

- Intended future order: `180`
- Registry status: not currently enabled; no existing disabled placeholder found.
- Latest board evidence: `2026-04-24`, `더샵염주센트럴파크`, `complex_id=168428`, `rank_all=1`.
- Dynamic board evidence matches `SGG_29140` and the same sample.
- Rankings/search/map readiness: must be confirmed by the actual-open gate after the registry entry is opened.
- Reason READY: clean current latest-board and dynamic-board evidence, expected universe match, no fallback evidence, and Gwangju regional continuity after `SGG_29110`.

## Rejected / HOLD Candidates Reviewed

| Code | Region | Status | Reason |
| --- | --- | --- | --- |
| `SGG_28115` | 인천광역시 중구영종출장 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_28116` | 인천광역시 중구용유출장 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_28265` | 인천광역시 서구검단출장 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_28720` | 인천광역시 옹진군 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_29155` | 광주광역시 남구 | HOLD / later watchlist | Evidence-positive with `2026-04-24` sample `포스코더샵`, `complex_id=168923`, `rank_all=1`, but not selected because batch-31 is capped at two candidates. |
| `SGG_30110` | 대전광역시 동구 | HOLD / later watchlist | Evidence-positive with `2026-04-24` sample `e편한세상대전에코포레`, `complex_id=170429`, `rank_all=1`, but not selected because batch-31 is capped at two candidates and Gwangju continuity takes priority. |
| `SGG_30140` | 대전광역시 중구 | HOLD / later watchlist | Evidence-positive with `2026-04-24` sample `삼성`, `complex_id=171789`, `rank_all=1`, but not selected because batch-31 is capped at two candidates and Gwangju continuity takes priority. |

The evidence-positive HOLD / later-watchlist candidates above must be rechecked in a future readiness scan before any actual open.

## Final Readiness Verdict

READY - batch-31 has two candidates ready for actual open:

1. `SGG_29110` / 광주광역시 동구 / intended order `179`
2. `SGG_29140` / 광주광역시 서구 / intended order `180`

## Explicit Next Step

- Actual open must be a separate commit and must modify only `src/lib/koaptix/universes.ts`.
- Only the READY candidates in this document may be opened in the batch-31 actual-open step.
- The actual-open step must assign orders `179` and `180` and enable `enabled`, `homeEnabled`, `searchEnabled`, `rankingEnabled`, and `mapEnabled` for both selected SGGs.
- Build, audit, gate, smoke:regional, and smoke:browser validation must pass after the actual registry open.
- Docs reconciliation must not occur until after the actual-open commit exists and passes validation.
