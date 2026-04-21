# KOAPTIX Regional Identity Smoke Test

## Product Policy

Regional index cards preserve requested universe identity. When regional history
is sparse or still building, the card should keep the requested universe label
and render History Building or an empty-history state. It must not silently
switch to KOREA_ALL fallback data.

## Local Automated Smoke

Start the app locally, then run:

```bash
npm run smoke:regional
```

The fetch/HTML smoke validates:

- home regional URL state
- current universe identity
- `/api/map`
- `/api/rankings`
- `/api/search`
- `/ranking`
- MarketChartCard requested/rendered universe identity

For browser-level interaction smoke:

```bash
npm run smoke:browser
```

The browser smoke validates real navigation and UI interaction:

- home entry to KOREA_ALL
- macro universe click round trip
- SGG sample click transitions
- TOP1000 deep link and detail sheet close
- Command Palette regional selection

To test a different local origin:

```bash
KOAPTIX_SMOKE_BASE_URL=http://localhost:3001 npm run smoke:regional
```

## Macro Round Trip

The required macro route is:

```text
BUSAN_ALL -> ULSAN_ALL -> GWANGJU_ALL -> DAEJEON_ALL -> BUSAN_ALL
```

The final BUSAN_ALL return must not reuse ULSAN, GWANGJU, DAEJEON, or KOREA_ALL
chart/board identity.

## SGG Smoke Coverage

`npm run smoke:regional` includes these SGG samples:

- `SGG_11710`
- `SGG_41135`
- `SGG_11110`
- `SGG_11140`
- `SGG_11215`
- `SGG_11260`
- `SGG_11305`
- `SGG_11320`

`npm run smoke:browser` clicks these SGG samples:

- `SGG_11110`
- `SGG_11140`
- `SGG_11260`
- `SGG_11305`

## Identity Checks

For every smoke stop, verify:

1. URL
   - Expected: `?universe=<EXPECTED_CODE>` for regional universes.

2. Current Universe
   - Expected: visible label matches the expected universe.
   - It must not show the previous universe.

3. NeonMap
   - Expected: map identity and bubbles belong to the expected universe.
   - Previous-region coordinate cache must not be reused.

4. MarketChartCard
   - Expected: title/chip/history state belongs to the expected universe.
   - Sparse data should show History Building or empty state for the same
     universe.

5. Rankings
   - Expected: rows and active filters belong to the expected universe.
   - No stale previous-region rows, permanent empty state, or visible request
     error.

6. Search and TOP1000
   - Expected: `/api/search` prioritizes current-universe local items.
   - Expected: regional smoke keeps `globalItems` empty so global fallback does
     not become the primary regional path again.
   - Expected: `/ranking?universe=<EXPECTED_CODE>` keeps TOP1000 identity.

## Failure Message Format

Use this format when reporting a regression:

```text
[REGIONAL_IDENTITY_SMOKE_FAIL]
step=<BUSAN_ALL|ULSAN_ALL|GWANGJU_ALL|DAEJEON_ALL|BUSAN_ALL_RETURN|...>
expected_universe=<CODE>
url_universe=<CODE_OR_EMPTY>
current_universe_label=<VISIBLE_LABEL>
map_identity=<OK|STALE|EMPTY|UNKNOWN>
chart_requested=<CODE_OR_VISIBLE_TEXT>
chart_rendered=<CODE_OR_VISIBLE_TEXT>
rankings_identity=<OK|STALE|EMPTY|ERROR>
visible_error=<TEXT_OR_NONE>
notes=<SHORT_DESCRIPTION>
```

## Manual Coverage Still Worth Checking

- Visual chart polish on narrow mobile widths.
- Tooltip and hover behavior around dense map bubbles.
- A real user click path from home ranking row to detail sheet and back.
- Browser-specific behavior if Chrome/Edge DevTools Protocol is unavailable.

## Related Gate

For SGG exposure work, run:

```bash
npm run gate:sgg
```

Gate failures should be classified as blocking or advisory before rollback.
