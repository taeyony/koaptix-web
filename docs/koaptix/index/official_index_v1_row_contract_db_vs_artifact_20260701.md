# KOAPTIX Official Index v1 Row Contract: DB vs Artifact - 2026-07-01

REVIEW_MARKER: P-KOAPTIX-INDEX-ROW-CONTRACT-DOCS-NOTE.0

## One-Line Conclusion

The current `public.koaptix_index_snapshot` schema supports a minimal `KOAPTIX_KOREA` market-cap-ratio index row, but Official Index v1 governance and payload/hashlock proof require an external artifact contract unless a future schema migration is separately approved.

## Non-Developer Explanation

DB 테이블은 최종 지수 숫자와 핵심 시가총액 입력값을 저장할 수 있다. 예를 들어 어느 날짜의 어떤 지수가 얼마인지, 기준일과 기준값이 무엇인지, 기준 시가총액과 현재 시가총액이 무엇인지는 현재 `public.koaptix_index_snapshot`에 담을 수 있다.

하지만 현재 DB 테이블은 151개 genesis basket에 대한 모든 감사 정보를 저장하지 않는다. 어떤 단지들이 바구니에 들어갔는지, 현재 계산에서 몇 개가 유효했는지, 누락된 기준 구성원이 있는지, payload가 어떤 방식으로 정규화되고 hashlock 되었는지 같은 증거는 별도의 계약이 필요하다.

따라서 첫 번째 안전한 Official Index v1 설계는 DB row에는 공식 지수값과 핵심 market-cap 입력을 넣고, 외부 artifact/hashlock에는 basket proof와 governance metadata를 남기는 방식이다.

이 방식은 schema migration이나 index DB write를 서두르기 전에, 무엇이 DB에 들어가고 무엇이 artifact에 남는지를 먼저 고정한다.

## Accepted Official Index Convention

- index_family: `KOAPTIX Official Market-Cap Index v1`
- index_code: `KOAPTIX_KOREA`
- universe_code: `KOREA_ALL`
- base_date: `2024-01-01`
- base_value: `1000`
- base_basket: `151 verified KOREA_ALL rank-eligible complexes at 2024-01-01`
- basket_model: `HYBRID_FIXED_GENESIS_BASKET_WITH_GOVERNED_RECONSTITUTION`
- public_exposure: `BLOCKED`

## Observed DB Schema Summary

`public.koaptix_index_snapshot` exists.

`index_rows_2024_01_01 = 0` at the time of the read-only schema inspection.

Observed columns:

- `snapshot_date date NOT NULL`
- `index_code text NOT NULL`
- `universe_code text NOT NULL`
- `index_name text NOT NULL`
- `base_date date NOT NULL`
- `base_value numeric(14,4) NOT NULL DEFAULT 1000.0000`
- `index_value numeric(14,4) NOT NULL`
- `base_market_cap_krw bigint NOT NULL`
- `total_market_cap_krw bigint NOT NULL`
- `component_complex_count integer NOT NULL`
- `change_1d numeric(14,4) NULL`
- `change_pct_1d numeric(12,6) NULL`
- `index_method text NOT NULL DEFAULT market_cap_ratio_base_1000`
- `calculation_version text NOT NULL DEFAULT v1`
- `calculation_note text NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

Observed constraints and indexes:

- primary key: `snapshot_date, index_code`
- unique: `snapshot_date, universe_code, index_code`
- index: `universe_code, snapshot_date DESC`
- checks: `base_date <= snapshot_date`, positive `base_market_cap_krw`, positive `base_value`, positive `index_value`, nonnegative `total_market_cap_krw`, nonnegative `component_complex_count`, token-format checks for `index_code`, `universe_code`, `index_method`, and `calculation_version`
- foreign keys: `NONE_OBSERVED`

## DB-Supported V1 Fields

The following Official Index v1 contract fields are represented directly by current DB columns:

- `snapshot_date` -> DB column `snapshot_date`
- `index_code` -> DB column `index_code`
- `universe_code` -> DB column `universe_code`
- `index_name` -> DB column `index_name`
- `base_date` -> DB column `base_date`
- `base_value` -> DB column `base_value`
- `index_value` -> DB column `index_value`
- `base_market_cap_krw` -> DB column `base_market_cap_krw`
- `current_market_cap_krw` -> DB column `total_market_cap_krw`
- `constituent_count` -> DB column `component_complex_count`
- `index_method` -> DB column `index_method`
- `methodology_version` -> DB column `calculation_version`
- `calculation_note` -> DB column `calculation_note`
- `created_at` -> DB column `created_at`

## External Artifact/Hashlock V1 Fields

The following fields are required external artifact fields for Official Index v1 unless a future schema migration is separately approved:

- `base_constituent_count`
- `valid_current_constituent_count`
- `missing_constituent_count`
- `basket_version`
- `payload_hash`
- `payload_hash_algorithm`
- `payload_canonicalization_method`
- `constituent_keyset`
- `constituent_market_cap_inputs`
- `source_rank_snapshot_hash` or `source_rank_snapshot_reference` if available
- `generated_at`
- `generation_tool_version` if available
- `row_contract_version`
- `methodology_version`

The external artifact/hashlock must be sufficient to prove that the DB row was generated from the governed 151-complex genesis basket or from a later approved basket version.

## Optional Future DB Columns

The following may become future DB columns, but are not required before the first internal v1 payload/hashlock if the external artifact contract is approved:

- `base_constituent_count`
- `valid_current_constituent_count`
- `missing_constituent_count`
- `basket_version`
- `payload_hash`
- `generated_at`
- `reconstitution_id`

A future schema migration lane may promote some or all of these fields into `public.koaptix_index_snapshot` if CTO prefers DB self-contained auditability.

## Not Needed For Genesis V1

- `reconstitution_id` is not required for the initial `2024-01-01` genesis index row, because no reconstitution has occurred yet.
- `change_1d` and `change_pct_1d` are not required for the base-date genesis row.
- latest-board/public exposure remains blocked.

## Row Contract Rule

No index payload/hashlock planning should proceed until the future payload explicitly maps every required Official Index v1 contract field either to:

A. a DB column in `public.koaptix_index_snapshot`, or

B. a named field in the external artifact/hashlock contract.

The payload planning lane must not rely on implicit meaning for `total_market_cap_krw`, `component_complex_count`, or `calculation_version`; it must explicitly state their accepted aliases:

- `current_market_cap_krw` -> `total_market_cap_krw`
- `constituent_count` -> `component_complex_count`
- `methodology_version` -> `calculation_version`

## Public And Service Boundary

This note does not generate an index payload.

This note does not generate a hashlock.

This note does not write `koaptix_index_snapshot`.

This note does not write `complex_rank_history`.

This note does not refresh latest-board.

This note does not perform public exposure.

This note does not deploy.

This note does not create a migration.

This note does not alter schema.

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
- migration creation
- schema alteration
- source/app/script/output/manual source mutation
- git stage, commit, or push

## Recommended Next Lane

`P-KOAPTIX-INDEX-PAYLOAD-HASHLOCK-PLANNING-WITH-EXTERNAL-ARTIFACT-CONTRACT.0`

This next lane is still planning/hashlock only and must not perform an actual DB write.

Fallback if CTO wants DB self-contained auditability before any index write:

`P-KOAPTIX-INDEX-SCHEMA-MIGRATION-PLANNING-READONLY.0`

## One-Line Handoff

KOAPTIX Official Index v1 row contract is documented as a hybrid DB-plus-external-artifact contract: the DB row stores the official index value and core market-cap fields, while the external artifact/hashlock preserves basket proof, constituent counts, payload hash metadata, and governance evidence before any future index write.
