# Index Base-Date Do-Not-Run List

Lane: `P-KOAPTIX-OFFICIAL-INDEX-V1-POLICY-DOCS.0`

## Forbidden DB Writes
- Do not `INSERT`.
- Do not `UPDATE`.
- Do not `DELETE`.
- Do not `UPSERT`.
- Do not write `koaptix_index_snapshot`.
- Do not write `koaptix_rank_snapshot`.
- Do not write market-cap snapshots.
- Do not write price snapshots.
- Do not write trade raw/match/clean.

## Forbidden Helpers
- Do not run helper/materializer/latest-board refresh.
- Do not run `sync_rank_snapshot_from_history`.
- Do not run `append_daily_rank_history`.
- Do not run index generation.
- Do not run broad market-cap rebuild helpers.

## Forbidden API Crawls
- Do not run external API crawl.
- Do not run nationwide MOLIT crawl.
- Do not consume large public-data quota.
- Do not run 2023 historical fetches without a separate scoped feasibility/pilot lane.

## Forbidden UI And Policy Wording Changes
- Do not change public UI copy in this lane.
- Do not publish wording that says `2024-01-01` is already fully implemented.
- Do not describe `2026-04-01` as official Genesis.
- Do not describe `2024-07-31` as the final official base.
- Do not compare mixed-base indexes as if they share one start point.

## Forbidden Rebase Actions
- Do not unify base dates by DB write.
- Do not rewrite existing KOREA_ALL or SEOUL_ALL index rows.
- Do not regenerate rank/index snapshots.
- Do not rewrite source-of-truth views or bypass them.

## Required Approval Gates
Any future mutating lane must include:
- Exact universe/date scope.
- Expected row counts.
- Source artifact hash and payload hash.
- Dry-run diff.
- Transaction plan.
- Rollback plan.
- Explicit CTO approval before write.
