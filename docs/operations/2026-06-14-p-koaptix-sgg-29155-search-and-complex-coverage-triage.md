# SGG_29155 Search And Complex Coverage Triage

- marker: `SGG_29155_SEARCH_AND_COMPLEX_COVERAGE_TRIAGE`
- lane: `P-KOAPTIX-SGG_29155-SEARCH-AND-COMPLEX-COVERAGE-TRIAGE.0`
- status: read-only triage complete
- target universe: `SGG_29155`
- target label: `광주광역시 남구`
- source-of-truth path: `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`

## 1. Document Status

This is a read-only triage report.

It is not a source patch approval, not DB write approval, not helper/materializer approval, and not commit/push/deploy approval.

## 2. One-Line Conclusion

Both issues are real but separate: `남구` search ambiguity is a Command Palette matching/scoring/display UX issue, while `새한아파트` / `진월동` absence is a data coverage pipeline gap. Release completion should wait until CTO chooses whether to fix search UX first, plan `새한` coverage closure, or explicitly release with these known limitations.

## 3. User-Observed Issues

- `남구` Command Palette search mixes multiple `남구` regions and also matches `강남구`.
- Region result cards can display short labels such as `남구`, making different cities hard to distinguish.
- User expects `새한아파트` in `광주광역시 남구 진월동` around roughly 1,000억 market-cap range, but it does not appear in `SGG_29155` ranking.
- User wants dong-level search such as `진월동` to be useful without creating a new dong universe.

## 4. Repo/Source Inspection Summary

Inspected source files:

- `src/components/home/CommandPalette.tsx`
- `src/lib/koaptix/universes.ts`
- `src/app/api/search/route.ts`
- `src/app/api/rankings/route.ts`
- `src/app/api/ranking/route.ts`
- `src/app/ranking/page.tsx`
- `src/components/home/RankingBoardClient.tsx`
- `src/components/home/RankingCard.tsx`
- `src/lib/formatters.ts`

### Command Palette Matching Root Cause

`CommandPalette` normalizes region labels by trimming, lowercasing, and removing whitespace. Region candidates are selected with:

- registry-driven `getSearchUniverseRegistry()`
- `scope === "SIGUNGU"`
- generated terms from label, no-space label, administrative-short label, no-space administrative-short label, and code
- `term.includes(normalizedQuery)`
- then `.slice(0, MAX_REGION_SEARCH_RESULTS)` where max is 4

Because matching is substring-based and has no token boundary or exact-match priority, query `남구` matches `강남구`.

Observed local source simulation:

| query | matching result order before UI slice |
| --- | --- |
| `남구` | `SGG_11680 강남구`, `SGG_31140 남구`, `SGG_26290 남구`, `SGG_27200 남구`, `SGG_29155 광주광역시 남구` |
| `광주 남구` | `SGG_29155 광주광역시 남구` |
| `강남구` | `SGG_11680 강남구` |

Since the UI slices to 4 region results, `SGG_29155` can be hidden for bare `남구`.

### Region Shortcut Display Ambiguity

Region cards display `result.label`. Several existing SGG registry labels are just `남구`, so the card can be visually ambiguous. `SGG_29155` uses full label `광주광역시 남구`, but it can be pushed beyond the visible 4-item region result limit for bare `남구`.

### Ranking/Search Route Dong Capability

`/api/search` filters local source items by:

- complex name
- `sigunguName`
- `legalDongName`
- `locationLabel`

`/api/ranking` has similar `q` support through item search text/name/sigungu/legal dong/location label.

`RankingBoardClient` client-side filtering also checks `sigunguName`, `legalDongName`, and `locationLabel`.

Therefore, dong search such as `진월동` is feasible within the current `SGG_29155` universe as a query/filter layer, as long as the target complex already exists in the latest board source.

### Registry Findings

- `SGG_29155` exists.
- Label is `광주광역시 남구`.
- It has no registry alias field.
- `JEONBUK_ALL` and macro universe exposure were not changed in this lane.

## 5. DB Trace Summary For 새한아파트

DB connection status: connected using existing local environment only. Secrets were not printed or written.

Read-only transaction: `BEGIN`; `SET TRANSACTION READ ONLY`; final `ROLLBACK`.

All required DB access below was SELECT-only.

| stage | evidence | result classification | notes |
| --- | --- | --- | --- |
| complex master | `apt_complex` has `complex_id=168776`, `apt_name_ko=새한`, `address_jibun=광주광역시 남구 진월동 281`, `total_household_count=318`, `build_year=1998`, active | PASS | Master complex exists. |
| aliases | `complex_name_alias` has aliases `새한` and `새한아파트` for `complex_id=168776` | PASS | Alias data exists. |
| external IDs | `complex_external_id` has active REB external id for `complex_id=168776` | PASS | External identity exists. |
| region map | `koaptix_complex_region_map` has no row for `complex_id=168776` | MISSING / REGION_MAP_GAP | This likely blocks region-scoped candidate discovery. |
| raw trade | `apt_trade_raw` has 3 rows for `lawd_cd=29155`, `legal_dong_name=진월동`, `apartment_name=새한`, dates `2026-01-21`, `2026-01-24`, `2026-01-27`, prices 2.90억, 3.09억, 4.00억 | PASS | Trade evidence exists. |
| trade match | all 3 raw rows have `match_status=needs_review`, `complex_match_method=no_complex_candidate`, `matched_complex_id=null` | MISSING / TRADE_MATCH_GAP | Raw evidence is not connected to the existing master complex. |
| clean trade | no `apt_trade_clean` rows for the 3 raw rows or candidate complex | MISSING | Cascades from match gap. |
| price snapshot | no `apt_area_cluster_price_snapshot` rows for `complex_id=168776` | PRICE_GAP | Cascades from clean/price pipeline gap. |
| household | no `apt_complex_area_cluster_household` rows for `complex_id=168776` | HOUSEHOLD_GAP | K-apt household matching also has open review evidence. |
| component snapshot | no `apt_market_cap_cluster_component_snapshot` rows | COMPONENT_GAP | No component market cap. |
| market-cap snapshot | no `apt_market_cap_snapshot` rows | MARKET_CAP_GAP | No estimated market cap is available. |
| eligibility | no `complex_eligibility_snapshot` rows | ELIGIBILITY_BLOCK / NOT_CONFIRMED | No eligibility row because upstream evidence is missing. |
| rank snapshot | no `koaptix_rank_snapshot` rows for `SGG_29155` | RANK_SNAPSHOT_GAP | Not ranked. |
| latest board | no `v_koaptix_latest_universe_rank_board_u` row for `SGG_29155` | LATEST_BOARD_GAP | Not served by current board. |
| review queue | open review rows include `K-apt 단지 매칭 필요: 진월새한`, `K-apt 면적정보 매칭 실패: 진월새한`, and `K-apt 단지 자동매칭 실패` | PASS / QUEUED | Existing review queue confirms this is known unresolved matching/household work. |

## 6. Candidate Complex Evidence

| field | value |
| --- | --- |
| complex_id | `168776` |
| name / alias | `새한`, `새한아파트` |
| location | `광주광역시 남구 진월동 281` |
| household count | `318` in `apt_complex.total_household_count` |
| build year | `1998` |
| raw trade evidence | 3 rows in `apt_trade_raw`, latest `2026-01-27`, max trade 4.00억 |
| region mapping | missing in `koaptix_complex_region_map` |
| latest market cap | missing |
| rank snapshot status | missing for `SGG_29155` |
| latest board status | missing for `SGG_29155` |
| likely root cause | region map + trade match gap, cascading into price/household/component/market-cap/eligibility/rank/latest-board gaps |

The user's expectation is directionally plausible: the complex exists and has 318 households plus observed 2026 trades. But it is not rank-ready today because it is not connected through the canonical ranking pipeline.

## 7. SGG_29155 Coverage Sanity

Latest board sanity:

- latest board row_count: `76`
- latest board latest_date: `2026-06-14`
- rank range: `1..76`
- rank snapshot total rows for `SGG_29155`: `5,244`
- rank snapshot latest_date: `2026-06-14`

Top evidence:

- rank 1: `포스코더샵`, `complex_id=168923`, market_cap_krw `1,265,400,000,000`, `봉선동`
- rank 2: `쌍용스윗닷홈`, market_cap_krw `607,750,000,000`, `봉선동`
- rank 3: `효천시티프라디움`, market_cap_krw `535,440,000,000`, `임암동`

Bottom evidence:

- rank 76: `백운맨션`, market_cap_krw `1,007,000,000`, `백운동`
- rank 75: `삼우`, market_cap_krw `2,590,000,000`, `월산동`
- rank 72: `진월동양지바른아파트101동`, market_cap_krw `9,773,000,000`, `진월동`

Dong coverage in latest board:

| dong | count |
| --- | ---: |
| 진월동 | 17 |
| 봉선동 | 14 |
| 주월동 | 10 |
| 백운동 | 7 |
| 방림동 | 6 |

`진월동` is represented in the latest board, so the absence of `새한` is not a whole-dong coverage failure. It is specific to the `새한` complex pipeline.

## 8. Search Ambiguity Diagnosis

### Why `남구` Shows `강남구`

`강남구` contains `남구` as a substring. Current matching uses `term.includes(normalizedQuery)`, so `남구` matches `강남구`.

### Why Cards Are Ambiguous

Some registry labels are short labels like `남구`. When result cards display only `label`, users cannot distinguish `울산 남구`, `부산 남구`, `대구 남구`, etc. `광주광역시 남구` is full-label, but bare `남구` can exclude it because the result cap is 4 and ordering is registry order.

### Safer Future Matching Rule

Recommended future behavior:

- exact code/label/alias match first
- administrative-short exact match next
- multi-token match such as `광주 남구` should strongly prioritize `SGG_29155`
- token-boundary or administrative component match should replace arbitrary substring for short names
- bare `남구` should match actual `남구` regions but should not match `강남구`
- `강남구` should still match `SGG_11680`

### Safer Future Display Rule

Ambiguous SIGUNGU region results should display full administrative context, for example:

- `광주광역시 남구`
- `울산광역시 남구`
- `부산광역시 남구`
- `대구광역시 남구`

This can likely be handled in `CommandPalette.tsx` with a small region scoring/display patch, but registry label policy may also need cleanup if full labels are desired everywhere.

## 9. Dong-Level Search Feasibility

Current support level:

- Latest board/API already include `legal_dong_name`.
- `/api/search` searches `legalDongName` and `locationLabel`.
- `/api/ranking` searches `legalDongName` and `locationLabel`.
- `RankingBoardClient` client filter searches `legalDongName` and `locationLabel`.

Safe product direction:

- Do not create dong-level universes at this stage.
- Keep `SGG_29155` as the universe.
- Support dong search as query/filter:
  - `/ranking?universe=SGG_29155&q=진월동`
  - `/api/search?universe=SGG_29155&q=진월동`
- Command Palette can later guide combined queries such as `광주 남구 진월동` into `SGG_29155` ranking search if desired.

Limit:

- Dong-level search only finds complexes that are already in the latest board/search source. It will not find `새한` until the coverage gap is closed.

## 10. Recommended Next Lane

Recommended split:

1. `P-KOAPTIX-COMMAND-PALETTE-ADMIN-SEARCH-SCORING-PATCH.0` code-planning/patch lane
   - fix `남구` vs `강남구` substring issue
   - ensure full administrative label display for ambiguous region cards
   - prioritize `광주 남구` to `SGG_29155`

2. `P-KOAPTIX-SGG_29155-SAEHAN-COVERAGE-GAP-CLOSURE-PLAN.0` read-only/hashlock planning lane
   - plan region-map repair for `complex_id=168776`
   - plan safe trade-match closure for raw `새한` trades
   - plan household/component/market-cap/eligibility/rank/latest-board path
   - keep all DB writes behind separate approval gates

3. Optional later: `P-KOAPTIX-DONG-LEVEL-SEARCH-READINESS-PLAN.0`
   - only if product wants Command Palette to convert dong queries into ranking-page q filters

Do not proceed to completion note until CTO decides whether the known search ambiguity and `새한` coverage gap should block release completion.

## 11. Explicit Do-Not-Run List

Confirmed not run:

- no DB write
- no helper/materializer/latest-board execution
- no source patch
- no registry change
- no `JEONBUK_ALL` exposure
- no production smoke
- no deploy
- no git add/commit/push

## 12. Non-Developer Korean Summary

`남구` 검색은 지금 너무 넓게 잡히는 문제가 있습니다. 단순히 글자가 포함되는지만 보기 때문에 `강남구`도 같이 나오고, 여러 도시의 `남구`가 같은 이름으로 보여 사용자가 구분하기 어렵습니다.

`새한아파트`는 데이터가 아예 없는 것은 아닙니다. `광주광역시 남구 진월동 281`의 `새한` 단지는 원장에 있고, 2026년 1월 거래도 3건 있습니다. 하지만 지역 매핑과 거래-단지 자동 매칭이 끊겨 있어서 가격, 세대 구성, 시가총액, 순위, 최신 보드까지 이어지지 못했습니다.

`진월동` 검색은 새 universe를 만들기보다 `SGG_29155` 안에서 검색 필터로 확장하는 방향이 안전합니다. 다만 `새한`은 현재 최신 보드에 없기 때문에, 검색 UX만 고쳐서는 나타나지 않고 별도 coverage gap closure 계획이 필요합니다.
