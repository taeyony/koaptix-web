# KOAPTIX Local Artifact and Script Index

## Status and Scope

- This is a docs-only local artifact/script safety index.
- It is based on the P-ARTIFACT.0 read-only inventory and the P-ARTIFACT.1 docs-only update lane.
- No DB access, script execution, npm command, cleanup, file movement, deletion, staging, commit, push, or deploy was performed while creating this index.
- This file is a navigation and safety map. It does not approve running scripts or promoting artifacts.
- Local handoff v1 remains active for Codex work.

## Current Repo and Service State

- At the time of the inventory, local `main` was aligned with `origin/main` at `e06d9ee4d609738d30f84dcd7e749d646e577de4`.
- Completed delivery/lint/docs/audit commits are pushed:
  - `36920ef` Stabilize KOAPTIX home delivery fallback metadata.
  - `a14eaf8` Migrate KOAPTIX lint to ESLint CLI.
  - `95351cf` Document KOAPTIX delivery and lint push completion.
  - `e06d9ee` Bound SGG audit as advisory read-only gate.
- Production GET smoke previously passed against `https://www.koaptix.com` with `WARN_DATE_UNAVAILABLE`.
- Production route checks preserved requested/rendered universe identity where metadata was present.
- No `KOREA_ALL` substitution or cross-universe fallback was observed in prior production smoke.
- `SGG_11710` identity was preserved and row count remained `177`.
- `SGG_11710` `2026-05-31` partial public exposure was not observed.

## Handoff V1 Note

- `.handoff/` is local-only and ignored through `.git/info/exclude`.
- `.handoff/inbox.md` contains one current lane only.
- `.handoff/result.md` and `.handoff/review-prompt.md` are report files only.
- Do not record secrets, env values, tokens, credentials, or full log dumps in handoff files.
- Do not use `git add .` or `git add -A` by default.
- If the current `HEAD` does not match the inbox `base_head`, stop and report blocked.
- If the current branch does not match the inbox `expected_branch`, stop and report blocked.
- Do not continue into a next lane after completing the current inbox lane.

## Source Of Truth Guard

- Official universe board source-of-truth chain:
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`
- `complex_rank_history` remains a single global history engine without `universe_code`.
- Universe rank is not a simple filter of national rank; it is re-ranked inside each universe.
- Do not bypass the snapshot chain for public board delivery.
- Do not use membership alone to conclude board readiness.
- Do not revive sealed wrappers as the official path.

## Docs Inventory

- P-ARTIFACT.0 counted:
  - tracked docs: `65`
  - untracked docs notes: `1`
- Key docs under `docs/koaptix/`:
  - `00_MASTER_LIVING_SOURCE_OF_TRUTH.md`: long-lived source-of-truth and operating principles.
  - `01_PROJECT_CHARTER.md`: project framing.
  - `02_CURRENT_CONFIRMED_STRUCTURE.md`: current confirmed structure.
  - `03_OPERATIONS_AND_PROHIBITIONS.md`: operating discipline and prohibitions.
  - `KOAPTIX_DELIVERY_LINT_PUSH_COMPLETION_NOTE.md`: delivery stabilization, lint migration, push completion, source-of-truth guard, follow-ups, and handoff prompt formatting rule.
  - `KOAPTIX_SGG_11710_2026-05-31_COMPLETION_NOTE.md`: untracked local note for `SGG_11710` `2026-05-31` internal enrichment completion and public exposure stop decision.
- The handoff single-copy-block prompt rule is documented in `KOAPTIX_DELIVERY_LINT_PUSH_COMPLETION_NOTE.md`.
- Bounded audit and production smoke evidence currently lives in handoff reports and lane summaries; it is not yet consolidated into a tracked completion note beyond this index.

## Outputs Inventory

- P-ARTIFACT.0 counted `1531` untracked files under `outputs/data_gap_automation_framework`.
- Major output groups:
  - framework docs and source artifacts
  - prototype outputs
  - `region_51110` lane artifacts
  - `region_51820` lane artifacts
  - `SGG_11710` lane artifacts
  - SGG readiness scanner artifacts
- Dense or high-value folders include:
  - `outputs/data_gap_automation_framework/sgg_readiness_scanner`
  - `outputs/data_gap_automation_framework/region_51110_validation`
  - `outputs/data_gap_automation_framework/price_snapshot_dryrun_execution_sgg_11710`
  - `outputs/data_gap_automation_framework/region_51110_rank_index_dryrun_planning`
  - `outputs/data_gap_automation_framework/region_51110_price_snapshot_write`
  - `outputs/data_gap_automation_framework/region_51110_next_exports`
  - `outputs/data_gap_automation_framework/source_artifacts`

## SGG_11710 Artifact Map

Important `SGG_11710` artifact families:

- Price dryrun:
  - `outputs/data_gap_automation_framework/price_snapshot_dryrun_execution_sgg_11710`
  - Contains latest-board, membership, gap-summary, market-cap preview, eligibility preview, price dryrun insert-shape, conflict-check, and recent trade preview artifacts.
  - P-L.14 summary reported `target_universe=SGG_11710`, `snapshot_date=2026-05-31`, `latest_board_rows=177`, `marketcap_preview_rows=278`, `eligibility_preview_rows=75`, and `existing_price_snapshot_conflicts=0`.
- Eligibility hash-lock:
  - `outputs/data_gap_automation_framework/sgg_11710_eligibility_payload_hash_lock_planning`
  - Contains eligibility payload hash-lock package and approval skeleton artifacts.
- Total contract correction hash-lock:
  - `outputs/data_gap_automation_framework/sgg_11710_total_contract_correction_full_hash_lock_planning`
  - Contains corrected component/total payload hash-lock artifacts and a `SGG_11710_2026-05-31` corrected DB contract payload.
- Full market-cap source-gap matrix:
  - `outputs/data_gap_automation_framework/sgg_11710_full_marketcap_source_gap_planning`
  - Contains the P-L.31F1 full market-cap source-gap matrix.
- Combined source-gap closure matrix:
  - `outputs/data_gap_automation_framework/sgg_11710_combined_source_gap_closure_planning`
  - Contains the P-L.31GH0 combined source-gap closure matrix.
  - P-L.31GH0 status: `P-L.31GH0_EXTERNAL_SOURCE_REQUIRED_FOR_FULL_COVERAGE`.

Source-gap conclusion:

- Local artifacts are useful evidence, not a public expansion greenlight.
- External/manual source closure is still required for full `SGG_11710` `2026-05-31` coverage.
- `SGG_11710` `2026-05-31` remains internal-only.
- The public `SGG_11710` latest board must remain `2026-05-29 / 177 rows` unless a later explicitly approved source-closure and public exposure lane proves full coverage.

## Scripts Inventory

- P-ARTIFACT.0 counted:
  - tracked scripts: `6`
  - untracked scripts: `53`
- Package scripts:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `lint`: `eslint .`
  - `smoke:delivery`: `node scripts/smoke-koaptix-delivery.mjs`
  - `smoke:regional`: `node scripts/smoke-regional-identity.mjs`
  - `smoke:browser`: `node scripts/smoke-browser-regional-identity.mjs`
  - `audit:sgg`: `node scripts/audit-sgg-readiness.mjs`
  - `diagnose:sgg-direct`: `node scripts/diagnose-sgg-direct-read.mjs`
  - `gate:sgg`: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sgg-release-gate.ps1`

### Read-Only Candidates

These appear intended for GET-only, advisory, smoke, or read-only diagnostic use, but still require explicit lane approval before execution:

- `scripts/smoke-koaptix-delivery.mjs`
- `scripts/smoke-regional-identity.mjs`
- `scripts/smoke-browser-regional-identity.mjs`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/check_51820_kapt_source_readonly.py`
- `scripts/export_51110_trade_clean_readonly.py`
- `scripts/export_51150_existing_household_readonly.py`
- `scripts/validate_51110_household_readonly.py`
- `scripts/probe_51110_stage0_readonly.py`
- `scripts/probe_51820_readonly.py`
- `scripts/prototype_gap_classifier_readonly.py`

Note: several read-only-named scripts can still write local artifacts under `outputs/`. Local output writes require explicit approval.

### DB-Read Candidates

These require explicit DB-read approval and secret-safe handling before execution:

- `scripts/diagnose-sgg-direct-read.mjs`
- `scripts/diagnose_51820_lawd_cd.py`
- `scripts/diagnose_51820_region_map.py`
- `scripts/probe_51110_diagnose_access.py`
- `scripts/probe_51110_final.py`
- `scripts/probe_51110_household_sample.py`
- `scripts/probe_51110_household_sample2.py`
- `scripts/probe_51820_readonly.py`
- `scripts/export_51110_next_exports.py`
- `scripts/export_51110_trade_clean_readonly.py`
- `scripts/export_51150_existing_household_readonly.py`
- `scripts/pre_mutation_counts_51820.py`
- `scripts/postcheck_51110.py`

### DB-Write Or Helper-Danger Candidates

These must not run without explicit DB-write/helper approval, scoped rollback planning, and verification:

- `scripts/gate_b_execute_51110.py`
- `scripts/gate_b_execute_51820.py`
- `scripts/gate_p_c2b_51110_apt_trade_raw_write.py`
- `scripts/gate_p_d2_51110_p3_match_write.py`
- `scripts/gate_p_d2r_51110_p3_match_write_retry.py`
- `scripts/gate_p_d4_51110_p2_clean_write.py`
- `scripts/gate_p_e3_51110_price_snapshot_write.py`
- `scripts/gate_p_f3_51110_market_cap_write.py`
- `scripts/retry_merge_51110.py`
- `scripts/patch_51110_exports.py`
- `scripts/koaptix_sgg_factory.py`
- `scripts/sgg-release-gate.ps1` unless the lane explicitly approves release-gate execution.

### Unknown Or Review-Required Scripts

These require static review before any run because names suggest planning, generation, validation, or dryrun behavior that may still write local artifacts or call guarded flows:

- `scripts/generate_*`
- `scripts/gate_p_*_dryrun.py`
- `scripts/gate_p_*_planning.py`
- `scripts/validate_51110_kapt_relabel.py`
- `scripts/validate_kapt_household_candidates.py`
- `scripts/verify_outputs.py`

### Generated Or Cache Entries

- `scripts/__pycache__/`
- Python bytecode files under `scripts/__pycache__`

## Safety Map

Keep local/untracked:

- `outputs/data_gap_automation_framework` until preservation/index/cleanup decisions are explicit.
- `docs/koaptix/KOAPTIX_SGG_11710_2026-05-31_COMPLETION_NOTE.md` until a separate docs commit lane decides whether to track it.
- untracked operational scripts until classified and approved.

Future docs index or consolidation candidates:

- This file as the primary navigation and safety map.
- A future tracked note for bounded audit and production smoke completion if desired.
- A future SGG_11710 public-expansion readiness checklist only after source closure evidence exists.

Future cleanup candidates:

- `scripts/__pycache__/`
- duplicated retry/intermediate output folders after preservation approval.
- old generated logs after explicit cleanup approval.

Ignore or exclude review candidates:

- `outputs/`
- `scripts/__pycache__/`
- local one-off operational scripts intentionally kept outside git.
- `.handoff/` is already excluded and should remain local-only.

Explicit approval required:

- any DB read
- any DB write
- any helper execution
- any script execution
- any local output generation
- any promotion of untracked docs/outputs/scripts into git
- any source/package/config edit
- any git add/commit/push/deploy

## Do-Not-Run List

- Do not run broad helper execution.
- Do not run `append_daily_rank_history` without explicit scope.
- Do not run `sync_rank_snapshot_from_history` without explicit scope.
- Do not run market-cap, eligibility, price, household, rank, or index write scripts without explicit approval.
- Do not expose `SGG_11710` `2026-05-31` as a partial public rank board.
- Do not write partial 10-row or 22-row `SGG_11710` public snapshot data.
- Do not overwrite the current `SGG_11710` `2026-05-29 / 177 rows` public board.
- Do not revive sealed wrappers.
- Do not bypass the source-of-truth chain.
- Do not use membership alone to decide board readiness.
- Do not force-push.
- Do not deploy manually without explicit approval.

## Recommended Next Lanes

1. `P-METADATA.0 metadataBase warning fix planning`
   - Purpose: inspect and plan a small fix for the persistent Next metadataBase warning.
   - Approval: read-only planning first; code/config edit only in a later explicit lane.
   - Success criteria: exact ownership and minimal patch path identified.

2. `P-LINT.DEBT source warning cleanup planning`
   - Purpose: reduce the accepted 60 baseline lint warnings in targeted, low-risk lanes.
   - Approval: read-only planning first; source edits only in later explicit lanes.
   - Success criteria: split warnings into safe type-only cleanup vs risky React/fallback/map behavior work.

3. `P-PRODSMOKE.1 scheduled/periodic production smoke planning`
   - Purpose: turn the successful GET-only production smoke into a repeatable advisory checklist or script plan.
   - Approval: read-only planning first; script/docs automation later if desired.
   - Success criteria: clear production identity/fallback/SGG_11710 guard cadence.

4. `SGG_11710 source acquisition/backfill readiness`
   - Purpose: revisit public expansion only if external/manual source closure appears.
   - Approval: source package review first; any DB write must be a later explicit lane.
   - Success criteria: prove full 177-row public coverage before any public snapshot write.

## Marker Checklist

- local_artifact_script_index_title: present
- handoff_v1_local_only: present
- source_of_truth_chain: present
- sgg_11710_internal_only: present
- sgg_11710_public_latest_2026_05_29_177: present
- external_source_required_for_full_coverage: present
- scripts_safety_categories: present
- do_not_run_list: present
- recommended_next_lanes: present
- one_line_handoff: present

## One-Line Handoff

Delivery/lint/audit/prod smoke are pushed and verified; artifact/script landscape is indexed; `SGG_11710` `2026-05-31` remains internal-only; preserve the rank snapshot source-of-truth chain.
