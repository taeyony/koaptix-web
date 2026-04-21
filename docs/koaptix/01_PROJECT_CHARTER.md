# KOAPTIX Project Charter

KOAPTIX reads apartment capital flow by universe. The product should preserve
the confirmed data foundation while making regional and SGG expansion
understandable to users.

## Product Roles

- Home is the situation board.
- `/ranking` is the operations room.
- TOP1000 is the full board.
- Home keeps a lightweight tactical board for fast regional switching.
- Ranking/TOP1000 owns deeper filtering, search, detail, and full-board
  exploration.

## User-Facing Policy

- `KOAPTIX 500` remains the flagship home board.
- Search, board, and map surfaces share the same `universe_code` contract.
- Universe labels can be localized for the user, but delivery identity is the
  canonical code.
- Regional index cards preserve the requested universe identity.
- When regional index history is sparse, the card should show the same
  requested universe with History Building or an empty-history state.
- Regional index cards must not silently switch to KOREA_ALL fallback data.

## Expansion Policy

- Existing stable behavior is more important than new feature breadth.
- Multi-universe expansion is additive only.
- Registry exposure must stay deliberate and reversible by batch.
- New public exposure should follow confirmed readiness, not assumption.

## Delivery Policy

- Home surfaces should favor lightweight delivery, bounded payloads, scoped
  caches, and same-universe identity.
- Ranking/TOP1000 can carry the heavier full-board workflow.
- Timeout fixes should live in limit, cache, fallback, and delivery-layer
  tactics, not source-of-truth rollback.

## Non-Goals

- This charter does not authorize DB schema changes.
- This charter does not authorize SQL function or snapshot-chain changes.
- This charter does not authorize registry expansion by itself.
