# KOAPTIX Manual Source Package Index

## Metadata

- index_marker: P-KOAPTIX-SOURCE-PACKAGE-INDEX-DOCS-ONLY.0
- source_review_marker: P-KOAPTIX-MANUAL-SOURCE-PACKAGE-READONLY-REVIEW.0
- status: DOCS_ONLY_SOURCE_PACKAGE_INDEX_NO_SOURCE_MUTATION
- date: 2026-07-02
- git_base_head: f49a7aea94de9f21c5b78d54865906d702a3cb1e
- source_mutation: NOT_APPROVED
- source_content_dump: NOT_APPROVED
- cleanup_move_delete: NOT_APPROVED
- db_connection: NOT_APPROVED
- db_read_execution: NOT_APPROVED
- db_write: NOT_APPROVED
- payload_hashlock: NOT_APPROVED
- commit_push_deploy: NOT_APPROVED

## Non-Developer Summary

이 문서는 현재 KOAPTIX 저장소 안에 남아 있는 수동 원천 자료 패키지가 무엇인지 기록하는 색인입니다. 원천 파일의 내용을 열어 검토하거나, 파일을 이동/삭제/정리하거나, DB 작업을 하거나, payload/hashlock 작업을 하거나, commit/push/deploy를 승인하는 문서가 아닙니다.

현재 가장 큰 불확실성은 원천 증거가 여러 위치와 역할로 섞여 있다는 점입니다. 따라서 다음 의사결정은 어떤 원천 패키지 계열을 먼저 검토할지 선택하는 방향이 안전합니다.

## Source Package Count Summary

- manual_sources_file_count: 114
- source_inbox_file_count: 12
- root_source_file_count: 2
- quoted_manual_source_path_count: 3
- total_manual_source_package_count: 13
- manual_sources_total_size_bytes: 3713003428
- source_inbox_total_size_bytes: 74807108
- root_source_total_size_bytes: 11346480
- counts_match_prior_review: YES

## Secret And Sensitive Path Screen

- secret_risk_path_only_detected: YES_KEYWORD_ONLY_NO_SECRET_SUMMARY_PATHS
- secret_risk_path_count: 6
- sensitive_source_path_detected: NO
- sensitive_source_path_count: 0
- content_opened_for_secret_or_sensitive_paths: NO
- secret_values_exposed: NO

Note: all 6 keyword hits were `no_secret_summary.md` path-name hits under failed-attempt packages and were treated path-only.

## Source Families Detected

- MOLIT_TRADE_SOURCE
- KAPT_HOUSEHOLD_SOURCE
- REGION_DIM_SOURCE
- LAWDCODE_SOURCE
- NO_SECRET_AUDIT_SUPPORT
- SOURCE_GAP_EVIDENCE
- GENERATED_SUMMARY_OR_DERIVATIVE

## Source Roles Detected

- ORIGINAL_SOURCE_EVIDENCE
- ORIGINAL_SOURCE_EVIDENCE_CANDIDATE
- TEMP_INBOX
- MANUAL_REVIEW_PACKAGE
- APPROVAL_EVIDENCE_CANDIDATE
- COVERAGE_GAP_EVIDENCE
- AUDIT_SUMMARY
- GENERATED_DERIVATIVE
- DUPLICATE_CANDIDATE
- OBSOLETE_CANDIDATE

## Package Index

| package_id | package_name | file_count | source_family | source_role | relevance | summary | recommended_next_action | mutation_status |
|---|---:|---:|---|---|---|---|---|---|
| PKG_001_SOURCE_INBOX_KOREA_ALL_MONTHLY | KOREA_ALL monthly source inbox | 12 | MOLIT_TRADE_SOURCE | TEMP_INBOX / ORIGINAL_SOURCE_EVIDENCE_CANDIDATE | HIGH | KOREA_ALL monthly MOLIT CSV inbox/source evidence candidate | REVIEW_MOLIT_TRADE_SOURCE_PACKAGE_LATER | DO_NOT_MOVE_OR_DELETE |
| PKG_002_MANUAL_MOLIT_KOREA_ALL_PORTAL_EXPORT_2023 | KOREA_ALL MOLIT 2023 portal export | 45 | MOLIT_TRADE_SOURCE / GENERATED_SUMMARY_OR_DERIVATIVE | ORIGINAL_SOURCE_EVIDENCE / GENERATED_DERIVATIVE | HIGH | KOREA_ALL MOLIT 2023 portal export package with mixed original evidence and derivatives | REVIEW_MOLIT_TRADE_SOURCE_PACKAGE_LATER | DO_NOT_MOVE_OR_DELETE |
| PKG_003_MANUAL_MOLIT_SEOUL_ALL_PORTAL_EXPORT_2023 | SEOUL_ALL MOLIT 2023 portal export | 8 | MOLIT_TRADE_SOURCE | ORIGINAL_SOURCE_EVIDENCE | HIGH | SEOUL_ALL MOLIT 2023 source evidence package | REVIEW_MOLIT_TRADE_SOURCE_PACKAGE_LATER | DO_NOT_MOVE_OR_DELETE |
| PKG_004_TO_009_MANUAL_MOLIT_FAILED_ATTEMPTS | MOLIT failed attempt provenance packages | 51 | MOLIT_TRADE_SOURCE / SOURCE_GAP_EVIDENCE / NO_SECRET_AUDIT_SUPPORT | COVERAGE_GAP_EVIDENCE / AUDIT_SUMMARY / OBSOLETE_CANDIDATE | MEDIUM | Failed attempt/source-gap provenance packages including no_secret_summary path-only support files | SOURCE_GAP_EVIDENCE_REVIEW_LATER | DO_NOT_MOVE_OR_DELETE |
| PKG_010_MANUAL_MOLIT_PILOT_SGG11710_202312 | SGG11710 December 2023 pilot package | 8 | MOLIT_TRADE_SOURCE / SOURCE_GAP_EVIDENCE | MANUAL_REVIEW_PACKAGE / COVERAGE_GAP_EVIDENCE | MEDIUM | Pilot SGG11710 December 2023 source-gap/manual review package | SOURCE_GAP_EVIDENCE_REVIEW_LATER | DO_NOT_MOVE_OR_DELETE |
| PKG_011_KAPT_SGG52111_AREA | SGG52111 KAPT area workbook | 1 | KAPT_HOUSEHOLD_SOURCE | ORIGINAL_SOURCE_EVIDENCE | HIGH | KAPT area/household source for SGG52111 | KAPT_HOUSEHOLD_SOURCE_REVIEW_LATER | DO_NOT_MOVE_OR_DELETE |
| PKG_012_KAPT_SGG52111_BASIC | SGG52111 KAPT basic workbook | 1 | KAPT_HOUSEHOLD_SOURCE | ORIGINAL_SOURCE_EVIDENCE | HIGH | KAPT basic/household source for SGG52111 | KAPT_HOUSEHOLD_SOURCE_REVIEW_LATER | DO_NOT_MOVE_OR_DELETE |
| PKG_013_ROOT_SOURCE_CSV_CANDIDATES | root-level source CSV candidates | 2 | MOLIT_TRADE_SOURCE / UNKNOWN_SOURCE_FAMILY | DUPLICATE_CANDIDATE / ORIGINAL_SOURCE_EVIDENCE_CANDIDATE | MEDIUM | Root-level source CSV candidates requiring duplicate/original status review | DUPLICATE_OR_ORIGINAL_SOURCE_REVIEW_LATER | DO_NOT_MOVE_OR_DELETE |

## Future Review Lane Options

- MOLIT_TRADE_SOURCE_REVIEW
- SOURCE_GAP_EVIDENCE_REVIEW
- KAPT_HOUSEHOLD_SOURCE_REVIEW
- DUPLICATE_OR_ORIGINAL_SOURCE_REVIEW
- SECRET_OR_SENSITIVE_SOURCE_REVIEW_IF_NEEDED
- CLEANUP_OR_ARCHIVE_PLAN_LATER
- MANUAL_SOURCE_INDEX_COMMIT_READINESS_REVIEW

## Explicitly Not Approved By This Index

- no source mutation
- no source file move
- no source file delete
- no cleanup/archive
- no raw source content dump
- no full CSV print
- no full XLSX/PDF extraction
- no DB connection
- no DB read execution
- no DB write
- no DDL/DML
- no script execution
- no script import
- no script execution/import
- no payload generation
- no hashlock promotion
- no helper/latest-board refresh
- no public exposure
- no official 2024-01-01 public exposure
- no commit/push/deploy

## KOAPTIX Operating Markers

- KOREA_ALL
- additive only
- koaptix_rank_snapshot
- v_koaptix_universe_rank_history_dynamic
- v_koaptix_latest_universe_rank_board_u
- run_daily_market_pipeline
- refresh_koaptix_front_views

KOREA_ALL remains a success asset and must not be reopened by source package indexing. Multiverse expansion remains additive only. Source package indexing must not bypass koaptix_rank_snapshot or the accepted universe board source-of-truth chain: koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u.

Source package indexing must not revive sealed wrappers:

- run_daily_market_pipeline
- refresh_koaptix_front_views

## One-Line Handoff

This index records the current manual source package queue as docs-only; no source content review, source mutation, cleanup, DB action, payload/hashlock action, commit, push, or deploy is approved.
