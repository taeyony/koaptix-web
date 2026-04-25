# KOAPTIX Batch-30 Readiness Review - 2026-04-25

## Purpose

This document records the batch-30 SGG readiness review only.

- No registry entries are opened in this commit.
- No source, script, API, SQL, or source-of-truth files are modified.
- Actual open must be performed in a separate follow-up step after this readiness review is accepted.

## Baseline State

- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD before readiness doc: `f89f44b docs(koaptix): record batch-29 open verification`
- Batch-29 status: readiness complete, actual open complete, docs reconciliation complete
- Enabled SGG count before batch-30 actual open: `76`
- Last enabled SGG order before batch-30 actual open: `176`
- Registry modified in this readiness step: no

Current enabled SGG tail:

| Order | Code | Region |
| ---: | --- | --- |
| 165 | `SGG_26710` | 부산광역시 기장군 |
| 166 | `SGG_27110` | 대구광역시 중구 |
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

Registry review findings:

- Current enabled SGG codes: `SGG_11710`, `SGG_11650`, `SGG_11680`, `SGG_41135`, `SGG_11440`, `SGG_11560`, `SGG_11590`, `SGG_11500`, `SGG_11290`, `SGG_11230`, `SGG_11740`, `SGG_11470`, `SGG_11170`, `SGG_11410`, `SGG_11200`, `SGG_11110`, `SGG_11140`, `SGG_11215`, `SGG_11260`, `SGG_11305`, `SGG_11320`, `SGG_11350`, `SGG_11380`, `SGG_11530`, `SGG_11545`, `SGG_11620`, `SGG_41360`, `SGG_48250`, `SGG_41465`, `SGG_41220`, `SGG_41463`, `SGG_29170`, `SGG_28260`, `SGG_27290`, `SGG_31140`, `SGG_27260`, `SGG_41150`, `SGG_41390`, `SGG_44133`, `SGG_29200`, `SGG_27230`, `SGG_26350`, `SGG_28185`, `SGG_48330`, `SGG_41173`, `SGG_48170`, `SGG_48310`, `SGG_26410`, `SGG_26290`, `SGG_48123`, `SGG_50110`, `SGG_41171`, `SGG_26110`, `SGG_26140`, `SGG_26170`, `SGG_26200`, `SGG_26230`, `SGG_26260`, `SGG_26320`, `SGG_26380`, `SGG_26440`, `SGG_26470`, `SGG_26500`, `SGG_26530`, `SGG_26710`, `SGG_27110`, `SGG_27140`, `SGG_27170`, `SGG_27200`, `SGG_27710`, `SGG_27720`, `SGG_28110`, `SGG_28140`, `SGG_28177`, `SGG_28200`, `SGG_28237`.
- Disabled or not-yet-enabled placeholders in the registry: none.
- `SGG_28115`, `SGG_28116`, `SGG_28265`, and `SGG_28245` are not present in the registry and remain unopened.
- Duplicate SGG code check: none found.
- Duplicate enabled order check: none found.
- Existing registry order suggests continuing in Incheon, skipping canonical entries that still lack board evidence, before moving to the next region.

## Candidate Selection Method

The scan followed the same readiness-review pattern used in batch-29, batch-28, and batch-27:

- Read `src/lib/koaptix/universes.ts` in full for enabled count, last order, enabled codes, duplicates, and ordering convention.
- Read `docs/KOAPTIX_BATCH29_READINESS_REVIEW_2026-04-25.md` and `docs/KOAPTIX_BATCH28_READINESS_REVIEW_2026-04-25.md` for the prior readiness-doc style and evidence pattern.
- Reviewed `package.json`, `scripts/audit-sgg-readiness.mjs`, and `scripts/sgg-release-gate.ps1` as read-only references.
- Queried existing Supabase views read-only for active SGG candidates, latest board rows, and dynamic/latest-board evidence.
- Applied the batch cap of at most two READY candidates.

Readiness criteria used:

- Target is not currently enabled in the registry.
- Latest board row exists for the SGG universe.
- Snapshot date is current and consistent with recent batch evidence.
- Latest board sample exists and matches the expected universe.
- Dynamic/latest board evidence matches the same universe and sample.
- No KOREA_ALL fallback is used as evidence for direct delivery readiness.
- `/api/rankings`, `/api/search`, `/api/map`, smoke, and release-gate delivery readiness remain required during the later actual-open step.

Scan summary:

- Active SGG rows in `region_dim`: `308`
- Canonical SGG candidates after audit exclusions: `308`
- Currently enabled SGGs excluded: `76`
- Non-enabled canonical candidates remaining: `232`
- First non-enabled candidates reviewed by canonical order: `SGG_28115`, `SGG_28116`, `SGG_28245`, `SGG_28265`, `SGG_28710`, `SGG_28720`, `SGG_29110`, `SGG_29140`, `SGG_29155`, `SGG_30110`

## READY Candidates

| Future order | Code | Region | Latest snapshot | Latest board sample | complex_id | rank_all | Direct/latest board | Dynamic board | API delivery | Fallback status |
| ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| 177 | `SGG_28245` | 인천광역시 계양구 | `2026-04-24` | 계양효성해링턴플레이스 | `161484` | `1` | PASS | PASS | post-open gate required | no KOREA_ALL fallback used as evidence |
| 178 | `SGG_28710` | 인천광역시 강화군 | `2026-04-24` | 강화서희스타힐스1단지 | `167649` | `1` | PASS | PASS | post-open gate required | no KOREA_ALL fallback used as evidence |

### `SGG_28245` / 인천광역시 계양구

- Intended future order: `177`
- Registry status: not currently enabled; no existing disabled placeholder found.
- Latest board evidence: `2026-04-24`, `계양효성해링턴플레이스`, `complex_id=161484`, `rank_all=1`.
- Dynamic board evidence matches `SGG_28245` and the same sample.
- Rankings/search/map readiness: must be confirmed by the actual-open gate after the registry entry is opened.
- Reason READY: clean current latest-board and dynamic-board evidence, expected universe match, no fallback evidence, and strongest Incheon continuity after batch-29.

### `SGG_28710` / 인천광역시 강화군

- Intended future order: `178`
- Registry status: not currently enabled; no existing disabled placeholder found.
- Latest board evidence: `2026-04-24`, `강화서희스타힐스1단지`, `complex_id=167649`, `rank_all=1`.
- Dynamic board evidence matches `SGG_28710` and the same sample.
- Rankings/search/map readiness: must be confirmed by the actual-open gate after the registry entry is opened.
- Reason READY: clean current latest-board and dynamic-board evidence, expected universe match, no fallback evidence, and continues Incheon after missing-evidence canonical entries are skipped.

## Rejected / HOLD Candidates Reviewed

| Code | Region | Status | Reason |
| --- | --- | --- | --- |
| `SGG_28115` | 인천광역시 중구영종출장 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_28116` | 인천광역시 중구용유출장 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_28265` | 인천광역시 서구검단출장 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_28720` | 인천광역시 옹진군 | HOLD | Missing latest board row, snapshot date, sample, and dynamic board evidence. |
| `SGG_29110` | 광주광역시 동구 | HOLD / later watchlist | Evidence-positive with `2026-04-24` sample `그랜드센트럴`, `complex_id=167864`, `rank_all=1`, but not selected because batch-30 is capped at two and Incheon continuity takes priority. |
| `SGG_29140` | 광주광역시 서구 | HOLD / later watchlist | Evidence-positive with `2026-04-24` sample `더샵염주센트럴파크`, `complex_id=168428`, `rank_all=1`, but not selected because batch-30 is capped at two and Incheon continuity takes priority. |

The evidence-positive HOLD / later-watchlist candidates above must be rechecked in a future readiness scan before any actual open.

## Final Readiness Verdict

READY - batch-30 has two candidates ready for actual open:

1. `SGG_28245` / 인천광역시 계양구 / intended order `177`
2. `SGG_28710` / 인천광역시 강화군 / intended order `178`

## Explicit Next Step

- Actual open must be a separate commit and must modify only `src/lib/koaptix/universes.ts`.
- Only the READY candidates in this document may be opened in the batch-30 actual-open step.
- The actual-open step must assign orders `177` and `178` and enable `enabled`, `homeEnabled`, `searchEnabled`, `rankingEnabled`, and `mapEnabled` for both selected SGGs.
- Build, audit, gate, smoke:regional, and smoke:browser validation must pass after the actual registry open.
- Docs reconciliation must not occur until after the actual-open commit exists and passes validation.

## Actual Open Status

Batch-30 actual open was completed in a separate registry-only implementation
commit:

- Commit: `8c4e53f`
- Commit message: `feat(koaptix): open batch-30 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_28245` | 계양구 | 177 | true | true | true | true | true |
| `SGG_28710` | 강화군 | 178 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

`SGG_28115`, `SGG_28116`, `SGG_28265`, `SGG_28720`, `SGG_29110`, and
`SGG_29140` remain unopened. They are not part of the batch-30 actual open and
must not be listed as opened entries.

## Post-Open Result

Open result:

- enabled SGG count after open: 78
- last enabled SGG order after open: 178
- `npm run build`: PASS
- `npm run audit:sgg`: PASS after local server started on `127.0.0.1:3004`
- audit note: first standalone audit attempt failed with `ECONNREFUSED` because no local server was running
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `smoke:regional`: PASS through gate, including both new SGGs
- `smoke:browser`: PASS through gate, including both new SGGs
- console and visible errors: none blocking

Target delivery confirmation:

- `SGG_28245`: rankings/search/map/direct readiness PASS
- `SGG_28245` sample: `계양효성해링턴플레이스`
- `SGG_28245` map: `isFallback=false`, `fallbackMode=none`, `source=dynamic`
- `SGG_28710`: rankings/search/map/direct readiness PASS
- `SGG_28710` sample: `강화서희스타힐스1단지`
- `SGG_28710` map: `isFallback=false`, `fallbackMode=none`, `source=dynamic`
- `/api/rankings`: PASS for both targets, 200 with same-universe rows
- `/api/search`: PASS for both targets, 200 with same-universe local results
- `/api/map`: PASS for both targets, 200 with same-universe dynamic map response
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `SGG_28115` remains unopened
- `SGG_28116` remains unopened
- `SGG_28265` remains unopened
- `SGG_28720` remains unopened
- `SGG_29110` remains unopened
- `SGG_29140` remains unopened

Gate breakdown from the post-open run:

- `audit:sgg`: PASS after local server startup, `enabled=78`, `confirmed=78`
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-30 Open

Batch-30 readiness is complete.
Batch-30 actual open is complete as of commit `8c4e53f`.
Batch-30 docs reconciliation is complete after this docs-only commit.

No DB, SQL, source-of-truth, API route, gate script, package, script,
component, or docs change was part of the open commit. The open commit changed
only `src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-30 as an open-ended block. Any additional SGG exposure after
`SGG_28245` and `SGG_28710` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, audit, smoke, and the SGG release gate
passed after the registry-only open.

If a later batch-30-specific regression is proven, rollback scope should be
registry-only and exactly the batch-30 block:

- `SGG_28245`
- `SGG_28710`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-30 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_28245` and `SGG_28710` was opened
- `SGG_28115` was not opened
- `SGG_28116` was not opened
- `SGG_28265` was not opened
- `SGG_28720` was not opened
- `SGG_29110` was not opened
- `SGG_29140` was not opened
- no batch-4 through batch-29 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit

## Next Recommended Step After Reconciliation

No immediate runtime step is required from this reconciliation turn. Batch-30
post-open verification is now recorded in this readiness document.
