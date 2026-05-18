# KOAPTIX Smoke Checklist

**Version:** Service-layer stabilization pass
**Date:** 2026-05-18
**Audience:** Engineer or operator verifying pre-deployment readiness

---

## What this checklist covers

This checklist verifies that KOAPTIX's delivery layer is stable and user-facing
components behave correctly under normal load and degraded/slow conditions.

**It does not cover:**
- DB writes
- Market-cap or rank/index generation
- Universe opening
- Household recovery
- Any admin or mutation path

---

## 0. Pre-flight

### Build gate (mandatory)

```bash
npm run build
```

Expected: exit 0, no TypeScript errors, all 5+ pages generated.

### HTTP smoke gate (if a server is running)

```bash
# Against local dev server
npm run dev   # starts on :3000 by default
node scripts/smoke-koaptix-delivery.mjs

# Against a different URL
KOAPTIX_SMOKE_BASE_URL=https://your-staging-url.vercel.app \
  node scripts/smoke-koaptix-delivery.mjs
```

Expected output: `RESULT: PASS` or `RESULT: DEGRADED` (degraded is acceptable if
DB is unavailable in the test env — the delivery structure must still be sound).

`RESULT: FAIL` = blocking issue; do not promote.

---

## 1. Home Initial Load

**URL:** `http://localhost:3000/` (or staging URL)

**Steps:**
1. Open the URL in Chrome/Edge with DevTools → Network tab open.
2. Observe the initial page response.

**Expected:**
- Page renders within ~3 s on warm server.
- No visible "Supabase error" or crash.
- The KOAPTIX 500 heading is visible.
- The ranking board shows a "Syncing..." badge initially (KOREA_ALL returns an
  empty SSR seed — intentional).
- Within a few seconds, the board populates from `/api/rankings`.

**DevTools check:**
- In Network tab, filter by `/api/rankings`.
- You should see one XHR/fetch request to `/api/rankings?universe_code=KOREA_ALL`.
- Response should be JSON with `ok: true` and `items: [...]`.

**PASS condition:** Page renders without crash; board eventually shows data or
shows a structured error message if API is degraded.

**HOLD condition:** Page shows a 500 error, blank white screen, or React
uncaught exception boundary.

---

## 2. Ranking Board Client Hydration

**URL:** `http://localhost:3000/`

**Steps:**
1. Open home page.
2. Open DevTools → Elements tab.
3. Find the element with `data-testid="ranking-board"`.
4. Observe the `data-board-delivery-state` attribute.

**Expected attribute lifecycle:**

```
loading   →   ready      (normal API response)
loading   →   degraded   (timeout or API error after 7s)
```

**PASS condition:**
- `data-board-delivery-state` changes from `loading` to `ready` once
  `/api/rankings` responds.
- If API is slow, attribute changes to `degraded` within ~7 s and an error
  message appears in the board (not a blank spin).

**HOLD condition:** Attribute stays `loading` indefinitely.

---

## 3. Regional Universe Transition

**Steps:**
1. Open home page.
2. Find the universe selector in the ranking board (e.g. "서울특별시" button).
3. Click a regional universe (e.g. SEOUL_ALL / 서울특별시).

**Expected:**
- Board shows "Syncing..." badge briefly.
- `data-board-delivery-state` changes: `loading` → `ready` or `stale-while-syncing` → `ready`.
- Board items update to reflect the selected region.
- URL updates to include `?universe=SEOUL_ALL`.

**PASS condition:** Universe transitions without crash; board updates or shows
structured degraded state.

**HOLD condition:** Board freezes, throws uncaught error, or never exits loading.

---

## 4. NeonMap Fallback Verification

**URL:** `http://localhost:3000/`

**Steps:**
1. Open home page.
2. Find the element with `data-testid="neon-map"`.
3. Observe `data-map-fallback-mode` attribute.

**Expected on normal load:**
- `data-map-fallback-mode="none"` after `/api/map` responds with live data.
- Map bubbles visible for district aggregates.

**Expected on throttled/degraded load (optional):**
- `data-map-fallback-mode="client-timeout-fallback"` if `/api/map` timed out.
- Map still shows district bubbles from board-seed aggregate data.

**PASS condition:** Map renders with bubbles (either API data or board-seed
fallback). No infinite spinner on the map section.

**HOLD condition:** Map shows only an error message with no bubbles, or JS crash.

---

## 5. Search (Command Palette)

**Steps:**
1. Click the "단지·지역 검색" button at the bottom-right of the home page.
2. Type `강남` (2+ chars) into the search input.
3. Wait 300ms for debounce.

**Expected:**
- Local board items appear as suggestions.
- After API call, `localItems` and/or `globalItems` populate.
- No crash, even if API returns empty results.

**PASS condition:** Search results appear (or empty-state message), no crash.

**HOLD condition:** Page crashes, JS exception, or search spinner stuck
indefinitely.

**Note:** The search client does not currently have a wall-clock AbortController
timeout. If `/api/search` is very slow, the "검색 중..." spinner may appear for
longer than expected. This is documented as a known remaining risk.

---

## 6. Timeout Simulation (Optional — Requires DevTools)

> This step simulates a cold Supabase cold-path for client-fetch timeout
> verification. Skip if not needed for this smoke cycle.

**Tool:** Chrome DevTools → Network → Throttling dropdown

**Steps:**
1. Open DevTools → Network.
2. Select `Slow 3G` or use "Request Blocking" to block `/api/rankings`.
3. Reload home page or switch universe.
4. Wait approximately 7 seconds.

**Expected:**
- Ranking board shows `"Ranking request timed out"` error message.
- `data-board-delivery-state` attribute = `"degraded"`.
- `isBoardLoading` ends (no infinite spinner).
- Map may show `data-map-fallback-mode="client-timeout-fallback"` if `/api/map`
  is also blocked.

**PASS condition:** Boards degrade gracefully within ~7 s; no crash; no infinite
spinner.

**HOLD condition:** Boards spin indefinitely past 15 s with no error shown.

---

## 7. Things NOT to Test in This Smoke

Do not perform any of the following during smoke testing:

| Action | Reason |
|---|---|
| Inserting or updating rows in any Supabase table | Prohibited in this phase |
| Running `run_snapshot_market_cap.py` | Prohibited — no data generation |
| Running `run_snapshot_rank_index.py` | Prohibited — no data generation |
| Opening a new universe (SGG, GANGWON_ALL, etc.) | Prohibited until data is ready |
| Running `npm run lint` | HOLD — no safe Next 16 ESLint config |
| Triggering batch-32 | Prohibited |
| Testing household recovery | Phase archived |

---

## 8. PASS / HOLD Decision Table

| Check | Result | Notes |
|---|---|---|
| `npm run build` | `PASS` / `HOLD` | Must be PASS before any promotion |
| HTTP smoke gate | `PASS` / `DEGRADED` / `FAIL` | DEGRADED is acceptable; FAIL is blocking |
| Home initial load | `PASS` / `HOLD` | |
| Board client hydration | `PASS` / `HOLD` | |
| Universe transition | `PASS` / `HOLD` | |
| NeonMap fallback | `PASS` / `HOLD` | |
| Search | `PASS` / `HOLD` | |
| Timeout simulation | `PASS` / `HOLD` / `SKIP` | Optional for this cycle |

**Promotion readiness:** All mandatory rows must be `PASS` or acceptable
`DEGRADED` before staging/production promotion.

---

## 9. Quick Reference — HTTP API Contracts

### `/api/rankings`

```
GET /api/rankings?universe_code=KOREA_ALL&limit=8
Response: { ok: true, universeCode, count, items: RankingItem[] }
Degraded: { ok: false, universeCode, count: 0, items: [], message }
```

### `/api/map`

```
GET /api/map?universe_code=KOREA_ALL&limit=32
Response: { ok: true, universeCode, count, items: DistrictAggregate[],
            renderedUniverseCode, fallbackMode, source }
Degraded: { ok: false, universeCode, count: 0, items: [], message }
```

### `/api/search`

```
GET /api/search?q=강남&universe_code=KOREA_ALL&limit=12
Response: { ok: true, universeCode, localItems: RankingItem[], globalItems: RankingItem[] }
Degraded: { ok: true, universeCode, localItems: [], globalItems: [] }
```

---

## 10. Known Remaining Risks

| Risk | Status |
|---|---|
| `/api/search` client-side timeout | Not yet guarded — next step |
| ESLint setup | HOLD — `npm run build` is the code gate |
| Browser smoke | Manual only — no automated Playwright/Cypress |
| Cold Supabase on fresh deploy | SSR bounded to 4s; client fetch to 7s |
