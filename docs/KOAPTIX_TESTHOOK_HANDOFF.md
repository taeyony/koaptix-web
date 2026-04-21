# KOAPTIX Test Hook Handoff

## Purpose

This handoff summarizes the test-hook extraction state after the SGG batch-3
checkpoint. It tells the next worker which smoke-browser hooks are already
isolated, which files must remain on hold, and where not to make broad app
changes.

This document is only about smoke/gate reproducibility hooks. It is not a
release-expansion plan. Feature improvement work can continue after this
handoff, but it should be handled as separate work from the current stabilized
line.

## Checkpoints

- `c8c4d20`: checkpoint for browser smoke stabilization, `gate:sgg`, batch-3
  open, and 24 enabled SGG. Treat this as the current stabilized baseline.
- `b42c29e`: small test-hook commit for `ComplexDetailSheet.tsx` and
  `RankingCard.tsx` selectors.
- `2d75e67`: small test-hook commit for `CommandPalette.tsx` selectors.

## Completed Extractions

### `src/components/home/ComplexDetailSheet.tsx`

Hooks extracted:

- `data-testid="complex-detail-sheet"`
- `data-complex-id={item.complexId}`
- `data-testid="complex-detail-close"`

Why safe: these are attributes on existing detail root and close button nodes.
No close handler, render policy, styling, or detail data behavior was changed.

### `src/components/home/RankingCard.tsx`

Hooks extracted:

- `data-testid="ranking-card"`
- `data-complex-id={item.complexId}`
- `data-universe-code={item.universeCode ?? item.universe_code ?? ""}`

Why safe: these are attributes on the existing card root. No click behavior,
ranking display, bookmark behavior, comparison behavior, or styling was changed.

### `src/components/home/CommandPalette.tsx`

Hooks extracted:

- `data-testid="command-palette-open"`
- `data-testid="command-palette-input"`
- `data-testid="command-result-card"`
- `data-complex-id={item.complexId}`
- `data-universe-code={item.universeCode ?? item.universe_code ?? ""}`

Why safe: the final diff only added attributes to existing trigger, input, and
result card nodes. Search policy, global result rendering, normalization, and
selection behavior were not changed in the committed hook extraction.

## Held Files

Quick risk summary:

- `RankingBoardClient.tsx` -> `/api/ranking`, tier filter, router sync, reusable board coupling.
- `MarketChartCard.tsx` -> chart payload contract and requested/rendered universe identity coupling.
- `NeonMap.tsx` -> coord cache, fallback reset, geocode identity, map limit coupling.
- `UniverseSelector.tsx` -> finder/search/recent UX rewrite coupling.

### `src/components/home/RankingBoardClient.tsx`

Status: hold.

Reason: the current working-tree diff mixes the needed `ranking-board` attrs
with `/api/ranking`, TOP1000, reusable board props, tier filters, router sync,
board cache keys, fetch path, and layout behavior. Do not commit this as a
test-hook-only change; `/api/ranking`, tier filter, router sync, and reusable
board changes are strongly coupled here.

Next action: review from clean `HEAD` and design a minimal patch that only adds
`data-testid="ranking-board"`, `data-universe-code`, and possibly
`data-api-base-path` to the existing board root, or do a whole-file review
first.

### `src/components/home/MarketChartCard.tsx`

Status: hold.

Reason: smoke wants `market-chart-card` plus requested/rendered universe attrs,
but the current working-tree diff changes the chart from `data` props to a new
`payload` contract and is coupled to `page.tsx` and `queries.ts`; chart payload
and requested/rendered universe identity are not separable in the current diff.

Next action: review it as a chart feature/contract bundle with `page.tsx` and
`queries.ts`. Do not extract this from the current large diff.

### `src/components/home/NeonMap.tsx`

Status: hold.

Reason: the needed map attrs are simple, but the current diff also changes map
limits, fallback reset behavior, universe-scoped coordinate cache, and geocode
identity. Coord cache, geocode identity, fallback reset, and map limit changes
are strongly mixed, so this is not hook-only.

Next action: design a separate clean `HEAD` map-root hook-only patch for
`data-testid="neon-map"` and `data-universe-code` before touching map behavior.

### `src/components/home/UniverseSelector.tsx`

Status: hold.

Reason: smoke needs `current-universe-label`, `universe-option`,
`universe-finder-toggle`, and `universe-search-input`, but the current diff is a
large selector UX rewrite with finder/search/recent behavior tied to the hooks.

Next action: do not touch it without whole-file review. If clean-checkout smoke
still requires these selectors, design a minimal hook-only patch against clean
`HEAD`.

## Summary Table

| File | Status | Reason | Next Action |
| --- | --- | --- | --- |
| `ComplexDetailSheet.tsx` | Complete | Existing detail root and close button hooks only | Keep as committed in `b42c29e` |
| `RankingCard.tsx` | Complete | Existing card root hooks only | Keep as committed in `b42c29e` |
| `CommandPalette.tsx` | Complete | Existing trigger/input/result hooks only | Keep as committed in `2d75e67` |
| `RankingBoardClient.tsx` | Hold | Mixed with `/api/ranking`, tier filter, router sync, reusable board changes | Clean `HEAD` minimal hook patch or whole-file review |
| `MarketChartCard.tsx` | Hold | Chart payload contract and requested/rendered universe identity are coupled to `page.tsx`/`queries.ts` | Review as chart feature/contract bundle |
| `NeonMap.tsx` | Hold | Mixed with coord cache, geocode identity, fallback reset, map limit changes | Design clean `HEAD` map-root hook-only patch |
| `UniverseSelector.tsx` | Hold | Finder/search/recent UX rewrite is tied to the hooks | Whole-file review before touching |

## Next Priority

After this handoff, feature improvement work may continue, but it must not be
mixed with the stabilized smoke/gate line:

1. Do not commit the remaining large glue-file diffs as test-hook work.
2. Do not immediately modify held glue files under a feature-improvement label;
   start with clean `HEAD` design or whole-file review.
3. Keep batch-4 as a separate decision turn.
4. For `RankingBoardClient.tsx`, `NeonMap.tsx`, and possibly
   `UniverseSelector.tsx`, design minimal hook patches from clean `HEAD` only if
   smoke/gate reproducibility still requires them.
5. For `MarketChartCard.tsx`, review the chart payload contract together with
   `page.tsx` and `queries.ts` as a separate feature/contract unit.

## Gate Expectation Boundary

- Baseline gate covers `/api/rankings`, `/api/map`, and `/api/search`.
- Map readiness is bounded warm operational readiness: the first cold
  `/api/map` result is recorded as `mapColdStatus` diagnostic data, and the
  blocking check is `mapOperationalOk`.
- `mapOperationalOk` passes only when the same universe returns a 200 payload
  with `count > 0` and cache state `live`, `fresh`, or `stale` within three
  attempts with 300 ms between attempts.
- A strict cold miss such as `504 MAP_TIMEOUT` with cache `miss` is diagnostic
  only unless the bounded warm operational window also fails.
- Browser smoke readiness is app-ready DOM/test-hook surface based, not
  `document.readyState === "complete"` based. `document.readyState` is kept as
  diagnostic data only.
- Browser smoke should wait for hydrated KOAPTIX/Rankings surface, active
  universe buttons, and rendered `ranking-card` hooks before running identity
  checks; it must not weaken the universe/map/board/chart assertions.
- `/ranking` / TOP1000 is not part of the clean tracked baseline yet; keep it
  informational or behind an explicit feature gate until the route is tracked.
- Search may return current-universe results first and optional global auxiliary
  results after them. Global auxiliary results alone should not fail the baseline
  gate when local results are present and correctly scoped.

## Do Not Cross

- Do not redesign the KOREA_ALL engine.
- Do not rollback source of truth.
- Do not change the DB, SQL, or snapshot chain for test-hook cleanup.
- Do not mix batch-4 opening with test-hook cleanup.
- Do not force the current large working-tree diffs into hook-only commits.
- Keep staged exposure in the registry path only, and only when explicitly
  instructed.
