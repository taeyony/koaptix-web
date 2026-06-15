# Index Base-Date Public Language

Lane: `P-KOAPTIX-OFFICIAL-INDEX-V1-POLICY-DOCS.0`

## Website-Safe Wording
KOAPTIX's long-term official Genesis Base is `2024-01-01 = 1000`. Current expansion indexes may still show interim or legacy base-date series while the historical data chain is being verified.

Do not say that every current index already starts from `2024-01-01`. Say that KOAPTIX is moving toward a unified official normalized base after historical coverage and reconstruction are verified.

## Dashboard Tooltip Wording
Official target base: `2024-01-01 = 1000`.

Some current series may use interim or legacy base dates during buildout. Indexes with different base dates should be read as separate series.

## Methodology Page Wording
KOAPTIX Index is calculated as `base_value * current_total_market_cap / base_market_cap`. For Official Index v1, the target base date is fixed at `2024-01-01` and the target base value is fixed at `1000`.

The current database contains transitional series. `KOREA_ALL` and `SEOUL_ALL` currently preserve `2024-07-31` legacy long-history artifacts. Several macro expansion series currently use `2026-04-01` as an interim public expansion state. These are not the official Genesis Base.

Full implementation of the `2024-01-01` Genesis Base requires 2023 historical raw trade coverage, canonical match/clean processing, representative price reconstruction, market-cap reconstruction, eligibility, rank/index reconstruction, and source-of-truth verification.

## Korean Non-Developer Explanation
KOAPTIX의 장기 공식 지수 기준점은 `2024년 1월 1일 = 1000`입니다.

현재 일부 지수는 과도기 또는 legacy 기준일을 사용할 수 있으며, 서로 다른 기준일의 지수는 같은 출발점으로 비교하지 않습니다.

`2024년 1월 1일` 기준 공식 지수는 과거 실거래 데이터와 표준 산정 체인의 검증이 끝난 뒤 단계적으로 적용됩니다.

현재 DB에 있는 `2026년 4월 1일` 기준 지수는 임시 확장 상태로만 보고, `2024년 7월 31일` 기준 KOREA/SEOUL 지수는 legacy 장기 이력 자료로만 보존합니다.

## English Product Wording
- "KOAPTIX's long-term official Genesis Base is 2024-01-01 = 1000."
- "During buildout, some expansion or legacy series may use different base dates."
- "Indexes with different base dates should be read as separate series."
- "The 2024-01-01 official base will be applied after the historical trade and market-cap chain is verified."

## Terms To Avoid
- "COVID ended"
- "All indexes already start from 2024-01-01"
- "2026-04-01 official Genesis"
- "2024-07-31 final official base"
- "Rank and index are the same"
- "One trade price index"
