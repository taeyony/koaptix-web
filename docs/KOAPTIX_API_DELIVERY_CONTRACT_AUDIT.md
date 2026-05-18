# KOAPTIX API Delivery Contract Audit

Date: 2026-05-18  
Pass: Second app/service-layer stabilization (contract audit)  
Build: PASS (Next.js 16.2.0 Turbopack)

---

## Summary

All three home delivery API routes (`/api/rankings`, `/api/map`, `/api/search`) and their
client consumers (`RankingBoardClient`, `NeonMap`, `CommandPalette`, `ComplexDetailSheet`,
`TopMovers`, `RankingCard`) were audited for response-shape mismatches and null-safety
gaps. No runtime crash risks were found. No product code changes were made in this pass.

---

## /api/rankings

**Response shape**
```json
{
  "ok": true,
  "universeCode": "KOREA_ALL",
  "count": 12,
  "items": [ RankingItem... ],
  "X-Koaptix-Cache": "fresh | inflight | live | stale | miss"
}
```
On error:
```json
{ "ok": false, "universeCode": "...", "count": 0, "items": [], "message": "..." }
```

**Client: RankingBoardClient**
- Reads `json.ok`, `json.items`, `json.message`. Handles `ok === false` by throwing.
- Stale/loading/error states are all handled with inline UI.
- KOREA_ALL: SSR seed is intentionally `[]`. Client fetches on mount and fills the board.
  Effective server limit capped at 12 for KOREA_ALL via `getEffectiveBoardLimit`.
  Home tactical limit and API limit are aligned.

**Client: RankingCard**
- Guards `typeof item.rankDelta7d === "number"` before any numeric operations on delta.
  Runtime null from the mapper is handled safely; renders `—` instead of crashing.
- `item.marketCapTrillionKrw?.toFixed(2)` uses optional chaining. Safe.
- `item.recoveryRate52w != null` guard before `.toFixed(1)` call. Safe.

**Client: TopMovers**
- `filter(i => i.rankDelta7d > 0 / < 0)` evaluates false for null, excluding null-delta
  items before the `.sort()`. No null arithmetic reaches the sort comparator. Safe.

**Verdict: SAFE. Contract aligned.**

---

## /api/map

**Response shape**
```json
{
  "ok": true,
  "universeCode": "KOREA_ALL",
  "requestedUniverseCode": "KOREA_ALL",
  "renderedUniverseCode": "KOREA_ALL",
  "mapScopeLabel": "전국",
  "isFallback": false,
  "fallbackMode": "none | stale-cache",
  "source": "dynamic | stale-cache",
  "count": 14,
  "items": [ MapDistrictItem... ]
}
```
On error:
```json
{ "ok": false, ..., "fallbackMode": "miss", "count": 0, "items": [], "message": "..." }
```

**Client: NeonMap**
- Reads `json.ok`, `json.items`, `json.renderedUniverseCode`, `json.fallbackMode`.
- Handles `ok === false` by throwing; catch block sets `mapItemsError` and falls back
  to `fallbackMapItemsRef.current` (built from SSR board seed).
- KOREA_ALL: `getDesiredMapSourceLimit` sends 32/52/72 rows; server caps via
  `getEffectiveRequestedLimit` to 32/52/88. Bounded and lightweight. No full-scan risk.
- Empty items render an empty map with no bubbles. No crash on `[]`.
- `buildFallbackAggregate(items)` on KOREA_ALL `items=[]` returns `[]`. Safe.

**Verdict: SAFE. Contract aligned.**

---

## /api/search

**Response shape**
```json
{
  "ok": true,
  "universeCode": "KOREA_ALL",
  "resultOrder": ["localItems", "globalItems"],
  "localItems": [ RankingItem... ],
  "globalItems": [ RankingItem... ]
}
```
On degraded (source timeout):
```json
{ "ok": true, ..., "localItems": [], "globalItems": [], "degraded": true, "message": "..." }
```

**Client: CommandPalette**
- Reads `json.ok`, `json.localItems ?? []`, `json.globalItems ?? []`.
- Handles `ok === false` by throwing; catch block sets `searchError` and clears results.
  Shows a rose-colored error message in the palette; no crash.
- `degraded: true` is not consumed (no visual indicator), but the empty arrays are safe.
- `localFallbackItems` (client-side filter over SSR board seed) uses optional chaining for
  sigunguName/legalDongName/locationLabel. `item.name` always defaults to `""` from all
  mappers. Safe.
- Note: the degraded state silently returns `ok: true` with empty arrays. The client
  treats this as a successful empty search, not an error. This is intentional product
  behavior (degrade to empty rather than surface intermittent 500s).

**Verdict: SAFE. Contract aligned.**

---

## Type Contract Observations (non-crashing, documentation only)

`src/lib/koaptix/types.ts` `RankingItem` has several fields that are declared as required
but are not populated by home/ranking board mappers (`page.tsx`, `/api/rankings`,
`/api/search`):

| Field | Declared type | Home board value | Used by component? |
|---|---|---|---|
| `rankDelta7d` | `number` | `number \| null` | Yes — guarded by `typeof === "number"` |
| `searchText` | `string` | not set (undefined) | Only by `/api/ranking` full board route |
| `historySnapshotDate` | `string \| null` | not set (undefined) | ComplexDetailSheet — safe via JS falsy |
| `marketCapDelta7d` | `number` | not set (undefined) | ComplexDetailSheet — safe via JS falsy |
| `marketCapDeltaPct7d` | `number` | not set (undefined) | ComplexDetailSheet — safe via JS falsy |
| `deltaWindow` | `"7d"` | not set (undefined) | Not consumed in home path |
| `rankDelta1d` | `number` | not set (undefined) | Not consumed in home path |
| `highMarketCap52w` | `number \| null` | not set (undefined) | ComplexDetailSheet — guarded by `!= null` |

**Why these don't crash**: All consuming format functions (`formatRankDelta`,
`formatPercent`, `formatSignedNumber`, `rankDeltaTone`, `momentumTone`) use `> 0` / `< 0`
comparisons, which evaluate to `false` for `null` and `undefined` in JavaScript.
The functions fall through to their default return values (`"— 0"`, `"0.00%"`, `"0"`,
`"text-white/45"`).

The full-board path (`/api/ranking`) does populate all fields including `searchText`,
`historySnapshotDate`, `marketCapDelta7d`, `marketCapDeltaPct7d`, `deltaWindow`,
`rankDelta1d`, `highMarketCap52w` via its own `toRankingItem` mapper. The home board
path intentionally omits them for payload lightness.

**Risk level: LOW.** No crashes. Tightening the type contract is deferred to a dedicated
pass to avoid TypeScript build regressions in components that currently assume `number`.

---

## KOREA_ALL Home Seed vs API Tactical Limit

| Path | Limit | Note |
|---|---|---|
| Home SSR seed (KOREA_ALL) | 0 rows (intentional empty) | Client fetches on mount |
| `/api/rankings` KOREA_ALL effective | 12 rows | `getEffectiveBoardLimit` cap |
| `/api/map` KOREA_ALL effective | 32–88 rows | `getEffectiveRequestedLimit` buckets |
| `/api/search` source window | 80 rows | `getSearchSourceLimit()` |

The home SSR seed for KOREA_ALL is intentionally empty. `RankingBoardClient` detects
`items.length === 0` and immediately fetches from `/api/rankings`. This is a safe and
lightweight KOREA_ALL cold-path. No alignment change needed.

---

## Remaining Risks

1. **KOREA_ALL cold-path timeout**: `/api/rankings` has 7 s and `/api/map` has 8.5 s
   local timeouts for KOREA_ALL dynamic path. Supabase view cold starts can exceed these.
   Stale in-memory cache mitigates repeat hits but the first cold call is still exposed.

2. **Type contract gap**: `RankingItem.rankDelta7d` typed as `number` but produced as
   `number | null`. TypeScript accepts this only because mappers use `as unknown as
   RankingItem`. If a future component accesses `rankDelta7d` without a type guard, it
   could produce a silent runtime bug.

3. **`degraded` search response**: `/api/search` returns `ok: true` on degraded path.
   `CommandPalette` has no visual indicator for `degraded: true`. Users silently see empty
   results on search source failure. Low priority but worth noting.

4. **Lint gate absent**: `npm run lint` uses stale `next lint` with no ESLint config.
   `npm run build` remains the sole validation gate.

5. **`metadataBase` warning**: Build emits a non-blocking Next.js 16 warning about
   `metadataBase` not being set in the metadata export. Does not affect delivery.
