# KOAPTIX Market-Cap Index Methodology

## Status

- Document status: `CTO_METHOD_BACKBONE_DOC`
- Lane: `P-KOAPTIX-METHODOLOGY-ACADEMIC-BACKBONE-DOCS.0`
- Scope: methodology documentation only
- Persistent DB write: `NO`
- Helper/materializer execution: `NO`
- Source code modification: `NO`
- Commit/push/deploy: `NO`
- Official target base: `2024-01-01 = 1000`

## Core Definition

KOAPTIX ranks apartment complexes by estimated capitalized housing value.

At the complex level, KOAPTIX estimates market capitalization by calculating representative price by `complex_id + area_cluster_id`, multiplying that representative price by the household count for the same area cluster, and summing those values across eligible area clusters.

In simplified form:

```text
apartment_complex_market_cap
  = sum(representative_price_by_complex_area_cluster
        * household_count_by_complex_area_cluster)
```

For universe-level index calculation, KOAPTIX aggregates eligible complex market caps within the selected universe and normalizes the aggregate value against a fixed base.

```text
KOAPTIX Index
  = base_value * current_total_market_cap / base_market_cap
```

For KOAPTIX Official Index v1, the official target base is:

```text
2024-01-01 = 1000
```

This target base must not be marketed as fully implemented for every live series until the historical data chain, market-cap snapshots, eligibility snapshots, and rank/index snapshots have been verified and written through approved lanes.

## Academic Positioning

Traditional residential property price indices, or RPPIs, primarily track price movements. Their central purpose is to measure how residential property prices change over time, usually with quality adjustment or repeat-sales, hedonic, stratification, or mix-adjustment methods.

Market-cap weighted equity indices track market-value-weighted asset performance. Their central purpose is not to average the price of one share, but to measure the aggregate value movement of a defined basket, weighted by the market value of its constituents.

KOAPTIX sits between these traditions. It is a real-estate asset-value index using complex-level estimated market cap. It is not a conventional RPPI, and it is not an equity index. It borrows the asset-scale intuition of market-cap weighting and applies it to apartment complexes using real-estate price material and household counts.

## Price Index, Asset-Value Index, And Transaction-Flow Indicators

### Price Index

A price index tracks price movement. It asks: how much did comparable housing prices rise or fall?

Useful examples include official residential property price indices and private housing price indices. These are important benchmarks, and KOAPTIX is designed to complement them, not replace them.

### Market-Cap / Asset-Value Index

A market-cap or asset-value index tracks estimated aggregate asset value. It asks: how did the capitalized value of a housing stock change after accounting for both price and scale?

KOAPTIX belongs in this category. A small expensive unit should not dominate the index by price alone if the asset base represented by that unit type is small. Conversely, a large complex or area cluster with many households deserves more capital weight because more residential asset value is attached to that segment.

### Transaction-Flow Indicators

Transaction-flow indicators track actual market activity. They ask: how much value actually traded, how many units traded, and how quickly the stock turned over?

Actual transaction flow should later be measured separately using transaction value, volume, and turnover. KOAPTIX market cap is a stock measure of estimated residential asset value, not a direct measure of cash movement.

## Official Language

Use the following wording in methodology, product, investor, and website materials:

- "KOAPTIX tracks capitalized housing value flow."
- "Capital flow" means change and redistribution in estimated housing asset value, not literal cash movement.
- KOAPTIX estimates "estimated residential asset value."
- KOAPTIX provides "apartment complex market-cap ranking."
- KOAPTIX complements, not replaces, traditional housing price indices.

The phrase "capitalized housing value flow" means that KOAPTIX follows how estimated housing asset value moves across complexes, regions, and universes over time. It does not mean that all of that value has actually traded in cash.

## Why The Concept Is Valid

KOAPTIX is valid as an index concept because apartment housing is both a consumption good and a major household asset. Housing price changes alter household balance sheets, regional wealth distribution, collateral value, and perceived purchasing power. A price-only index captures price movement, but it does not fully express the capital scale attached to each complex or region.

By combining representative price and household count, KOAPTIX converts price evidence into an estimated stock of residential asset value. This allows KOAPTIX to rank complexes and aggregate universes by estimated capitalized housing value, similar in spirit to how market-cap weighted financial indices aggregate listed companies by market value.

This does not prove that KOAPTIX is a perfect valuation model. It means the methodology has a coherent economic interpretation: it is an estimated residential asset-value framework based on observed price material, household scale, eligibility rules, and universe aggregation.

## Strengths

- Captures asset scale instead of price alone.
- Avoids small expensive units dominating by price alone.
- Gives complexes and regions capital weight according to estimated residential asset value.
- Supports apartment complex market-cap ranking.
- Supports universe-level index calculation.
- Creates a bridge between property price evidence and housing wealth interpretation.
- Provides a practical way to compare the relative size and movement of housing value across complexes and regions.

## Data-Quality Rules

KOAPTIX market-cap calculation must preserve the approved quality rules:

- Representative price is calculated by `complex_id + area_cluster_id`.
- Representative price uses recent 12-month valid trades.
- The latest 3 valid trades rule must be preserved.
- One trade is not enough for final public-quality representative pricing unless a separate approved exception policy exists.
- Insufficient price material means the area cluster or complex should be excluded, held, or flagged according to eligibility rules.
- Confidence, coverage, recency, and liquidity indicators sit beside `market_cap_krw`; they should not be silently mixed into the raw market-cap number.
- Market cap is an estimated capital scale, not liquidation value, official appraisal value, or guaranteed executable sale price.

## Limitations

- Housing is illiquid.
- Transactions are sparse.
- Price estimates can be noisy.
- Area, floor, age, view, maintenance, renovation, school-zone, and quality differences remain.
- Market cap is a stock measure, not cash flow.
- KOAPTIX does not prove literal money flow.
- KOAPTIX does not make official KB, REB, or other housing price indices wrong.
- The latest-3 rule must be preserved to avoid one-trade overreaction.
- Insufficient price material means exclude, hold, or flag rather than forcing a ranking.
- The official target base `2024-01-01 = 1000` must not be described as already implemented for every index until the approved implementation chain is complete.

## Reference Anchors

KOAPTIX should be explained as drawing from, but not identical to, the following methodological traditions:

- Market-cap weighted financial index logic: aggregate constituent value is weighted by market value rather than by a simple average of unit prices.
- Residential property price index methodology: RPPIs measure housing price movement and require care around quality, mix, geography, and transaction sparsity.
- Housing wealth and wealth-effect literature: residential property value changes matter because housing is a major household balance-sheet asset.
- KOAPTIX data-quality rules: representative pricing, latest-3 material, household-count scaling, eligibility gates, and universe aggregation define the practical methodology.

## Approved Public Explanation

English:

> KOAPTIX estimates apartment complex market capitalization by combining representative housing prices with household counts. It tracks capitalized housing value flow, meaning changes and redistribution in estimated residential asset value, not literal cash movement. KOAPTIX complements traditional housing price indices by adding an asset-scale view of apartment complexes and regions.

Korean:

> KOAPTIX는 대표 가격과 세대수를 결합해 아파트 단지의 추정 시가총액을 산정합니다. KOAPTIX가 말하는 자본 흐름은 실제 현금 이동이 아니라, 주거 자산 가치가 단지와 지역 사이에서 어떻게 변화하고 재배분되는지를 뜻하는 capitalized housing value flow입니다. KOAPTIX는 기존 주택가격지수를 대체하는 것이 아니라, 단지와 지역의 자산 규모 관점을 보완합니다.

## Do-Not-Say List

- Do not say market cap is perfect.
- Do not say KOAPTIX proves actual money flow.
- Do not say existing KB, REB, or other housing price indices are wrong.
- Do not say CAPM or EMH proves KOAPTIX mathematically.
- Do not say one trade is enough.
- Do not say all indexes already start at `2024-01-01` unless implemented and verified.
- Do not say market cap is liquidation value.
- Do not say market cap is official appraisal value.
- Do not say KOAPTIX ranks legal value or taxable value.

## Recommended Next Work

Recommended next lane:

`P-KOAPTIX-METHODOLOGY-PUBLIC-COPY-INTEGRATION-PLAN.0`

Purpose: decide where the approved public language should be inserted in website, investor, and methodology surfaces without changing product copy in this documentation-only lane.
