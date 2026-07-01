# KOAPTIX Official Index v1 Base/Basket Convention Note - 2026-07-01

REVIEW_MARKER: P-KOAPTIX-INDEX-BASE-BASKET-CONVENTION-DOCS-NOTE.0

## One-Line Conclusion

KOAPTIX Official Index v1 uses `2024-01-01` as `base_date`, `1000` as `base_value`, and the 151 verified `KOREA_ALL` rank-eligible complexes at `2024-01-01` as the genesis basket. The basket model is `HYBRID_FIXED_GENESIS_BASKET_WITH_GOVERNED_RECONSTITUTION`. Public exposure remains blocked.

## Non-Developer Explanation

랭킹은 개별 아파트 단지의 순서를 보여준다. 예를 들어 어떤 단지가 더 큰 추정 주거 자산가치를 가지는지, 어떤 단지가 특정 시점에 더 높은 순위인지 보여주는 보드다.

지수는 시장의 온도를 보여준다. 개별 단지의 순위표라기보다, 정해진 시장 바구니의 전체 추정 자산가치가 기준일 대비 얼마나 움직였는지를 보여주는 숫자다.

따라서 지수는 나중에 새로운 단지가 데이터 유니버스에 들어왔다는 이유만으로 값이 달라지면 안 된다. 새 단지가 추가될 때마다 지수가 자동으로 뛰거나 내려가면, 사용자는 그것이 실제 시장가치 변화인지 단순한 구성 종목 변경인지 구분하기 어렵다.

그래서 KOAPTIX Official Index v1의 첫 공식 지수 바구니는 `2024-01-01`에 검증된 151개 `KOREA_ALL` 단지로 고정한다. 이 151개 단지는 KOAPTIX 공식 지수의 genesis basket 역할을 한다.

향후 단지가 추가되거나 제외되어야 할 때는 자동 편입하지 않는다. 별도의 승인된 reconstitution, rebase, 또는 chain-link lane에서 구성 변경 사유, 산식 영향, 공개 설명, payload/hash, 검증 결과를 남긴 뒤 반영한다.

## Official Convention

- index_family: `KOAPTIX Official Market-Cap Index v1`
- index_code: `KOAPTIX_KOREA`
- universe_code: `KOREA_ALL`
- base_date: `2024-01-01`
- base_value: `1000`
- base_basket: `The 151 verified KOREA_ALL rank-eligible complexes at 2024-01-01.`
- basket_model: `HYBRID_FIXED_GENESIS_BASKET_WITH_GOVERNED_RECONSTITUTION`
- base_market_cap_definition: `Sum of 2024-01-01 market_cap_krw for the 151 initial constituents after index-eligibility checks.`
- current_market_cap_definition: `Sum of current snapshot market_cap_krw for active basket constituents under the same basket_version.`
- index_formula: `KOAPTIX Index = base_value * (current_market_cap_krw / base_market_cap_krw)`

## CTO Naming Correction

The reviewed convention report proposed `KOAPTIX_KOREA_ALL` as the index code.

CTO corrected this to `KOAPTIX_KOREA` to align with the existing KOAPTIX index-code naming convention.

`KOREA_ALL` remains the `universe_code`.

`KOAPTIX_KOREA` is the `index_code`.

## Basket Rules

- New complexes do not automatically enter the official index.
- Additions require an approved reconstitution, rebase, or chain-link lane.
- Missing base constituents must not be silently dropped.
- If current data for a base constituent is missing and no approved hold/null/carry rule exists, public-quality index generation must be held.
- Rank eligibility and index eligibility are separated.
- Ranking remains dynamic.
- Official index is basket-governed.
- Do not reuse rank `market_cap_share` as index weight.
- Compute the index aggregate from `market_cap_krw`.

## Formula

```text
KOAPTIX Index = base_value * (current_market_cap_krw / base_market_cap_krw)
```

For KOAPTIX Official Index v1:

```text
base_date = 2024-01-01
base_value = 1000
index_code = KOAPTIX_KOREA
universe_code = KOREA_ALL
basket_model = HYBRID_FIXED_GENESIS_BASKET_WITH_GOVERNED_RECONSTITUTION
```

## Public And Service Boundary

This note does not generate an index payload.

This note does not hashlock a payload.

This note does not write `koaptix_index_snapshot`.

This note does not write `complex_rank_history`.

This note does not refresh latest-board.

This note does not perform public exposure.

This note does not deploy.

Public product copy must not imply that `2024-01-01 = 1000` is already live for all KOAPTIX indexes until the required schema, payload, write, read-path, latest-board, and public exposure lanes are approved and completed.

## Prohibited Actions

Do not run any of the following from this docs note:

- DB connection
- SQL or psql
- helper/materializer/finalizer/refresh
- index payload generation
- payload hashlock generation
- `koaptix_index_snapshot` write
- `complex_rank_history` write
- latest-board refresh
- public exposure
- deploy
- source/app/script/output/manual source mutation
- git stage, commit, or push

## Next Recommended Lane

`P-KOAPTIX-INDEX-SCHEMA-READONLY-INSPECTION.0`

Reason: before payload/hashlock or index DB write, confirm the `koaptix_index_snapshot` schema and whether fields such as `universe_code`, `base_date`, `base_value`, `base_market_cap_krw`, `current_market_cap_krw`, `constituent_count`, `basket_version`, `methodology_version`, and `payload_hash` exist or require an external artifact contract.

## One-Line Handoff

KOAPTIX Official Index v1 convention is now documented as `KOAPTIX_KOREA` over `KOREA_ALL`, with `2024-01-01 = 1000`, a fixed 151-complex genesis basket, and governed reconstitution before any future constituent changes; schema inspection remains the next safe lane.
