# KOAPTIX Type Contract Stabilization

**Pass:** Narrow type-contract stabilization for `RankingItem`
**Date:** 2026-05-18
**Status:** PASS_TYPE_CONTRACT_FIXED_BUILD_PASS

---

## What mismatch was found

`RankingItem` in `src/lib/koaptix/types.ts` had several fields typed as required
non-nullable (`number`, `string`, `"7d"`) that the actual home-board delivery path
never guarantees.

Root cause: two separate code paths produce `RankingItem` objects:

| Path | Producer | `rankDelta7d` result |
|------|----------|----------------------|
| `mappers.ts` (`mapLatestRankBoardRow`) | `toNumber(row.rank_delta_7d, 0)` | always `number` |
| home tactical board (`/api/rankings`, `/api/search`, `page.tsx`) | `toNullableNumber(...)` (no `?? 0`) | `number \| null` |

Fields not produced at all by the home tactical path:

- `searchText` (set by `mappers.ts` and `/api/ranking`, not by home board inline mappers)
- `historySnapshotDate`, `marketCapDelta7d`, `marketCapDeltaPct7d`, `deltaWindow`,
  `rankDelta1d`, `highMarketCap52w`

---

## What was changed

### `src/lib/koaptix/types.ts`

| Field | Before | After | Reason |
|-------|--------|-------|--------|
| `rankDelta7d` | `number` | `number \| null` | home board mapper uses `toNullableNumber()` without `?? 0` |
| `searchText` | `string` (required) | `string?` | not set by home board inline mappers |
| `historySnapshotDate` | `string \| null` (required) | `(string \| null)?` | not set by home board inline mappers |
| `marketCapDelta7d` | `number` (required) | `(number \| null)?` | not set by home board inline mappers |
| `marketCapDeltaPct7d` | `number` (required) | `(number \| null)?` | not set by home board inline mappers |
| `deltaWindow` | `"7d"` (required) | `"7d"?` | not set by home board inline mappers |
| `rankDelta1d` | `number` (required) | `(number \| null)?` | not set by home board inline mappers |
| `highMarketCap52w` | `number \| null` (required) | `(number \| null)?` | not set by home board inline mappers |

`ComplexDetail.rankDelta7d` is left as `number` — `mapComplexDetailRow` uses
`toNumber(..., 0)` which always returns a number. The detail type is always
produced by the mapper, never by the home board inline path.

### Consumer fixes (TypeScript now requires guards)

**`RankingCard.tsx`**
- Inlined `typeof item.rankDelta7d === "number"` directly in `isUp` / `isDown` so
  TypeScript can narrow within the `&&` chain (assignment-through-boolean does not
  preserve narrowing in TypeScript strict mode).
- Added `?? 0` in template literal display positions.

**`TopMovers.tsx`**
- `.sort((a, b) => (b.rankDelta7d ?? 0) - (a.rankDelta7d ?? 0))`
- `Math.abs(item.rankDelta7d ?? 0)`

**`MarketHeatmap.tsx`**
- Local anonymous Map type: `leadItemDelta: number | null`
- `formatSignedDelta(value: number | null)` — added `null` early return.
- Arithmetic guards: `current.totalDelta += (item.rankDelta7d ?? 0)`,
  `Math.abs(item.rankDelta7d ?? 0) > Math.abs(current.leadItemDelta ?? 0)`

**`ComplexDetailSheet.tsx`**
- `formatRankDelta(rankDelta7d ?? 0)` at call sites
- `formatPercent(marketCapDeltaPct7d ?? 0)` at call sites
- `formatSignedNumber(marketCapDelta7d ?? 0)` at call site

---

## Why runtime behavior is unchanged

All consumers were already guarding defensively at runtime:

- `RankingCard` gated display on `typeof item.rankDelta7d === "number"` — unaffected.
- `TopMovers` filtered on `i.rankDelta7d > 0 / < 0` — `null > 0` is `false` in JS,
  so null items were already excluded. Sort `?? 0` only fires for null, same sort
  position as they already had.
- `MarketHeatmap` arithmetic: JS coerces `null` to `0` in `+= null`, so `?? 0` is
  a type-only guard that produces identical output.
- `ComplexDetailSheet` format helpers: all tested `delta > 0 / < 0` which evaluate
  `false` for `null` in JS, so `?? 0` produces the same `"— 0"` / `"0.00%"` output.

No rendered value changes. No API shape changes.

---

## Build result

```
npm run build → exit 0
✓ TypeScript: Finished TypeScript in 2.5s (no errors)
✓ 5/5 static pages generated
All routes compiled successfully.
```

---

## Files changed this pass

- `src/lib/koaptix/types.ts`
- `src/components/home/RankingCard.tsx`
- `src/components/home/TopMovers.tsx`
- `src/components/home/MarketHeatmap.tsx`
- `src/components/home/ComplexDetailSheet.tsx`
- `docs/KOAPTIX_TYPE_CONTRACT_STABILIZATION.md` (this file)

Files from previous passes (unchanged this pass):
- `src/app/api/rankings/route.ts`
- `src/app/api/map/route.ts`
- `src/app/api/search/route.ts`
