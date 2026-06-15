# Future 2024-01-01 Genesis Upgrade Path

Lane: `P-KOAPTIX-OFFICIAL-INDEX-V1-POLICY-DOCS.0`

## Target
Implement KOAPTIX Official Index v1 with `2024-01-01 = 1000` after historical data coverage, canonical reconstruction, and source-of-truth verification are complete.

## Staged Upgrade Path
1. `P-KOAPTIX-INDEX-2024-01-01-GENESIS-FEASIBILITY-AUDIT.0`
   - Verify whether `2024-01-01` can be supported by current schema, existing data, and minimal additional backfill.
2. `P-KOAPTIX-HISTORICAL-MOLIT-2023-BACKFILL-FEASIBILITY-AUDIT.0`
   - Estimate 2023 raw trade availability, API request volume, rate limits, staging design, and quality gates.
3. Small 2023 backfill pilot hashlock
   - Choose a small SGG scope and lock lawd/month list, expected request count, payload hash plan, and rollback design.
4. Targeted pilot write
   - Only after explicit approval, write staging or tightly scoped raw rows by batch tag.
5. Match/clean quality audit
   - Measure match rate, `needs_review`, `no_complex_candidate`, cancellation handling, and alias/region gaps.
6. Price/market-cap base snapshot reconstruction plan
   - Reconstruct `2024-01-01` representative prices using latest-3 / 12-month rule and create market-cap payload diffs.
7. Index base-cap payload hashlock
   - Lock base market-cap payloads for target universes and compute expected `base_market_cap`.
8. Explicit write approval
   - Approve exact row counts, hashes, transaction, and rollback plan.
9. Official index rebase
   - Write approved rank/index payloads only after source-of-truth and downstream compatibility checks pass.
10. UI/policy wording update
   - Update public copy only after the official implementation is technically live and verified.

## Guardrails
- Existing KOREA_ALL stability takes priority.
- Legacy `2024-07-31` KOREA/SEOUL rows are preserved unless a separate approved migration plan says otherwise.
- `2026-04-01` remains an interim public expansion state, not the official Genesis base.
- No helper/materializer/latest-board refresh is implied by this document.
