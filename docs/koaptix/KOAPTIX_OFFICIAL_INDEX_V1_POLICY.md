# KOAPTIX Official Index v1 Policy

## Status
- Policy status: `CTO_ACCEPTED_POLICY_DOC`
- Official target `base_date`: `2024-01-01`
- Official `base_value`: `1000`
- DB mutation in this lane: NO
- Index rebase in this lane: NO
- UI/code change in this lane: NO
- Scope: documentation-only policy fixation

## Definitions
- KOAPTIX Index: a market aggregate index normalized from universe eligible-complex total market capitalization at a defined base date.
- `official_base_date`: the fixed date at which KOAPTIX Official Index v1 is intended to equal the official base value.
- `base_value`: the normalized index value at the official base date. For v1 this is fixed at `1000`.
- `base_market_cap`: eligible universe total market capitalization at the official base date.
- `current_total_market_cap`: eligible universe total market capitalization at the current snapshot date.
- Official Genesis Base: the long-term official KOAPTIX v1 starting point for normalized index comparison.
- Normalized Market Base: the market state used to normalize the index to `1000`.
- Legacy Long-History Artifact: an existing useful index series whose base date is not the official v1 target base date.
- Interim Public Expansion State: a temporary operational/public state used during multi-universe expansion before the official target base is fully implemented.
- Future 2024-01-01 Implementation Program: the backfill, reconstruction, validation, and approved-write program required to make `2024-01-01` technically live across supported official universes.

## Final Official Policy
KOAPTIX Official Index v1 target `base_date` is fixed as `2024-01-01`.

KOAPTIX Official Index v1 `base_value` is fixed as `1000`.

The official base date should not be changed casually later because index trust depends on a stable normalization point. Current database state may contain interim or legacy base dates, but the project direction is `2024-01-01` as the unified official Genesis/Normalized Market Base.

The public product must not imply that `2024-01-01` is already fully implemented until the historical data chain is verified and the approved reconstruction/write lanes are complete.

## Method Formula
`KOAPTIX Index = base_value * current_total_market_cap / base_market_cap`

For v1, `base_value = 1000` and the target `base_market_cap` date is `2024-01-01`.

## Rationale
- KOAPTIX is an index product, so base-date consistency is essential for trust.
- `2024-01-01` is a stronger market narrative than DB-convenience dates.
- `2024-01-01` represents the first full regular market year after the post-pandemic emergency phase.
- This policy does not claim that COVID itself ended on any specific date.
- This policy does not claim that all current KOAPTIX indexes already start from `2024-01-01`.

## Current Observed State
The previous read-only audit observed the following current state:

- `KOREA_ALL` / `SEOUL_ALL`: `2024-07-31` base date. These should be treated as legacy long-history artifacts.
- Most other macro universes: `2026-04-01` base date. These should be treated as interim public expansion state only.
- Other base dates observed: `2026-04-13`, `2026-04-30`, `2026-05-31`.
- Current raw trade coverage starts at `202401`.
- Price snapshots were observed from `2024-07-31` to `2026-05-31`.
- Market-cap snapshots were observed from `2024-07-31` to `2026-05-31`.
- Risk: base-date meanings can be mixed without clear labels.

## 2024-01-01 Implementation Requirements
Technical implementation of `2024-01-01 = 1000` requires verified historical data and canonical reconstruction.

Required chain:
- Historical MOLIT raw coverage for at least `2023-01`..`2023-12`.
- Canonical raw to match to clean pipeline: `apt_trade_raw -> apt_trade_match -> apt_trade_clean`.
- Representative price reconstruction using the latest-3 / 12-month valid-trade rule by `complex_id + area_cluster_id`.
- Market-cap snapshot reconstruction at `2024-01-01`.
- Eligibility snapshot reconstruction.
- Rank/index reconstruction from verified market-cap payloads.
- Macro universe and public SGG quality gates.
- Source-of-truth verification through `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`.

The implementation must not bypass the source of truth and must not use one recent trade, representative-unit-only shortcuts, or ad hoc base-cap values.

## Transitional Policy
- `2026-04-01` can remain as an interim public expansion state only.
- `2024-07-31` can remain as a KOREA/SEOUL legacy long-history artifact only.
- Do not compare indexes with different base dates as if they share the same start point.
- Do not market `2026-04-01` as the official Genesis base.
- Do not market `2024-07-31` as the final official base.
- During the transition, UI and methodology copy should label mixed-base series clearly.

## Safe Public Language
- "KOAPTIX aims to normalize its official index to 1000 at 2024-01-01 once historical coverage is fully verified."
- "Current expansion indexes may still show interim or legacy base-date series during the buildout."
- "Indexes with different base dates should be read as separate series."
- "The long-term KOAPTIX Genesis Base is 2024-01-01."

Korean:
- "KOAPTIX의 장기 공식 지수 기준점은 2024년 1월 1일 = 1000입니다."
- "현재 일부 지수는 과도기 또는 legacy 기준일을 사용할 수 있으며, 서로 다른 기준일의 지수는 같은 출발점으로 비교하지 않습니다."
- "2024년 1월 1일 기준 공식 지수는 과거 실거래 데이터와 표준 산정 체인의 검증이 끝난 뒤 단계적으로 적용됩니다."

## Terms To Avoid
- "COVID ended"
- "All indexes already start from 2024-01-01"
- "2026-04-01 official Genesis"
- "2024-07-31 final official base"
- "Rank and index are the same"
- "One trade price index"

## Do-Not-Run List
Do not run the following without a separate approved lane that provides exact scope, row counts, hashes, transaction plan, and rollback plan:

- Index snapshot rewrite.
- Broad helper/materializer/latest-board refresh.
- Market-cap rebuild.
- Historical API crawl.
- UI public wording change.
- Base-date unification write.
- Trade raw/match/clean writes.
- Price snapshot writes.
- Rank snapshot writes.
- Registry, universe, or default-filter changes.

## Next-Lane Recommendations
Primary:
- `P-KOAPTIX-INDEX-2024-01-01-GENESIS-FEASIBILITY-AUDIT.0`

Alternatives:
- `P-KOAPTIX-HISTORICAL-MOLIT-2023-BACKFILL-FEASIBILITY-AUDIT.0`
- `P-KOAPTIX-HISTORICAL-MOLIT-BACKFILL-PILOT-HASHLOCK.0`
- `P-KOAPTIX-SAEHAN-PRICE-MATERIAL-BLOCKER-REVIEW.0`
