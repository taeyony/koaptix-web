# KOAPTIX Master Living Source of Truth

This document records only long-lived KOAPTIX operating principles. It does not
list temporary batches, individual SGG exposure results, timeout values, smoke
logs, or release gate procedure details.

## Core Principles

- Preserve the confirmed KOREA_ALL engine. Do not redesign or re-open it unless
  a product-level decision explicitly changes this rule.
- Multi-universe expansion is additive only.
- The canonical service contract is `universe_code`.
- The universe board source of truth is the `koaptix_rank_snapshot` based chain.
- The official safe operating path is the helper chain, not sealed legacy
  wrappers.
- Do not roll back the source of truth to legacy membership/history direct
  sources.
- Public service exposure is managed from the registry as a single control
  point.

## Source Of Truth Chain

The official universe board chain is:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

`complex_rank_history` remains a single historical rank engine without
`universe_code`. Universe-specific boards are generated additively through the
snapshot chain.

## Canonical Contract

All service-facing universe delivery paths should speak in `universe_code`.
User-facing labels and aliases are presentation details and must not replace
the canonical code contract.

Representative code shapes:

```text
KOREA_ALL
SEOUL_ALL
BUSAN_ALL
GYEONGGI_ALL
SGG_<5 digits>
```

## Registry Principle

Snapshot or board existence alone does not expose a universe. A universe becomes
service-visible only when the registry enables it for the relevant surface.

The registry is the single service exposure control point.

## Prohibitions

- Do not rebuild KOREA_ALL as a new engine.
- Do not treat a universe board as a simple filter of national rank.
- Do not bypass `koaptix_rank_snapshot` for universe board delivery.
- Do not revive sealed legacy wrappers as the official path.
- Do not use membership output alone to declare board readiness.
- Do not turn temporary operational findings into permanent source-of-truth
  rules without confirmed evidence.
