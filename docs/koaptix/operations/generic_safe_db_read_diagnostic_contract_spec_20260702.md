# KOAPTIX Generic Safe DB-Read Diagnostic Contract Spec

## Metadata

- spec_marker: `P-KOAPTIX-GENERIC-SAFE-DB-READ-DIAGNOSTIC-CONTRACT-DOCS-ONLY.0`
- source_review_marker: `P-KOAPTIX-DB-READ-DIAGNOSTIC-SAFE-OUTPUT-REWRITE-PLAN.0`
- status: `DESIGN_SPEC_ONLY_NO_DB_READ_EXECUTION`
- date: `2026-07-02`
- git_base_head: `bfe53813b957a43eac1e55a18e2d8c721caafa13`
- db_read_execution: `NOT_APPROVED`
- db_write: `NOT_APPROVED`
- ddl_dml: `NOT_APPROVED`
- helper_execution: `NOT_APPROVED`
- latest_board_refresh: `NOT_APPROVED`
- public_exposure: `NOT_APPROVED`
- official_2024_01_01_public_exposure: `BLOCKED`
- script_patch: `NOT_APPROVED`
- cleanup_archive: `NOT_APPROVED`
- commit_push_deploy: `NOT_APPROVED`

## Non-Developer Summary

일부 DB-read 진단 스크립트는 향후 프로젝트 상태를 확인하는 데 유용할 수 있다. 그러나 이 문서는 실행 승인서가 아니다. DB-read execution remains blocked.

Export-style diagnostic scripts are unsafe as-is because they may output raw rows or create export files. Future DB-read diagnostics must output only counts, aggregates, existence checks, hashes, or sanitized summaries by default.

이 문서는 안전 계약서이며, DB read, DB write, script patch, public exposure, helper execution, cleanup, commit, push, or deploy를 승인하지 않는다. 향후 진단 실행은 별도 lane에서 명시 승인, read-only 범위, safe-output 타입, table allowlist, timeout, stop condition을 다시 확정해야 한다.

## Candidate Disposition Summary

### High-Value Future DB-Read Candidates

- `scripts/probe_51110_stage0_readonly.py`
- `scripts/probe_51820_readonly.py`

Disposition: `RETAIN_FOR_FUTURE_DB_READ_APPROVAL`

Raw output: `FORBIDDEN`

Future approval: `EXPLICIT_DB_READ_APPROVAL_REQUIRED`

### Export-Risk Candidates

- `scripts/export_51110_trade_clean_readonly.py`
- `scripts/export_51150_existing_household_readonly.py`

Disposition: `REWRITE_BEFORE_DB_READ`

Raw output: `FORBIDDEN`

Export file: `FORBIDDEN_BY_DEFAULT`

Future approval: `PATCH_OR_REPLACE_BEFORE_DB_READ_APPROVAL`

### Write-Lane-Bound Checks

- `scripts/postcheck_51110.py`
- `scripts/pre_mutation_counts_51820.py`

Disposition: `DEFER_TO_WRITE_LANE`

Future approval: `RELEVANT_WRITE_LANE_OR_POSTWRITE_READONLY_VERIFICATION_REQUIRED`

### Obsolete Local Residues

- `scripts/check_51820_kapt_source_readonly.py`
- `scripts/prototype_gap_classifier_readonly.py`
- `scripts/validate_51110_household_readonly.py`

Disposition: `ARCHIVE_LATER_DO_NOT_EXECUTE`

Future approval: `CLEANUP_OR_ARCHIVE_PLAN_REQUIRED`

## Universal Safe-Output Policy

- raw rows are forbidden by default
- raw source payloads are forbidden
- full SQL printing is forbidden
- DB URL/token/key logging is forbidden
- export files are forbidden unless separately approved
- maximum raw output rows defaults to 0
- allowed outputs:
  - `counts_only`
  - `aggregate_only`
  - `existence_check_only`
  - `hash_only`
  - `sanitized_summary_only`
- table names may be reported
- row counts may be reported
- hashes may be reported
- `lawd_cd` may be reported
- `universe_code` may be reported
- `snapshot_date` may be reported
- `trade_date_range` may be reported
- individual apartment names must not be printed unless separately approved
- addresses must not be printed unless separately approved
- raw payloads must not be printed unless separately approved
- row bodies must not be printed unless separately approved
- free-text raw source values must not be printed unless separately approved
- result artifacts must avoid secrets and raw rows
- final report must include prohibited-actions confirmation

## Export-Risk Rewrite Contract

This section applies to:

- `scripts/export_51110_trade_clean_readonly.py`
- `scripts/export_51150_existing_household_readonly.py`

### Forbidden Future Behavior

- raw CSV export
- raw row print
- raw payload print
- full SQL print
- secret/env logging
- DB URL/token/key logging

### Allowed Future Behavior

- count summary
- aggregate summary
- missing/covered count
- hash summary
- sanitized issue category count

### Required Future Patch Or Replacement Pattern

- exact file path must be named in the future lane
- output contract constants must be explicit
- hard cap raw rows to 0
- disable raw export by default
- require explicit DB-read approval marker
- refuse to run without approved diagnostic lane marker
- redact env/DB URL/token/key
- final report only
- no raw rows
- no full SQL
- no export file unless separately approved

Current treatment: `PATCH_LATER_WITH_EXACT_REPLACEMENT_OR_REPLACE_LATER`

No patch is approved by this spec.

## Future DB-Read Approval Lane Template

A future DB-read diagnostic approval lane must include these fields before any execution:

- diagnostic_lane_id
- target_script_path
- approved_by_user: `YES required`
- db_read_only: `YES`
- db_write_allowed: `NO`
- ddl_allowed: `NO`
- dml_allowed: `NO`
- helper_execution_allowed: `NO`
- latest_board_refresh_allowed: `NO`
- public_exposure_allowed: `NO`
- official_2024_01_01_public_exposure_allowed: `NO`
- payload_generation_allowed: `NO unless separately approved`
- hashlock_promotion_allowed: `NO`
- target_tables_allowlist
- expected_query_intent: `count / aggregate / existence / hash / sanitized summary`
- safe_output_type
- raw_row_output_allowed: `NO`
- export_file_allowed: `NO unless separately approved`
- max_raw_rows: `0`
- secret_redaction_policy: `REQUIRED`
- DB URL/token/key logging: `FORBIDDEN`
- SQL text printing: `NO full SQL`
- error_capture: `SQLSTATE, exception class, sanitized message only`
- transaction_policy: `read-only transaction if supported`
- timeout_policy: `REQUIRED`
- result_artifact_policy
- final_report_required_fields
- stop_conditions
- prohibited_actions_confirmation

### Required Stop Conditions

A future DB-read diagnostic lane must stop if any of these occur:

- branch, HEAD, origin, or remote ref mismatch
- staged content exists before execution
- target script path differs from approved path
- table allowlist differs from approved allowlist
- raw row output is enabled
- export output is enabled without separate approval
- DB write, DDL, DML, helper, latest-board, public exposure, or official 2024-01-01 public exposure path is detected
- DB URL/token/key logging is detected
- full SQL printing is detected
- timeout or read-only transaction policy is missing

## KOAPTIX Operating Markers

- `KOREA_ALL`
- `additive only`
- `koaptix_rank_snapshot`
- `v_koaptix_universe_rank_history_dynamic`
- `v_koaptix_latest_universe_rank_board_u`
- `run_daily_market_pipeline`
- `refresh_koaptix_front_views`

`KOREA_ALL` remains a success asset and must not be reopened by DB-read diagnostics.

Multiverse expansion remains additive only.

Universe board source of truth remains:

`koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`

DB-read diagnostics must not bypass `koaptix_rank_snapshot`.

DB-read diagnostics must not revive sealed wrappers:

- `run_daily_market_pipeline`
- `refresh_koaptix_front_views`

## Explicitly Not Approved By This Spec

- no DB read execution
- no DB connection
- no DB write
- no DDL/DML
- no script execution
- no script import
- no source code creation
- no script patch
- no replacement diagnostic script
- no payload generation
- no hashlock promotion
- no helper/latest-board refresh
- no public exposure
- no official 2024-01-01 public exposure
- no cleanup/archive
- no commit/push/deploy

## Future Approval Lanes

Possible future lanes, in safe order:

1. `SAFE_OUTPUT_DIAGNOSTIC_PATCH_READINESS_REVIEW`
2. `EXACT_DIAGNOSTIC_SCRIPT_PATCH_LANE`
3. `DB_READ_DIAGNOSTIC_APPROVAL_LANE`
4. `DB_READ_DIAGNOSTIC_EXECUTION_LANE`
5. `POST_EXECUTION_READONLY_REVIEW`
6. `COMPLETION_NOTE_DOCS_ONLY`
7. `COMMIT_PUSH_ONLY_IF_APPROVED`

## One-Line Handoff

This spec preserves the accepted safe DB-read diagnostic output contract as docs-only; all DB-read execution remains blocked, export-risk diagnostics must be rewritten before approval, and no script patch or DB action is approved.
