# KOAPTIX Batch-17 Readiness Review - 2026-04-22

## Purpose

This document records the batch-17 SGG readiness scan only.

This step does not perform an actual open, does not modify `src/lib/koaptix/universes.ts`, and does not modify API, SQL, source-of-truth, components, scripts, package, env, test/gate, or generated artifacts.

The service exposure source of truth remains the registry in `src/lib/koaptix/universes.ts`. The data source chain remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `a9054aa`
- Latest relevant commit: `a9054aa docs(koaptix): record batch-16 open verification`
- Batch-16 readiness commit: `8183476 docs(koaptix): add batch-16 readiness review`
- Batch-16 actual open commit: `adfab9f feat(koaptix): open batch-16 ready sgg exposure`
- Batch-16 post-open docs reconciliation commit: `a9054aa docs(koaptix): record batch-16 open verification`
- Batch-16 completed opened SGG:
  - `SGG_26290` / 남구 / order 149
  - `SGG_48123` / 창원시 성산구 / order 150

Batch-17 is the next pending SGG staged-exposure batch.

## Current Registry Status

Whole-file review of `src/lib/koaptix/universes.ts` confirmed:

- Enabled macro universe count: 16
- Enabled SGG count: 50
- Current last enabled SGG order: 150
- Batch-16 registry entries are enabled and ordered as expected:
  - `SGG_26290` / 남구 / order 149
  - `SGG_48123` / 창원시 성산구 / order 150

The next actual open, if approved separately, should use the next consecutive SGG orders after 150.

## Exclusion Basis

Already enabled or already opened SGGs are excluded from batch-17 recommendation. The current registry is the source of truth for enabled state.

Minimum already-opened exclusion set through batch-16:

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

## Whole-File Review Inputs

The following files were reviewed as read-only inputs:

- `src/lib/koaptix/universes.ts`
- `docs/KOAPTIX_BATCH16_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH15_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH14_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH13_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH12_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH11_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH10_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH9_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH8_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`

No build, dev server, smoke, gate, DB, SQL, or runtime mutation command was run for this readiness-only step.

## Candidate Review Method

Candidates were classified using only repo-local evidence and read-only command outputs.

READY requires:

- not currently registry enabled
- not already opened in batch-4 through batch-16
- repo-local documentation evidence for latest board rows
- snapshot-date evidence
- dynamic-path/sample evidence
- no contradiction with prior HOLD or exclusion reasoning

Candidates without direct latest board/snapshot/dynamic evidence remain `INSUFFICIENT_EVIDENCE`.

## Candidate Review

| Candidate | Label | Evidence source | Evidence summary | Status |
| --- | --- | --- | --- | --- |
| `SGG_50110` | 제주시 | batch-13 through batch-16 HOLD tables | latest board rows 78, snapshot `2026-04-21`, dynamic true, sample `complex_id=299339`, rank 1; currently absent from enabled registry and not previously opened | READY |
| `SGG_41171` | 안양시 만안구 | batch-8 and batch-13 through batch-16 HOLD tables | latest board rows 67, snapshot `2026-04-21`, dynamic true, sample `complex_id=195794`, rank 1; currently absent from enabled registry and not previously opened | READY |
| `SGG_26290` | 남구 | registry and batch-16 post-open verification | already opened in batch-16, enabled=true, order 149 | ALREADY_ENABLED_OR_OPENED |
| `SGG_48123` | 창원시 성산구 | registry and batch-16 post-open verification | already opened in batch-16, enabled=true, order 150 | ALREADY_ENABLED_OR_OPENED |
| `SGG_41590` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28115` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28116` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28265` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_28720` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41110` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41130` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41170` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |
| `SGG_41190` | unknown from current registry | prior sampled weak-evidence list | no latest board rows, latest snapshot date, or dynamic sample evidence found in reviewed docs | INSUFFICIENT_EVIDENCE |

## Recommended Batch-17 Open Set

Recommended batch-17 open set:

- `SGG_50110` / 제주시
- `SGG_41171` / 안양시 만안구

Recommendation rationale:

- Both candidates have repeated repo-local readiness evidence from prior batch HOLD tables.
- Both have latest board row evidence, snapshot `2026-04-21`, and dynamic sample evidence.
- Both are absent from the current enabled registry and are not part of the already-opened batch-4 through batch-16 exclusion set.
- The recommendation is capped at two candidates to preserve the staged SGG exposure pattern.

## HOLD / Watchlist

No additional strong HOLD candidate was promoted in this scan after selecting the two READY candidates above.

Keep the following as `INSUFFICIENT_EVIDENCE` until repo-local evidence includes latest board rows, snapshot-date evidence, and dynamic-path/sample evidence:

- `SGG_41590`
- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

## Current Status

- Batch-17 readiness scan: complete
- Actual open performed during the readiness scan step: no
- Registry/code/API/SQL/source-of-truth/components/scripts/package/env/test/gate/generated changes during the readiness scan step: none
- Readiness-scan rollback required: no

## Actual Open Status

Batch-17 actual open was completed in a separate registry-only implementation commit:

- Commit: `5ab0cbd`
- Commit message: `feat(koaptix): open batch-17 ready sgg exposure`

Registry entries opened:

| code | label | order | enabled | homeEnabled | searchEnabled | rankingEnabled | mapEnabled |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `SGG_50110` | 제주시 | 151 | true | true | true | true | true |
| `SGG_41171` | 안양시 만안구 | 152 | true | true | true | true | true |

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Post-Open Result

Open result:

- enabled SGG count after open: 52
- `npm run build`: PASS
- build note: existing `metadataBase` warning only
- home URL checks: PASS
  - `/?universe=SGG_50110`: 200
  - `/?universe=SGG_41171`: 200
- `/ranking` URL checks: PASS
  - `/ranking?universe=SGG_50110`: 200
  - `/ranking?universe=SGG_41171`: 200
- `/api/rankings`: PASS
  - `/api/rankings?universe_code=SGG_50110&limit=20`: 200, count 20, same-universe rows
  - `/api/rankings?universe_code=SGG_41171&limit=20`: 200, count 20, same-universe rows
- `/api/map`: PASS
  - `/api/map?universe_code=SGG_50110&limit=20`: 200
  - `/api/map?universe_code=SGG_41171&limit=20`: 200
- map requested and rendered universe matched the requested SGG
- map `fallback=false`
- map `source=dynamic`
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `failed_command=NONE`
- `failed_universe_or_step=NONE`

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=52`, `confirmed=52`
- home, ranking, manual API checks: PASS
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-17 Open

Batch-17 is open as of commit `5ab0cbd`.

No DB, SQL, source-of-truth, API route, gate script, package, script, component,
or docs change was part of the open commit. The open commit changed only
`src/lib/koaptix/universes.ts`.

This docs reconciliation turn is docs-only. It does not modify registry, code,
API routes, scripts, SQL, source of truth, package files, components, tests,
generated artifacts, or env.

Do not treat batch-17 as an open-ended block. Any additional SGG exposure after
`SGG_50110` and `SGG_41171` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, manual checks, API checks, and the SGG
release gate passed after the registry-only open.

If a later batch-17-specific regression is proven, rollback scope should be
registry-only and exactly the batch-17 block:

- `SGG_50110`
- `SGG_41171`

No DB, SQL, source-of-truth, API route, package, script, component, docs, test,
or generated-artifact rollback should be needed for a batch-17 registry-only
rollback.

No prohibition was violated during the actual open:

- no SGG beyond `SGG_50110` and `SGG_41171` was opened
- no batch-4 through batch-16 SGG was reworked
- no API route was modified
- no DB, SQL, or source-of-truth object was modified
- no docs file was modified by the open commit
- `dev.log`, `tsconfig.tsbuildinfo`, and `next-env.d.ts` were not committed

## Next Recommended Step

Run a separate batch-18 readiness review before any additional SGG exposure.
