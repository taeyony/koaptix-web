# KOAPTIX Generic Protected DB Writer Contract Spec

## Metadata

- spec_marker: `P-KOAPTIX-GENERIC-PROTECTED-WRITER-SPEC-DOCS-ONLY.0`
- source_review_marker: `P-KOAPTIX-GENERIC-PROTECTED-WRITER-DESIGN-READONLY-PLAN.0`
- status: `DESIGN_SPEC_ONLY_NO_IMPLEMENTATION`
- date: `2026-07-02`
- git_base_head: `d0482f13e1abc0b070d46e4128f237d3eb7c4b6c`
- public_exposure: `NOT_APPROVED`
- official_2024_01_01_public_exposure: `BLOCKED`
- db_write: `NOT_APPROVED`
- helper_execution: `NOT_APPROVED`
- source_code_change: `NOT_APPROVED`

## Non-Developer Summary

이 문서는 KOAPTIX의 향후 DB 쓰기 작업을 더 안전하게 만들기 위한 계약 명세서입니다. 기존의 여섯 개 로컬 write 스크립트는 모두 `BLOCKED_DO_NOT_EXECUTE` 상태이며, 그대로 재사용하면 안 됩니다.

앞으로 DB write가 필요하면 개별 스크립트를 복사하거나 수정하는 방식이 아니라, 하나의 표준 protected writer 계약을 따라야 합니다. 이 계약은 승인 범위, 대상 테이블, 행 수, payload 경로, payload 해시, manifest 해시, rollback 조건, 사전/사후 검증을 명확하게 잠그는 것을 목표로 합니다.

이 문서는 구현 승인이 아닙니다. 이 문서만으로는 DB write, public exposure, helper 실행, latest-board refresh, 배포, cleanup, commit, push가 승인되지 않습니다.

## Superseded Blocked Local Scripts

The following local scripts are conceptually superseded by the generic protected writer design:

| Path | Status | Reuse | Future |
|---|---|---|---|
| `scripts/gate_p_c2b_51110_apt_trade_raw_write.py` | `BLOCKED_DO_NOT_EXECUTE` | `NEVER_REUSE_AS_IS` | `SUPERSEDE_BY_GENERIC_PROTECTED_WRITER_DESIGN` |
| `scripts/gate_p_d2_51110_p3_match_write.py` | `BLOCKED_DO_NOT_EXECUTE` | `NEVER_REUSE_AS_IS` | `SUPERSEDE_BY_GENERIC_PROTECTED_WRITER_DESIGN` |
| `scripts/gate_p_d2r_51110_p3_match_write_retry.py` | `BLOCKED_DO_NOT_EXECUTE` | `NEVER_REUSE_AS_IS` | `SUPERSEDE_BY_GENERIC_PROTECTED_WRITER_DESIGN` |
| `scripts/gate_p_d4_51110_p2_clean_write.py` | `BLOCKED_DO_NOT_EXECUTE` | `NEVER_REUSE_AS_IS` | `SUPERSEDE_BY_GENERIC_PROTECTED_WRITER_DESIGN` |
| `scripts/gate_p_e3_51110_price_snapshot_write.py` | `BLOCKED_DO_NOT_EXECUTE` | `NEVER_REUSE_AS_IS` | `SUPERSEDE_BY_GENERIC_PROTECTED_WRITER_DESIGN` |
| `scripts/gate_p_f3_51110_market_cap_write.py` | `BLOCKED_DO_NOT_EXECUTE` | `NEVER_REUSE_AS_IS` | `SUPERSEDE_BY_GENERIC_PROTECTED_WRITER_DESIGN` |

The previously blocked `scripts/gate_b_execute_51110.py` and `scripts/gate_b_execute_51820.py` remain `BLOCKED_DO_NOT_EXECUTE`. They are not part of this writer spec except as blocked-risk context.

## Purpose

The generic protected DB writer exists to:

- enforce one standard safety contract for approved DB write lanes
- replace copied one-off write scripts
- move stage-specific differences into payload metadata and target contract files
- preserve existing KOAPTIX success assets
- prevent source-of-truth bypass
- prevent accidental public/latest-board exposure

## Non-Goals

The generic protected DB writer is:

- not a DB migration tool
- not a helper/finalizer runner
- not a latest-board refresh tool
- not a public exposure tool
- not a source-of-truth replacement
- not an automatic pipeline runner
- not an approval bypass
- not a cleanup/archive tool
- not a broad retry executor
- not a sealed wrapper replacement

## Required Writer Contract

A future protected writer must require a contract with these fields:

- `lane_id`
- `approval_marker`
- `approval_scope`
- `approved_by_user`
- `target_stage`
- `target_table`
- `write_operation`
- `on_conflict_allowed`
- `payload_path`
- `payload_row_count`
- `payload_sha256`
- `manifest_path`
- `manifest_sha256`
- `expected_rule_versions`
- `expected_snapshot_date` or `trade_date_range`
- `lawd_cd` or `universe_code` if applicable
- `prewrite_readonly_checks`
- `write_transaction_policy`
- `rollback_conditions`
- `postwrite_verification_checks`
- `secret_sanitization_policy`
- `raw_row_print_policy`
- `full_sql_print_policy`
- `artifact_output_policy`
- `final_report_required_fields`
- `prohibited_actions`

Required contract semantics:

- `approved_by_user` must be explicit and lane-specific.
- `on_conflict_allowed` may be `YES` only when explicitly approved.
- Payload and manifest hashes must match exactly.
- Target table and operation must pass allowlist gates.
- Helper execution, latest-board refresh, public exposure, official `2024-01-01` public exposure, source-of-truth bypass, and sealed wrapper revival must be rejected unless separately and explicitly approved by a different lane.

## Future Execution Workflow

### Step 0: Read-Only Planning Lane

Define the target stage, target table, target operation, source evidence, expected row count, and required rules. No DB write is approved.

### Step 1: Payload/Hashlock Generation Or Review Lane

- separately approved
- no DB connection
- payload hash locked
- manifest hash locked

### Step 2: Explicit User Write Approval Lane

Approval must state:

- exact target table
- exact row count
- exact payload hash
- exact operation
- exact rollback conditions

### Step 3: Actual Write Lane

The actual write lane must enforce:

- single transaction
- prewrite verification
- write
- postwrite verification before commit
- rollback on mismatch
- SQLSTATE and exception capture
- cumulative rowcount capture
- no raw rows printed
- no secret exposure

### Step 4: Postwrite Read-Only Verification Lane

Run read-only verification of the completed write. Verify row counts and evidence hashes. Do not mutate DB state.

### Step 5: Completion Note Docs-Only Lane

Record the completed lane as docs-only. Do not connect to DB.

### Step 6: Commit/Push Lane Only If Separately Approved

Commit and push may happen only in a separate lane with exact file scope. Deploy remains separately blocked unless explicitly approved.

## Stage Applicability Matrix

| Stage | Likely target table | Likely operation type | Payload mandatory | Manifest mandatory | Row count mandatory | Hashlock mandatory | Postwrite verification mandatory | Extra stage-specific checks | Known danger from blocked old scripts | Future rewrite |
|---|---|---|---|---|---|---|---|---|---|---|
| `APT_TRADE_RAW` | `apt_trade_raw` or approved raw table | `INSERT_ONLY` or approved `UPSERT` | YES | YES | YES | YES | YES | source package hash, duplicate policy, trade-date range | one-off raw write lacked a complete formal hashlock/rollback contract | `YES_LATER_WITH_APPROVAL` |
| `APT_TRADE_MATCH` | approved match/status columns or approved relation table | `UPDATE_ONLY` or approved `UPSERT` | YES | YES | YES | YES | YES | match-method allowlist, no broad rematch, target-row key lock | one-off match/retry scripts encoded risky retry behavior | `YES_LATER_WITH_APPROVAL` |
| `APT_TRADE_CLEAN` | `trade_clean` or approved clean table | `INSERT_ONLY` or approved `UPSERT` | YES | YES | YES | YES | YES | latest-3 rule preservation, area-cluster policy version | one-off clean script lacked approval/hashlock/rollback signals | `YES_LATER_WITH_APPROVAL` |
| `PRICE_SNAPSHOT` | `price_snapshot` or approved snapshot table | `INSERT_ONLY` or approved `UPSERT` | YES | YES | YES | YES | YES | snapshot date, representative-price rule version, no rank refresh | one-off price script lacked approval/hashlock/rollback signals | `YES_LATER_WITH_APPROVAL` |
| `MARKET_CAP` | `component_snapshot` / `market_cap_snapshot` or approved table | `INSERT_ONLY` or approved `UPSERT` | YES | YES | YES | YES | YES | household/rule version, cap calculation version, no public/latest-board refresh | one-off market-cap script lacked approval/hashlock/rollback signals | `YES_LATER_WITH_APPROVAL` |

## Mandatory Safety Gates

A future protected writer must enforce:

- base_head gate
- branch gate
- origin/main and remote refs gate
- staged diff gate
- tracked dirty gate
- allowed files gate
- target table allowlist gate
- operation allowlist gate
- payload hash gate
- manifest hash gate
- row count gate
- approval marker gate
- DB URL/secret redaction gate
- transaction begin/commit/rollback gate
- prewrite count gate
- postwrite count gate
- SQLSTATE capture gate
- exception capture gate
- no raw rows print gate
- no full SQL print gate
- no helper/latest-board refresh gate
- no public exposure gate
- no official 2024-01-01 exposure gate
- no source-of-truth bypass gate
- sealed wrapper block gate

## Explicitly Not Approved By This Spec

This spec does not approve:

- implementation
- source code creation
- replacement writer script
- DB connection
- DB write
- DDL/DML
- payload generation
- hashlock promotion
- helper/latest-board refresh
- public exposure
- official 2024-01-01 public exposure
- cleanup/archive
- commit/push/deploy

## Fixed KOAPTIX Operating Markers

This spec is bound by the current KOAPTIX operating baseline.

- KOREA_ALL remains a proven success asset and must not be redesigned or reopened by this spec.
- Multiverse expansion remains additive only.
- Universe board source of truth remains:
  koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u
- This spec must not bypass koaptix_rank_snapshot.
- This spec must not replace or revive sealed wrappers.
- Sealed wrappers remain blocked:
  - run_daily_market_pipeline
  - refresh_koaptix_front_views

## Exact Non-Approval Wording

The following exact non-approvals are part of this spec:

- no implementation
- no source code creation
- no replacement writer script
- no DB connection
- no DB write
- no DDL/DML
- no payload generation
- no hashlock promotion
- no helper/latest-board refresh
- no public exposure
- no official 2024-01-01 public exposure
- no cleanup/archive
- no commit/push/deploy
## Future Approval Lanes

Possible future lanes include:

- `GENERIC_PROTECTED_WRITER_IMPLEMENTATION_PLAN_READONLY`
- `PAYLOAD_HASHLOCK_GENERATION_OR_REVIEW`
- `EXPLICIT_USER_WRITE_APPROVAL`
- `ACTUAL_WRITE_WITH_VERIFICATION`
- `POSTWRITE_READONLY_VERIFICATION`
- `COMPLETION_NOTE_DOCS_ONLY`
- `COMMIT_PUSH_ONLY_IF_APPROVED`

## One-Line Handoff

This spec preserves the accepted generic protected writer design as docs-only; all legacy gate_p write scripts remain blocked and no DB write or implementation is approved.

