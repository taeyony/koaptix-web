# KOAPTIX Home Delivery Handoff

## Fixed Principles

- Do not reopen the KOREA_ALL engine.
- Multi-universe expansion remains additive only.
- The canonical service contract is `universe_code`.
- The universe board source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

- Home delivery issues should be solved in the delivery layer, not by source of
  truth rollback.

## Current Home Delivery Baseline

- Home remains a lightweight tactical board.
- `RankingBoardClient -> /api/rankings` handles home tactical board delivery.
- `CommandPalette -> /api/search` keeps current-universe search identity.
- `NeonMap -> /api/map` keeps universe-aware map identity.
- `/ranking -> /api/ranking` owns TOP1000 full-board delivery.

## Timeout And Delivery Stabilization

Current stabilization assets:

- bounded tactical board limits
- route-level no-store responses for fresh identity delivery
- same-universe cache/stale handling
- regional dynamic fallback where appropriate
- browser and fetch smoke coverage for stale identity regressions

Timeout work should continue through limit, cache, fallback, and delivery-path
improvements. Do not switch source of truth back to legacy paths.

## Chart Policy

Regional index cards intentionally preserve requested universe identity.
Sparse regional history should show History Building or an empty-history state
for that requested universe.

Regional pages must not silently render KOREA_ALL chart data for a regional
universe.

## Route Role Markers

- `/api/rankings` is the home lightweight tactical board endpoint.
- `/api/ranking` is the `/ranking` TOP1000 full-board endpoint.
- Both accept the canonical `universe_code` request contract.
- Endpoint consolidation is out of scope while home and TOP1000 keep different
  board depths.

## Search Policy

`/api/search` should prioritize the current selected universe. Regional search
must not revive global fallback as the primary behavior. The API may keep
separate local/global fields for compatibility, but the product contract is
same-universe identity first.

## SGG Exposure Status

- Batch-1 remains open.
- Batch-2 remains open.
- Batch-3 remains open as controlled staged exposure:
  `SGG_11350`, `SGG_11380`, `SGG_11530`.
- Enabled SGG count is 24.
- Next candidateReady set: `SGG_11545`, `SGG_11620`.
- Batch-4 remains closed pending explicit follow-up review.

## Release Gate Note

`npm run gate:sgg` distinguishes:

- Blocking failures: user-facing route/API/browser/build failures.
- Advisory findings: direct snapshot/latest-board read misses when the same
  universe passes the user-facing delivery path.

Do not rollback a batch solely because of advisory direct-read diagnostics.
Investigate the direct-read path first.

## Recharts Note

When Recharts emits warnings from missing dimensions or unstable chart mounts,
keep the fix in stable container dimensions, keyed remounts, or chart data
identity. Do not change source of truth to hide chart warnings.
