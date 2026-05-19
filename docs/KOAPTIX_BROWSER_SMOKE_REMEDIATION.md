# KOAPTIX Browser Smoke Remediation

**Date:** 2026-05-19
**Triggered by:** Manual browser smoke failure on `127.0.0.1:3000`
**Status:** PASS_BROWSER_SMOKE_REMEDIATION_BUILD_AND_DUAL_SMOKE_PASS

---

## Summary of Findings

Two issues were identified during manual browser smoke. Both have been root-caused.
One was fixed in code (minimal safe change). One requires an operator action outside
the codebase.

---

## Finding 1 — "강남" Board Search Returns 0 Results

### Root cause

The `"단지명·지역명 검색"` input in `RankingBoardClient` is a **local in-memory
filter** of the currently loaded board items — typically the top 8–20 complexes
by market cap for the selected universe.

For `KOREA_ALL`, the top 8 complexes are the highest market-cap apartments
nationally (e.g. 반포자이, 아크로리버파크, 잠실 엘스 등). None of these are
named "강남" — they are located *in* Gangnam-gu but their unit names do not
contain the string "강남".

The HTTP smoke `/api/search?q=강남` correctly returned 12 results because it
queries the full database via Supabase text search. However, the board's search
input does not call `/api/search` — it only filters the ~8 items already in
`boardItems`.

**This was a UX contract mismatch**: the placeholder "단지명·지역명 검색"
implied a global database search, but it was performing a local board filter.

### Fix applied

**`src/components/home/RankingBoardClient.tsx`** — two minimal changes:

1. **Placeholder text** updated from `"단지명·지역명 검색"` to
   `"보드 내 단지·지역 필터"` — makes clear this is a local board filter.

2. **Zero-result empty state** when `searchQuery` is active and `boardItems`
   are loaded: the empty state now shows a specific message
   `"현재 보드에 일치하는 단지가 없습니다."` plus a hint
   `"더 넓은 검색은 화면 우하단 단지·지역 검색을 이용하세요."` pointing to
   the global `CommandPalette` search button that already exists.

No API changes. No new dependencies. No UI redesign.

### Fix B — Future Work

A broader fix would fall back to `/api/search` when the local filter returns 0
and `query.length >= 2`. This requires adding a second fetch path and result
state to `RankingBoardClient`. Deferred to a dedicated UX pass.

---

## Finding 2 — NeonMap Blank on `127.0.0.1:3000`

### Root cause

**Kakao Maps API key domain registration.**

Kakao Maps SDK (`react-kakao-maps-sdk`) requires that the serving domain is
registered in the Kakao Developers console under "Web Platform" → "Site Domain".

`http://localhost` and `http://127.0.0.1` are different host values. If only
`localhost` is registered, loading the Kakao SDK from `127.0.0.1` will fail with
an authorization error and the map will not render.

This is confirmed by the fact that:
- HTTP smoke against both origins returns identical API data.
- The Supabase API route, rankings, and search all work from 127.0.0.1.
- Only the Kakao-rendered map panel is blank on that origin.

### Fix required — Operator action, not a code change

Add `http://127.0.0.1` to the Kakao API key's allowed domains:

1. Go to [Kakao Developers Console](https://developers.kakao.com/)
2. Select the app that owns the `NEXT_PUBLIC_KAKAO_MAP_API_KEY` key.
3. Navigate to **플랫폼 → Web**.
4. Add `http://127.0.0.1` to the site domain list.
5. Save and wait ~1 minute for propagation.

No code change is possible or needed for this issue. The `NEXT_PUBLIC_KAKAO_MAP_API_KEY`
in `.env.local` must not be modified or printed.

**Workaround during development:** Always use `http://localhost:3000` rather
than `http://127.0.0.1:3000` for local browser testing.

---

## Finding 3 — 127.0.0.1 vs localhost Browser State Difference

### Root cause (expected, not a bug)

The browser treats `http://127.0.0.1:3000` and `http://localhost:3000` as
**different origins** for security isolation purposes. This means:

| Storage | Isolation |
|---|---|
| `localStorage` | Separate per origin |
| `sessionStorage` | Separate per origin |
| Cookies (no `domain=`) | Separate per origin |
| HTTP cache | Separate per origin |

KOAPTIX uses:
- `localStorage` in `useBookmarks` (`koaptix_bookmarks` key) — bookmarks are
  per-origin; fresh origin has no bookmarks.
- `localStorage` in `UniverseSelector` (recent universe history) — empty on new
  origin, `KOREA_ALL` is the default.
- `sessionStorage` in `NeonMap` (geocoded coordinate cache per universe) — empty
  on new origin; re-geocodes on first load.

**None of these cause a blank board.** The board always falls back to client
hydration from `/api/rankings` when the SSR seed is empty. The localStorage
differences only affect bookmarks and recent universe history UI — both
gracefully default to empty/default states.

### Fix required

None. This is expected browser behavior. The code already handles empty
localStorage/sessionStorage correctly (all reads have `try/catch` and safe
defaults).

---

## Dual-Origin API Smoke Results

Both origins tested against the running dev server on port 3000.

| Check | 127.0.0.1:3000 | localhost:3000 |
|---|---|---|
| `GET /` | PASS (2393ms) | PASS (613ms) |
| `GET /api/rankings KOREA_ALL` | PASS count=8 | PASS count=8 |
| `GET /api/map KOREA_ALL` | PASS count=7 fallbackMode=none | PASS count=7 fallbackMode=none |
| `GET /api/search q=강남` | PASS local=12 | PASS local=12 |
| `GET /api/rankings SEOUL_ALL` [optional] | PASS count=20 | PASS count=20 |
| `GET /api/map BUSAN_ALL` [optional] | PASS count=10 | PASS count=10 |

**API layer is identical on both origins.** All browser-smoke differences are
client-side (Kakao SDK domain restriction and per-origin storage isolation).

---

## Code Changes in This Pass

| File | Change |
|---|---|
| `src/components/home/RankingBoardClient.tsx` | Placeholder updated; board-filter zero-result state improved with hint to CommandPalette |

---

## Operator Actions Required Before Staging Promotion

1. Add `http://127.0.0.1` to the Kakao Maps API key site domain list
   (or use only `localhost` for development testing).
2. Complete the manual browser smoke checklist (`docs/KOAPTIX_SMOKE_CHECKLIST.md`)
   using `http://localhost:3000`.
3. Run `npm run smoke:delivery` after any staging/production deployment.

---

## Unchanged Items

- DB source-of-truth chain — unchanged
- KOREA_ALL ranking engine — unchanged
- Universe registry (`universes.ts`) — unchanged
- Market-cap / rank / index generation — none performed
- API response shapes — unchanged
- `.env` files — not touched
