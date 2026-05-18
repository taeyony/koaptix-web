# KOAPTIX Client Fetch Timeout Stabilization

**Pass:** Client-side delivery timeout & degraded-state stabilization
**Date:** 2026-05-18
**Status:** PASS_CLIENT_FETCH_TIMEOUT_STABILIZED_BUILD_PASS

---

## Problem

Client-side fetches in `RankingBoardClient` and `NeonMap` used `AbortController`
for component unmount only. If `/api/rankings` or `/api/map` were slow or stuck,
clients would wait indefinitely with no visible progress or recovery.

Root cause: the `catch` guards in both components checked
`controller.signal.aborted` to detect unmount, but a timeout abort would also
set `signal.aborted = true`, causing the same silent-bail behavior — leaving
`isBoardLoading = true` stuck or the map showing stale board-seed data with no
fallback transition recorded.

---

## Solution

Added a `timedOut` boolean flag per fetch effect to distinguish a wall-clock
timeout abort from an unmount abort. The flag is set before calling
`controller.abort()` in the timeout handler, allowing the catch block to apply
the correct response path.

### Timeout durations

| Component | Fetch target | Timeout |
|---|---|---|
| `RankingBoardClient` | `/api/rankings` | **7000 ms** |
| `NeonMap` | `/api/map` | **7000 ms** |

---

## RankingBoardClient — `loadBoard()` changes

### Before

```typescript
const controller = new AbortController();
let cancelled = false;

// ...
} catch (error) {
  if (controller.signal.aborted || cancelled || isAbortError(error)) {
    return;   // ← ALL aborts return silently (including timeout)
  }
  // ...
} finally {
  if (!cancelled) setIsBoardLoading(false);
}

return () => { cancelled = true; controller.abort(); };
```

### After

```typescript
const controller = new AbortController();
let cancelled = false;
let timedOut = false;

const boardFetchTimeoutMs = 7000;
const timeoutId = setTimeout(() => {
  timedOut = true;
  controller.abort();
}, boardFetchTimeoutMs);

// ...
} catch (error) {
  // Unmount abort: return silently.
  if (!timedOut && (controller.signal.aborted || cancelled || isAbortError(error))) {
    return;
  }
  // Timeout or real error:
  const message = timedOut
    ? "Ranking request timed out"
    : error instanceof Error ? error.message : "보드 로딩 실패";

  setBoardItems((prev) => (prev.length > 0 ? prev : []));
  setLiveBoardError(message);
  console.warn("[RankingBoardClient] board fetch timeout / warn", { ... });
} finally {
  clearTimeout(timeoutId);
  if (!cancelled) setIsBoardLoading(false);
}

return () => { cancelled = true; clearTimeout(timeoutId); controller.abort(); };
```

**Stale data preserved:** `setBoardItems((prev) => (prev.length > 0 ? prev : []))`
— if previous board rows exist (e.g. stale-while-syncing path), they are kept.
Only an empty board is left empty. `isBoardLoading` ends via `finally`.

---

## NeonMap — `loadMapItems()` changes

NeonMap already renders board-seed fallback aggregate on mount, so the user
always sees data. The change ensures that a timeout explicitly triggers the
same board-seed fallback path (with `fallbackMode: "client-timeout-fallback"`)
instead of returning silently.

```typescript
const controller = new AbortController();
let cancelled = false;
let timedOut = false;

const mapFetchTimeoutMs = 7000;
const timeoutId = setTimeout(() => {
  timedOut = true;
  controller.abort();
}, mapFetchTimeoutMs);

// ...
} catch (error) {
  if (!timedOut && (controller.signal.aborted || cancelled)) return;

  // Timeout or real error:
  setMapItems(fallbackMapItemsRef.current);
  setMapDelivery(buildMapDeliveryState(currentUniverseCode, {
    fallbackMode: timedOut ? "client-timeout-fallback" : "client-board-fallback",
    ...
  }));

  if (!timedOut) setMapItemsError(message);  // suppress error badge on timeout
} finally {
  clearTimeout(timeoutId);
}

return () => { cancelled = true; clearTimeout(timeoutId); controller.abort(); };
```

Timeout does NOT set `mapItemsError` — users see the map with board-seed data,
not an error badge. The `data-map-fallback-mode` attribute reflects
`"client-timeout-fallback"` for developer/smoke visibility.

---

## CommandPalette — Search Timeout (Follow-up pass, 2026-05-18)

`CommandPalette` now has the same `timedOut` flag + wall-clock AbortController
pattern applied to `RankingBoardClient` and `NeonMap`.

### Timeout duration

| Component | Fetch target | Timeout |
|---|---|---|
| `CommandPalette` | `/api/search` | **7000 ms** |

### What changed

- Added `let timedOut = false;` and `let fetchTimeoutId: number | undefined;` to
  the outer effect scope alongside the existing `cancelled` flag.
- Inside the 180 ms debounce callback, a wall-clock timeout is started immediately
  after `setIsSearching(true)`:
  ```typescript
  fetchTimeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, searchFetchTimeoutMs);
  ```
- `catch` block distinguishes timeout abort (`!timedOut && (signal.aborted || cancelled)`)
  from unmount abort. Unmount returns silently; timeout surfaces the message
  `"검색 시간 초과"` into the existing rose-coloured `searchError` panel.
- `finally` calls `clearTimeout(fetchTimeoutId)` to prevent timer leak on success.
- Effect cleanup return also calls `clearTimeout(fetchTimeoutId)` to prevent timer
  fire after unmount.

### Fallback behaviour

On timeout the component enters the existing `searchError` display path
(no UI redesign). The user sees the existing `"검색 시간 초과"` message in the
rose panel. `isSearching` ends (no indefinite spinner). On the next keystroke the
query changes, the effect re-runs cleanly.

### All three client delivery fetch paths are now bounded

| Component | Fetch target | Timeout |
|---|---|---|
| `RankingBoardClient` | `/api/rankings` | 7000 ms |
| `NeonMap` | `/api/map` | 7000 ms |
| `CommandPalette` | `/api/search` | 7000 ms |

DB source-of-truth, KOREA_ALL engine, universe registry, and API response shapes
are all unchanged.

---

## Timer Leak Safety

Both patterns:
1. `clearTimeout(timeoutId)` in `finally` — clears the timer on success or error.
2. `clearTimeout(timeoutId)` in cleanup return — clears the timer on unmount before
   it fires. Prevents state updates on unmounted components.

If unmount fires before timeout:
- `cancelled = true`, `controller.abort()` called, timer cleared.
- Any pending async work sees `cancelled` and returns early.

If timeout fires before unmount:
- `timedOut = true`, fetch aborted, fallback state set, `finally` clears timer.
- Unmount cleanup still calls `clearTimeout(timeoutId)` (no-op, already cleared).

---

## Unchanged Items

- DB source-of-truth chain (`v_koaptix_latest_universe_rank_board_u`) — unchanged
- KOREA_ALL ranking engine — unchanged
- Universe registry (`universes.ts`) — unchanged
- Market-cap / rank / index generation — none performed
- API response shapes — unchanged
- UI layout and visual design — unchanged

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

- `src/components/home/RankingBoardClient.tsx`
- `src/components/home/NeonMap.tsx`
- `docs/KOAPTIX_CLIENT_FETCH_TIMEOUT_STABILIZATION.md` (this file)
