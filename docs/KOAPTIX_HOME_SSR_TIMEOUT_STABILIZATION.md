# KOAPTIX Home SSR Timeout Stabilization

**Pass:** Home service-layer cold-path stabilization
**Date:** 2026-05-18
**Status:** PASS_HOME_SSR_TIMEOUT_STABILIZED_BUILD_PASS

---

## Problem

When Supabase is cold (first request after idle or cold Vercel Function start), the
`getLatestRankBoard()` query for non-KOREA universes can be slow. The SSR home page
was holding the Next.js response open for up to `boardSeedTimeoutMs = 7200 ms`
(7.2 s) before falling back to an empty seed and letting the client hydrate.

Additionally, when the timeout fired the fallback was resolved silently — no
server-side log was emitted, making cold-path degradation invisible in production
logs.

---

## KOREA_ALL Cold-Path — Already Mitigated

**Key finding:** KOREA_ALL was never the active blocking risk after inspection.

`src/app/page.tsx` already contained:

```typescript
const boardSeedPromise =
  universeCode === DEFAULT_UNIVERSE_CODE
    ? Promise.resolve({ items: [], boardError: null })   // ← immediate, no Supabase
    : withTimeoutFallback(getLatestRankBoard(...), ...)
```

KOREA_ALL always returns an empty seed immediately via `Promise.resolve`. The
Supabase view is never queried during SSR for the default universe. The actual
cold-path risk was in **non-KOREA regional universe** SSR seeds.

---

## Solution

Two targeted changes to `src/app/page.tsx`:

### 1. Reduce `boardSeedTimeoutMs` from 7200 → 4000 ms

```typescript
// Before
const boardSeedTimeoutMs = 7200;

// After
const boardSeedTimeoutMs = 4000;
```

Non-KOREA home SSR now falls back to an empty seed after 4 s instead of 7.2 s,
then immediately triggers client-side hydration from `/api/rankings`.

### 2. Add `onTimeout` callback to `withTimeoutFallback` + logging call

```typescript
function withTimeoutFallback<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  onTimeout?: () => void,   // ← new optional param
): Promise<T> { ... }
```

Called with:

```typescript
() => console.warn(
  "[HOME] board seed timeout; falling back to empty seed for client hydration",
  { universeCode, boardSeedTimeoutMs },
)
```

When a regional universe SSR seed times out, a single `console.warn` is emitted
server-side. No secrets are logged (only `universeCode` and the timeout
duration).

---

## Fallback Architecture (post-change)

```
page.tsx SSR

  KOREA_ALL:
    -> Promise.resolve({ items: [], boardError: null })
    -> [instant, no DB call]

  Regional universe:
    -> getLatestRankBoard(universeCode, 18)
    -> withTimeoutFallback(4000ms, empty fallback)
    -> if query < 4s: SSR seed renders items
    -> if query >= 4s OR error:
         - console.warn emitted
         - empty seed { items: [], boardError: null }
         - RankingBoardClient.isBoardLoading = true
         - client fetches /api/rankings?universe_code=X&limit=20
         - board renders fresh data after client hydration

/api/rankings:
  -> in-memory cache (fresh 60s / stale 10m)
  -> inflight deduplication
  -> KOREA_ALL: dynamic-only path, 7s timeout
  -> regional: dynamic-only path, 4.5s timeout
  -> stale cache fallback on error
  -> structured JSON error on hard fail
```

---

## Client Hydration Confirmation

`RankingBoardClient.tsx` lines 377–388:

```typescript
const hasUsableServerSeed = !boardError && items.length > 0;

if (hasUsableServerSeed) {
  boardCacheRef.current[getBoardCacheKey(boardUniverseCode)] = items;
  setStaleBoardUniverseCode(null);
  setIsBoardLoading(false);
  return;  // ← uses server seed, no /api/rankings call
}

// Empty seed: triggers /api/rankings hydration
delete boardCacheRef.current[getBoardCacheKey(boardUniverseCode)];
setIsBoardLoading(true);
// loadBoard() → fetchBoardUniverse() → /api/rankings
```

When seed is empty (timeout fallback), `hasUsableServerSeed = false` and the
client immediately fetches `/api/rankings`. The board shows a loading state during
client hydration and renders items once the API responds.

---

## Unchanged Items

- DB source-of-truth chain (`v_koaptix_latest_universe_rank_board_u`) — unchanged
- KOREA_ALL ranking engine — unchanged
- Universe registry (`universes.ts`) — unchanged
- Market-cap / rank / index generation — none performed
- API response shapes — unchanged
- UI layout — unchanged
- `package.json` / dependencies — unchanged

---

## Validation

```
npm run build → exit 0
✓ TypeScript: Finished TypeScript in 2.5s (0 errors)
✓ 5/5 static pages generated
All routes compiled successfully
```

---

## Files Changed This Pass

- `src/app/page.tsx` — reduced timeout, added `onTimeout` param + logging
- `docs/KOAPTIX_HOME_SSR_TIMEOUT_STABILIZATION.md` (this file)

Prior passes (not changed in this pass):
- `src/app/api/rankings/route.ts`
- `src/app/api/map/route.ts`
- `src/app/api/search/route.ts`
- `src/lib/koaptix/types.ts`
- `src/components/home/RankingCard.tsx`
- `src/components/home/TopMovers.tsx`
- `src/components/home/MarketHeatmap.tsx`
- `src/components/home/ComplexDetailSheet.tsx`
