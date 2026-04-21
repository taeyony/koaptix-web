# KOAPTIX Feature Improvement Handoff - 2026-04-21

## Purpose

This document records the feature-improvement baseline after the SGG gate
stabilization series. It is a handoff for work after the six committed feature
steps, before any batch-4 readiness review.

This document does not authorize code changes, DB changes, SQL changes,
registry expansion, or batch-4 exposure.

## Absolute Baseline

The universe board source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

Product boundaries remain:

- Home is the lightweight tactical board.
- `/ranking` is the full board / operations room.
- `/api/rankings` is the home tactical board endpoint.
- `/api/ranking` is the TOP1000 full-board endpoint.
- Search is current-universe-first.
- Global search results are auxiliary only.
- Chart, map, selector, and board surfaces must preserve clear universe
  identity.
- Service exposure remains registry-managed.
- SGG exposure is additive only.
- Batch-4 remains closed until an explicit readiness review.

## Fixed Feature Commits

| Step | Commit | Message |
| --- | --- | --- |
| 1 | `339b4b3` | `feat(koaptix): add ranking full board route` |
| 2 | `506c070` | `feat(koaptix): add current-universe-first search flow` |
| 3 | `c80fa09` | `feat(koaptix): clarify chart universe identity` |
| 4 | `ed733ad` | `feat(koaptix): clarify neon map universe identity` |
| 5 | `8471987` | `feat(koaptix): improve universe selector ux` |
| 6 | `7db8304` | `feat(koaptix): polish tactical board delivery states` |

## Step Summaries

### Step 1 - `/ranking` Full Board Route

- Added `/ranking` as the full board / operations room entry.
- Added `/api/ranking` as the TOP1000 full-board endpoint.
- Preserved home as lightweight tactical delivery.
- Kept canonical `universe_code` request identity.
- Kept `tier`, `q`, `complexId`, and `universe` URL state separate from the
  home tactical route.

### Step 2 - Current-Universe-First Search

- Aligned `/api/search` to return current-universe local results first.
- Kept global auxiliary results allowed, bounded, and secondary.
- Added explicit result ordering with local results before global results.
- Connected Command Palette search intent to `/ranking?universe=...&q=...`.
- Did not revive global-only fallback as a success condition.

### Step 3 - Chart Universe Identity

- Clarified MarketChartCard requested/rendered universe identity.
- Added chart identity surface for scope and same-universe state.
- Preserved the existing chart source path.
- Kept sparse regional history as same-universe History Building / empty
  history behavior rather than silent KOREA_ALL substitution.

### Step 4 - NeonMap Universe Identity

- Added map delivery metadata for requested universe, rendered universe,
  fallback mode, cache state, item count, and source.
- Added NeonMap data surfaces for map identity and fallback diagnostics.
- Clarified requested versus rendered map scope in the UI.
- Preserved the existing tactical map delivery path.

### Step 5 - UniverseSelector UX

- Improved registry-backed universe finding without changing registry policy.
- Added current universe kind, macro/SGG scope, enabled count, and finder scope
  surfaces.
- Added SGG-to-parent-macro return affordance.
- Added recent universe quick access in the finder.
- Kept search over enabled universes only.
- Did not open new SGG exposure.

### Step 6 - Home Tactical Board Delivery States

- Added stale-while-syncing behavior for uncached universe transitions.
- Kept the previous tactical board visible until fresh data arrives.
- Added board delivery state data surfaces:
  - `data-board-delivery-state`
  - `data-board-stale-universe-code`
- Added a degraded/stale banner for the syncing state.
- Did not change `/api/rankings` contract or home board depth.

## Current Worktree Notes

At the time of this handoff, expected non-feature worktree leftovers are:

- `dev.log`
- `tsconfig.tsbuildinfo`

They are generated/log artifacts and should stay out of feature or docs
commits unless a separate explicit cleanup policy is provided.

## Do Not Cross

- Do not change DB schema.
- Do not change SQL functions.
- Do not change the snapshot chain.
- Do not rollback source of truth to legacy/direct sources.
- Do not merge `/api/rankings` and `/api/ranking`.
- Do not make home behave like TOP1000/full board.
- Do not change registry exposure during feature polish.
- Do not open batch-4 from a feature or docs task.
- Do not weaken gate, smoke, or browser identity assertions.

## Next Recommended Step

The next step should be batch-4 readiness review, not batch-4 exposure.

Recommended readiness review scope:

- Confirm current `npm run gate:sgg` baseline before any registry edit.
- Review candidateReady SGG entries against direct-read and user-facing
  delivery checks.
- Classify direct-read misses as advisory versus blocking using the existing
  gate policy.
- Prepare rollback scope before any staged registry patch.
- Keep batch-4 as a separate explicit decision after readiness is documented.

## Related Documents

- `docs/KOAPTIX_HOME_DELIVERY_HANDOFF.md`
- `docs/KOAPTIX_TESTHOOK_HANDOFF.md`
- `docs/KOAPTIX_REGIONAL_IDENTITY_SMOKE_TEST.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`
- `docs/koaptix/03_OPERATIONS_AND_PROHIBITIONS.md`
