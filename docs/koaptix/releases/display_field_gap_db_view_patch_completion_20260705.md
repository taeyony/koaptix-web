# Display Field Gap DB View Patch Completion

Review marker: `P-KOAPTIX-DISPLAY-FIELD-GAP-DB-VIEW-PATCH.0`

Closeout marker: `P-KOAPTIX-DISPLAY-FIELD-GAP-POST-PATCH-CLOSEOUT-AND-READ-MODEL-REFRESH-DECISION.0`

## One-Line Conclusion

The service-facing `sigungu_name` display blanks were fixed by a display-only DB view coalesce patch, while the physical read-model table remains unchanged because refresh/data-write was explicitly out of scope.

## Patch Status

- status: `PASS_DB_VIEW_PATCH_COMMITTED_AND_VERIFIED`
- closeout_status: `PASS_POST_PATCH_CLOSEOUT_COMPLETE_NO_IMMEDIATE_REFRESH_RECOMMENDED`
- execution_type: `DDL_VIEW_PATCH_ONLY_DISPLAY_FIELD_COALESCE_NO_DATA_WRITE_NO_REFRESH`
- patched_views:
  - `public.v_koaptix_universe_rank_history_dynamic`
  - `public.v_koaptix_latest_universe_rank_board_u`
- dynamic_contract: `17 columns preserved`
- latest_board_contract: `24 columns preserved`
- latest_board_secondary_patch_reason: `required for immediate service-facing display because physical read model refresh was forbidden and the table remains stale`

## View Hashes

- dynamic_view_hash_before: `B6152296813D4A602133628265653FB2AFC1C703A00FF6D7DA7C167F207BF5F2`
- dynamic_view_hash_after: `2B77DE40A7E500100F48DB55CC74FABE0FCAC437B41379C0AB4E1546488C9CA2`
- latest_board_view_hash_before: `360C465E46E80F681B33B4699052E253C0ADC9ECDF9132675C0A9350DFE60FB1`
- latest_board_view_hash_after: `890A1669F4B049576D8C9274C7D70DB45AAD4DEE246AD8306604A5656DC778E1`

## Display-Only Coalesce Concept

The patch preserved rank, market-cap, universe, TOP1000, previous-rank, and movement semantics. Only the display field derivation changed.

- dynamic view concept: `COALESCE(NULLIF(rm.sigungu_name,''), rd.region_name_ko, '') AS sigungu_name`
- latest-board view concept: `COALESCE(NULLIF(read_model.sigungu_name,''), rd.region_name_ko, '') AS sigungu_name`
- safe fallback source: `apt_complex.region_id -> region_dim.region_name_ko`
- affected candidate coverage: `116 / 116 affected complexes`

## Validation Summary

- preflight_status: `PASS`
- join_cardinality_status: `PASS_NON_DUPLICATING`
- contract_validation: `PASS`
- row_count_validation: `PASS`
- non_display_field_parity: `PASS_ZERO_MISMATCH`
- performance_sanity: `PASS`
- transaction_committed: `YES`
- rollback_performed: `NO`

## Display Counts

- dynamic_blanks_before: `13390 total dynamic blank rows`
- dynamic_blanks_after: `0 total dynamic blank rows`
- service_latest_blanks_before: `258 total`
- service_latest_blanks_after: `0 total`
- top1000_service_latest_blanks_before: `143`
- top1000_service_latest_blanks_after: `0`
- physical_read_model_blanks_after: `258 total`
- physical_read_model_top1000_blanks_after: `143`

Affected universe post-patch service blanks:

- `KOREA_ALL`: `0`
- `GANGWON_ALL`: `0`
- `SGG_51110`: `0`
- `SGG_51820`: `0`

## API Spot Observation

Capped production GET checks were run against the ranking endpoints. All returned HTTP `200`, `source=live_latest`, `fallbackUsed=false`, and `blankSigunguCount=0`.

- `/api/ranking?universe_code=KOREA_ALL&limit=1000`: `1000 rows`
- `/api/ranking?universe_code=GANGWON_ALL&limit=100`: `71 rows`
- `/api/ranking?universe_code=SGG_51110&limit=100`: `68 rows`
- `/api/ranking?universe_code=SGG_51820&limit=20`: `3 rows`
- `/api/ranking?universe_code=SEOUL_ALL&limit=1000`: `1000 rows`
- `/api/ranking?universe_code=BUSAN_ALL&limit=1000`: `1000 rows`
- `/api/ranking?universe_code=GYEONGGI_ALL&limit=1000`: `1000 rows`
- `/api/rankings?universe_code=KOREA_ALL&limit=20`: `20 rows`

## Physical Read-Model Refresh Decision

Recommended option: `OPTION_A_NO_IMMEDIATE_PHYSICAL_READ_MODEL_REFRESH`

Reason:

- The user-facing ranking endpoints are already fixed through the service-facing compatibility view.
- The physical read-model table is a derived serving cache, not the rank source of truth.
- Refreshing the physical table would require a separate data-write/refresh approval lane.
- No direct physical-table consumer was identified in this closeout lane that requires immediate consistency.

Risk:

- Any direct consumer of `public.koaptix_latest_board_read_model` may still see the stale 258 blank `sigungu_name` values.

Mitigation:

- Service paths should consume `public.v_koaptix_latest_universe_rank_board_u`, not the physical table directly.
- If physical consistency becomes operationally necessary, run a separate controlled read-model refresh lane.

Alternative future option:

- `OPTION_C_DEFER_UNTIL_NEXT_SCHEDULED_READ_MODEL_REBUILD` is also acceptable if a governed rebuild path is already planned. The patched dynamic view should prevent the same blanks from being reintroduced if the rebuild reads from the patched source chain.

Do not select `OPTION_B_PLAN_CONTROLLED_PHYSICAL_READ_MODEL_REFRESH` unless physical-table consistency is explicitly required now.

## Future Refresh Lane Criteria

If a separate data-write/read-model refresh lane is authorized later, minimum success criteria should include:

- physical read-model blanks: `258 -> 0`
- physical read-model top1000 blanks: `143 -> 0`
- row count remains stable
- market-cap and rank parity preserved
- TOP1000 membership preserved
- API blanks remain `0`
- rollback/restore plan captured before mutation

## Safety Boundary

- DML attempted: `NO`
- DB data write attempted: `NO`
- read-model refresh attempted: `NO`
- helper/materializer/refresh attempted: `NO`
- source import attempted: `NO`
- source code modified: `NO`
- registry exposure modified: `NO`
- rank or market-cap semantics modified: `NO`
- stage/commit/push/deploy attempted: `NO`
- secrets logged: `NO`

## Do-Not-Run List

Do not run these without a separately approved lane:

- `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, `MERGE`
- `CREATE TABLE`, `ALTER TABLE`, `DROP`, `TRUNCATE`
- `CREATE OR REPLACE VIEW`
- `run_daily_market_pipeline()`
- `refresh_koaptix_front_views()`
- `sync_rank_snapshot_from_history()`
- `append_daily_rank_history()`
- physical read-model refresh/rebuild
- source import/backfill/finalizer/helper jobs
- registry exposure changes
- commit, push, or deploy

## Recommended Next Lane

`P-KOAPTIX-DISPLAY-FIELD-GAP-MONITOR-AND-PHYSICAL-REFRESH-GATE.0`

Purpose: monitor that service-facing boards continue to expose nonblank `sigungu_name`, and open a separate physical read-model refresh plan only if a direct physical-table consumer or governed rebuild requirement is identified.

## Handoff

The display field gap is closed for service-facing ranking surfaces; leave the physical read-model table untouched unless CTO authorizes a separate refresh/data-write lane.
