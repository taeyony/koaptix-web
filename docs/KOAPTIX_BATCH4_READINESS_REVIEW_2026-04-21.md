# KOAPTIX Batch-4 Readiness Review - 2026-04-21

## Purpose

This document records the batch-4 readiness review after the feature
improvement baseline was fixed. It also records the later open result from
commit `306f3dc`.

This document itself does not open batch-4. It does not change registry
exposure, DB schema, SQL, source of truth, API routes, gate scripts, or UI
components.

## Current Enabled Exposure

Source reviewed: `src/lib/koaptix/universes.ts`.

Enabled macro universes: 16.

- `KOREA_ALL`
- `SEOUL_ALL`
- `BUSAN_ALL`
- `DAEGU_ALL`
- `INCHEON_ALL`
- `GWANGJU_ALL`
- `DAEJEON_ALL`
- `ULSAN_ALL`
- `SEJONG_ALL`
- `GYEONGGI_ALL`
- `CHUNGBUK_ALL`
- `CHUNGNAM_ALL`
- `JEONNAM_ALL`
- `GYEONGBUK_ALL`
- `GYEONGNAM_ALL`
- `JEJU_ALL`

Macro universes intentionally not enabled:

- `GANGWON_ALL`
- `JEONBUK_ALL`

Enabled SGG universes at readiness-review time: 24.

- `SGG_11710`
- `SGG_11650`
- `SGG_11680`
- `SGG_41135`
- `SGG_11440`
- `SGG_11560`
- `SGG_11590`
- `SGG_11500`
- `SGG_11290`
- `SGG_11230`
- `SGG_11740`
- `SGG_11470`
- `SGG_11170`
- `SGG_11410`
- `SGG_11200`
- `SGG_11110`
- `SGG_11140`
- `SGG_11215`
- `SGG_11260`
- `SGG_11305`
- `SGG_11320`
- `SGG_11350`
- `SGG_11380`
- `SGG_11530`

Batch-4 candidate set under review:

- `SGG_11545`
- `SGG_11620`

Batch-4 exposure status at readiness-review time: closed.

Post-open status:

- `306f3dc feat(koaptix): open batch-4 ready sgg exposure` opened exactly
  `SGG_11545` and `SGG_11620`.
- Current enabled SGG count after that commit: 26.
- No macro universe exposure policy changed.

## Readiness Criteria

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

Candidate direct readiness requires:

- `snapshotOk = true`
- `latestBoardOk = true`
- `dynamicBoardOk = true` when the latest snapshot exists

Current enabled exposure readiness requires:

- `/api/rankings` blocking check passes
- bounded-warm `/api/map` operational check passes
- `/api/search` current-universe check passes
- direct snapshot/latest-board misses are advisory only when user-facing
  delivery remains blocking-pass

Release gate order remains:

1. `npm run audit:sgg`
2. `npm run smoke:regional`
3. `npm run smoke:browser`
4. `npm run build`

At readiness-review time, opening batch-4 required a separate explicit registry
patch turn and a full post-open gate. That later open turn is recorded below.

## Candidate Review Table

Latest review command:

```powershell
$env:KOAPTIX_SMOKE_BASE_URL='http://127.0.0.1:3004'; npm run audit:sgg
```

Observed audit timestamp: `2026-04-21T12:55:55.563Z`.

| Candidate | Current exposure | snapshotOk | latestBoardOk | dynamicBoardOk | Audit sample | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| `SGG_11545` | Closed | true | true | true | `complex_id=3455`, `rank_all=1` | Ready for explicit open prompt |
| `SGG_11620` | Closed | true | true | true | `complex_id=3944`, `rank_all=1` | Ready for explicit open prompt |

Enabled SGG audit state from the same run:

- confirmed enabled SGG: 24
- delivery-confirmed enabled SGG: 24
- advisory direct-read misses: none
- blocking failures: none
- candidateReady: `SGG_11545`, `SGG_11620`

## Post-Open Result

Open commit:

- `306f3dc feat(koaptix): open batch-4 ready sgg exposure`

Files changed by the open commit:

- `src/lib/koaptix/universes.ts`

Registry entries opened:

- `SGG_11545`
- `SGG_11620`

Post-open validation reported:

- `npm run build`: PASS
- `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `audit:sgg`: enabled 26, confirmed 26

The readiness review and the open result are aligned: the same two candidates
reviewed as ready were the only candidates exposed.

## Gate And Smoke Implications

Before opening:

- Current enabled SGG baseline is audit-confirmed.
- Candidates are DB/direct-read ready only because they are not registry
  exposed yet.
- `/api/rankings`, `/api/map`, `/api/search`, `/ranking`, regional smoke, and
  browser smoke should not be interpreted as candidate exposure checks until a
  registry patch exposes the candidates.

After the batch-4 open prompt:

- Add only the selected candidate registry entries.
- Run the full `npm run gate:sgg` sequence.
- Treat `/api/rankings`, bounded-warm `/api/map`, and `/api/search` failures as
  blocking.
- Treat direct snapshot/latest-board misses as advisory only if user-facing
  delivery remains blocking-pass after the allowed audit rerun.

## Rollback Scope

If the batch-4 open patch needs rollback, the rollback scope should be exactly:

- `SGG_11545`
- `SGG_11620`

Rollback should be registry-scoped. Code, DB, SQL, source-of-truth, and gate
script rollback should not be needed because the open commit only changed
`src/lib/koaptix/universes.ts`.

Do not rollback batch-1, batch-2, or batch-3 for a batch-4-specific blocking
regression unless evidence shows the regression is unrelated to the new
registry block.

## Final Recommendation

Status: READY at review time; OPENED after commit `306f3dc`.

Reason:

- The review baseline was clean at HEAD `4e2302f`.
- Current enabled SGG exposure remains confirmed by `npm run audit:sgg`.
- The only documented unexposed candidates, `SGG_11545` and `SGG_11620`, both
  satisfy direct snapshot/latest/dynamic readiness.
- Rollback scope is narrow and registry-only.
- The later open commit exposed exactly those two candidates and passed the
  full post-open gate.

The readiness review itself was not the open action. The open action happened
later in commit `306f3dc` and was followed by full gate validation.

## Explicit Do-Not-Open Conditions

Do not expand batch-4 further if any of the following is true:

- tracked worktree is dirty before the open patch
- candidate direct readiness is stale or fails
- the open patch includes code, DB, SQL, API route, gate script, or registry
  policy changes beyond the candidate registry entries
- rollback scope is not explicit
- `npm run gate:sgg` cannot be run immediately after exposure
- the intent is to open additional undocumented candidates

## Next Recommended Step

Keep batch-4 fixed at:

- `SGG_11545`
- `SGG_11620`

For any next SGG exposure, start a new readiness review first. Do not treat
batch-4 as an open-ended block.
