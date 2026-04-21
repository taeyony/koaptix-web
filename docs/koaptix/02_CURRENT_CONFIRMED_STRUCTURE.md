# KOAPTIX Current Confirmed Structure

This document describes the currently confirmed local repo structure. It is a
snapshot of working implementation boundaries, not a proposal for new design.

## Source Chain

The confirmed universe board chain is:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

The registry in `src/lib/koaptix/universes.ts` is the single service exposure
control point.

## Routes

- `/api/rankings`
  - Home lightweight tactical board.
  - Uses the canonical `universe_code` request contract.
  - Intentionally capped for fast regional transitions.

- `/api/ranking`
  - `/ranking` TOP1000 full-board endpoint.
  - Uses the canonical `universe_code` request contract.
  - Kept separate from `/api/rankings` because home and TOP1000 serve different
    board depths.

- `/api/search`
  - Current-universe-first search.
  - Regional search should not revive global fallback as the primary result
    path, while the API contract may still expose separate local/global result
    fields for compatibility.

- `/api/map`
  - Universe-aware map delivery.
  - Map payload identity must match the requested universe.

## Home Structure

- `src/app/page.tsx` uses `getLatestRankBoard` as the SSR seed path.
- Home keeps a lightweight tactical board.
- `RankingBoardClient` fetches through the canonical `universe_code` API
  contract.
- `CommandPalette` prioritizes the current universe identity for search.
- `NeonMap` uses universe-aware map delivery and universe-scoped coordinate
  cache keys.

## Ranking Structure

- `/ranking` owns the full-board TOP1000 workflow.
- URL state includes `universe`, `q`, `tier`, and `complexId`.
- Detail sheet open/close should keep URL state synchronized.

## Chart Policy

- `MarketChartCard` uses the requested/rendered universe identity.
- Regional index cards preserve requested universe identity even when history is
  sparse.
- Sparse regional history should render History Building or empty-history state,
  not KOREA_ALL fallback.

## Map Policy

- `NeonMap` keeps coordinate cache scoped by universe.
- Previous-region bubbles or geocoded coordinates must not be reused for a new
  universe.

## Smoke Baseline

- `npm run smoke:regional` validates fetch/HTML regional identity.
- `npm run smoke:browser` validates browser-level switching, detail sheet,
  TOP1000 deep link/close, and Command Palette regional selection.
- These smoke tests are identity regression checks; they do not change source of
  truth or registry state.
