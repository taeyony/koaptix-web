# KOAPTIX Operations And Prohibitions

This document is for operating discipline. It does not authorize new features,
DB changes, SQL changes, route rewrites, or registry expansion.

## Operating Rules

- Read the current full local file body before patching.
- Treat patch-on-patch high-risk files with care.
- Prefer whole-file normalize when duplicated helpers, nested fallback blocks,
  or mixed old/new logic make a narrow patch unsafe.
- Preserve existing successful assets before adding new behavior.
- Keep `universe_code` as the canonical delivery contract.
- Keep service exposure registry-managed.

High-risk files include:

- `src/lib/koaptix/queries.ts`
- `src/app/page.tsx`
- route files with accumulated fallback/cache behavior

## Timeout Handling

Timeouts should be handled through:

- smaller limits
- scoped cache
- stale-safe fallback
- delivery-layer retry or dynamic fallback
- browser/API smoke coverage

Timeouts must not be handled by rolling source of truth back to legacy
membership/history direct sources.

## Required Local Checks

For feature or delivery-path work, run:

```bash
npm run build
npm run smoke:regional
npm run smoke:browser
```

`npm run gate:sgg` is the SGG exposure gate. Use it for SGG exposure work, but
do not treat every document-only change as requiring the full release gate.

## SGG Staged Exposure

- Open SGG exposure in small staged batches.
- Current operating batch size is three SGG entries.
- Do not expose SGG entries by assumption.
- A serious identity mismatch in any batch member should hold the whole batch.
- Rollback scope should remain limited to the latest changed registry batch.

## Gate Failure Handling

Do not immediately rollback on every gate failure. First classify the failure:

- Blocking: `/api/rankings`, `/api/map`, `/api/search`, `/ranking`,
  browser identity, regional smoke, or build failure.
- Advisory: direct snapshot/latest-board read miss when user-facing delivery
  paths still pass for the same universe.

Rollback is appropriate for confirmed blocking identity or delivery regressions
introduced by the batch. Advisory direct-read diagnostics should be investigated
without changing registry exposure by default.

## Prohibitions

- Do not change DB schema.
- Do not change SQL functions or snapshot chain.
- Do not change route/delivery logic during document cleanup.
- Do not change registry exposure during document cleanup.
- Do not open batch-3 from a documentation task.
- Do not revive global search fallback for regional search.
- Do not merge `/api/rankings` and `/api/ranking` without a product decision.
- Do not bypass `koaptix_rank_snapshot` as universe board source of truth.
