"""Pure S1 contract and Projection-compatible typed validation.

Historical paths in CANONICAL_CONTRACT_JSON are inert provenance text only.
No import-time I/O and no action, connection or secret handling.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Mapping, Sequence
import hashlib
import json
import re
import uuid

CANONICAL_CONTRACT_JSON = '{"B_bundle":{"bootstrap_predecessor":"If initial predecessor is sealed compatibility G with affected_rank_date NULL, freeze GLOBAL_LATEST surface snapshot_date as predecessor official D and preserve its exact event/version/G. Do not assign a fake fresh daily date to bootstrap.","later_head":"Walk existing event expected_previous_version/from_generation_id chain from current head to requested event, with monotonic dates and no incompatible rollback. If ancestry cannot be proven, BLOCK_PREDECESSOR/CONFLICT; never update head during reconciliation.","official_history_business_fields":["snapshot_date","complex_id","market_cap_krw","rank_all","total_market_cap"],"official_snapshot_fields":["snapshot_date","universe_code","complex_id","rank_all","market_cap_krw","market_cap_share","previous_rank_all","rank_delta_1d","is_top1000","rank_method","calculation_version","created_at"],"ordering":"Validate immutable request, then exact existing-completion recognition BEFORE mutable predecessor/forward-date gates. New branch SERIALIZABLE; lock plan then singleton then manifest; require still nonrevoked, full eligible G and protected PASS; insert official rows/slots/event/audit; pointer is last official write; SET CONSTRAINTS ALL IMMEDIATE; commit once.","predecessor_CAS":"Frozen official D/event_id/publication_version/G/published_at must equal locked current pointer plus referenced event/generation-derived official D. UPDATE WHERE all pointer components match; rowcount=1. Next version=expected+1. New D>frozen predecessor D AND current official global maximum D. No auto-rebase.","required":["Exact frozen plan/P/S/A lineage","Exact complete immutable generation/manifest and full fingerprint","Protected exact V PASS","One GLOBAL slot and every required universe slot, no extra slot","Existing immutable PUBLISH event with plan/execution/event IDs, from/to G, expected previous version, next version, recorded_at","Whole official complex_rank_history for D equals the five-column history stage","Whole official koaptix_rank_snapshot for D equals twelve-column stage and exact required universe set; reject extra official same-D universe rows","B COMPLETE audit same transaction, links complete bundle digest","Current singleton pointer exact requested tuple OR proven continuous later PUBLISH descendant"],"results":["PUBLISHED_NEW","ALREADY_PUBLISHED_CURRENT","ALREADY_PUBLISHED_NOT_CURRENT","BLOCKED_CONFLICT","BLOCKED_PARTIAL","BLOCKED_VERIFICATION","BLOCKED_PREDECESSOR"],"revocation_race":"Reuse the existing M904:1221-1241 revoker singleton FOR UPDATE NOWAIT and active/previous-G exclusion. B takes the same singleton lock before eligibility checks and holds it through commit. Revocation-first blocks B; B-first prevents concurrent revocation of its now-active manifest. No new revocation trigger is required; W/V have neither raw revocation DML nor revoker EXECUTE.","surrogate_ids":"complex_rank_history.id is storage identity, not Projection content. Compare all five business columns and exact row multiplicity; retain generated IDs, never rewrite on retry."},"activation":"Local candidate only. Later CTO acceptance, exact source/local qualification, inert DB qualification, commit, deployment binding and separately approved install/activation are required. Install source/runtime S1 hash and Projection identity agree; actual activation tick is assigned only then. Historical Authority never silently reinterpreted.","architecture_family":"S1_IDEMPOTENT_PUBLICATION","canonical_serialization":{"contract":"UTF-8, no BOM/newline; sorted Unicode object keys; compact comma/colon; no Unicode normalization; arrays in defined order; strings/integers/booleans/null only; reject duplicate keys, floats, NaN/Infinity; SHA-256 uppercase of entire JSON object; hash stored externally, no self hash","data":"Existing run_publication.canonical_json exact Decimal-scale serialization for Projection/full typed values; canonical date YYYY-MM-DD and UTC timestamps with six fractional digits. JSON contract itself contains no Decimal. DB row fingerprints use explicit typed field order, not to_jsonb arbitrary deparser output."},"contract_name":"KOAPTIX_S1_IDEMPOTENT_FORWARD_PUBLICATION","contract_version":"1.0.0","control_records":{"V_admission_phases":["V","R_P","R_S","R_A","R_B","R_D"],"W_admission_phases":["W_START","P","S","A","B","D"],"constraints":"ADMIT ordinal=1 or2 only, unique per plan/phase/ordinal. COMPLETE and VERDICT ordinal=0 only, immutable singleton for phase. OBSERVE ordinal=1 or2, append-only bounded batches. VERDICT can only have phase V and actual verifier actor. REFERENCE versus GENERATION is an exact verdict mode, never an interchangeable B permit.","duplicate_admission":"Look up exact complete or already-admitted run before allocating new clocks/UUIDs. A duplicate signal is not automatically an additional phase call. If admission commit ACK is unknown, read back the same plan/ordinal; do not create a fresh ordinal merely because a response was lost.","phase_values":["W_START","P","S","A","V","B","D","R_P","R_S","R_A","R_B","R_D"],"record_kind_values":["ADMIT","COMPLETE","VERDICT","OBSERVE"]},"database_delta":[{"classification":"NEW_REQUIRED","key":"PRIMARY KEY(publication_track,D,segment_kind); UNIQUE(segment_sha); PREPARATION root owns unique plan_id; PUBLICATION FK to PREPARATION","name":"koaptix_s1.plan_segment","purpose":"Two immutable linked segments of one occurrence plan; pre-P freeze then deterministic post-P output binding. No replace/update/recapture operation."},{"classification":"NEW_REQUIRED","key":"PRIMARY KEY(plan_id,phase,record_kind,ordinal); ADMIT ordinal in(1,2); COMPLETE/VERDICT ordinal=0; OBSERVE ordinal in(1,2)","name":"koaptix_s1.phase_record","purpose":"One table for durable bounded admission, atomic completion, immutable V verdict and honest observations. No authority token or receipt service."},{"classification":"NEW_REQUIRED","key":"PRIMARY KEY(publication_track,D,slot_code); fixed GLOBAL or U:<canonical universe>; all NOT NULL","name":"koaptix_s1.publication_slot","purpose":"One GLOBAL slot plus exact required universe slots all refer to existing event/G/version/time tuple. Deferred complete-bundle constraint. No duplicate public history table."},{"classification":"NEW_REQUIRED","key":"singleton versioned installed contract and activation date/first schedule tick; no runtime mutation grant","name":"koaptix_s1.policy","purpose":"Fixed allowlisted track, S1 hash, Projection identity, forward boundary, limits and installed source binding. Required environment facts bound once in Q5, no live capture now."},{"classification":"EXISTING_REUSE","key":"PK(snapshot_date,authority_contract_version), UNIQUE(run_id); revocation PK(manifest_run_id)","name":"public.koaptix_rank_input_authority_manifest / revocation","purpose":"Keep rank-input-v1 and immutable fields. S1 has distinct execution-policy identity, not a new manifest-slot namespace."},{"classification":"EXISTING_REUSE","key":"Existing UUID/run/source-manifest/combined-digest and all row/rank keys","name":"public.koaptix_latest_board_generation and six child/stage tables","purpose":"Full immutable inactive data; new completion record binds full fingerprint without a duplicate generation table."},{"classification":"EXISTING_MODIFY","key":"Existing PK unchanged","name":"public.koaptix_latest_board_generation_row nullable-tier prerequisite","purpose":"Embed accepted unapplied M908 NULL-tier compatibility delta in C01; no historical row rewrite; Projection policy unchanged."},{"classification":"EXISTING_REUSE","key":"event PK(publication_version), UNIQUE(event_id), UNIQUE(execution_run_id); existing four-field tuple FK from pointer","name":"public.koaptix_latest_board_publication_event and singleton publication","purpose":"Existing event remains sole event authority. Slots reference its exact event/version/to_G/recorded_at tuple."},{"classification":"EXISTING_MODIFY","key":"history UNIQUE(D,complex_id); snapshot PK(D,U,complex_id)","name":"public.complex_rank_history / public.koaptix_rank_snapshot","purpose":"Keep existing data/natural keys; add prospective-only immutable/authorized-writer guards for S1 dates, preserve M900 ACLs; no public duplicate table."},{"classification":"EXISTING_MODIFY","key":"summary UNIQUE(run_date,U); index PK(D,index_code) plus UNIQUE(D,U,index_code)","name":"public.koaptix_market_daily_summary / public.koaptix_index_snapshot","purpose":"Keep arithmetic/old rows; prospective guards prevent alternate INSERT and UPDATE/DELETE of S1 dated outputs; runtime gets no raw DML."},{"classification":"EXISTING_REUSE","key":"staging PK(id UUID), map PK(complex_id)","name":"public.staging_market_raw / public.koaptix_complex_region_map","purpose":"P beforeimage CAS and affected-only deterministic afterimages under fixed entry; snapshots of effect evidence live in plan/COMPLETE, not a new public source of truth."},{"classification":"NEW_REQUIRED","key":"Exact signatures in principal contract","name":"koaptix_s1 fixed APIs and internal helpers","purpose":"Fixed typed SQL, exact-key JSON validation, SECURITY DEFINER with pg_catalog/public/koaptix_s1 fixed search path, explicit grants and actual-session checks; no caller SQL/table/role names."},{"classification":"NEW_REQUIRED","key":"Fixed triggers on three new immutable/control relations and S1 official/dated relations","name":"shared prospective immutable/bundle triggers","purpose":"Reject mutation of immutable state and validate complete atomic bundle. Reuse existing revocation serialization. Guard caller identity in SECURITY INVOKER trigger, never confuse a SECURITY DEFINER trigger current_user with its caller. Prospective dated-output protection includes statement-level TRUNCATE rejection after S1 state exists; row guards alone are insufficient. Test old public/legacy helper routes as well as W/V."},{"classification":"NEW_REQUIRED","key":"Two LOGINs; one NOLOGIN internal owner","name":"koaptix_publication_writer / koaptix_publication_verifier / koaptix_s1_owner","purpose":"No superuser, CREATEROLE, CREATEDB, replication, bypassrls, ownership or SET/ADMIN membership for W/V. Owner gets only enumerated source read and phase-table privileges."},{"classification":"RETIRE_FORWARD_DEPENDENCY","key":"Preserve existing SQL/old evidence","name":"legacy action/Authority/C4 forward dependencies","purpose":"No M909 issuance/consumption, original-ACK HMAC, TEMP latch, receipt writer, old action literals, legacy finalize or legacy append in S1 runtime."}],"downstream":{"dependency_freeze":"Freeze full earliest baseline and latest prior index rows at PREPARATION; first S1 occurrence uses exact accepted predecessor data. For later S1 occurrences all earlier relevant published predecessor derivations must be complete or proven not required. Never compute against a accidentally missing predecessor and silently revise later.","immutable_outputs":["koaptix_market_daily_summary for S1 dates","koaptix_index_snapshot for S1 dates"],"index":"Preserve earliest existing baseline per U, latest prior snapshot_date<D, base fallback D/1000/target total only when no baseline exists. Preserve round(...,4), index naming, rank_snapshot_aggregate and v1_2026_04_14. Nonpositive baseline/index rejected by existing constraints; tied earliest/latest rows with differing semantics block.","legacy":"refresh_koaptix_total_market_cap_history is deployment-time view definition/ACL only; new daily D invokes neither DDL/GRANT nor broad summary/index UPSERT helpers.","macro_universes":["KOREA_ALL","SEOUL_ALL","BUSAN_ALL","DAEGU_ALL","INCHEON_ALL","GWANGJU_ALL","DAEJEON_ALL","ULSAN_ALL","SEJONG_ALL","GYEONGGI_ALL","CHUNGBUK_ALL","CHUNGNAM_ALL","JEONNAM_ALL","GYEONGBUK_ALL","GYEONGNAM_ALL","JEJU_ALL"],"no_regression":"D never updates canonical pointer. Existing dated success is read-only; new output requires exact B and frozen dependencies. Views select canonical current B; old D cannot be claimed successful using current head. If any future replaceable cache is added, it requires an explicit B-version CAS contract outside this source set.","read_models":"Existing M904 published compatibility views and M905 Home payload are ordinary derived views; no refresh job or second current-cache table. Legacy materialized/cache surfaces are not S1 write targets.","summary":"One KOREA_ALL row from exact B global history: count, sum market_cap_krw and sum where rank_all<=50, all exact numeric casts. Require nonempty B; no zero-summary-from-missing-history.","universe_rule":"Exact intersection of fixed 16 macro array with B required universes; do not add missing macros or change JEONBUK/tier/index base policy.","version":"S1_DERIVED_INDEX_V1"},"effective_scope":"PROSPECTIVE_FORWARD_DAILY_PATH_ONLY","frozen_plan":{"clocks":"Only clocks appearing in immutable packet/rows or eligibility are frozen semantic inputs. observed_at, attempts, transport IDs, backend PIDs and original ACK are audit, not plan/effect identity. A verified_at is legacy builder metadata, not the independent V observation time.","construction":"One plan with two immutable, uniquely keyed segments; PREPARATION is frozen before the first P call, PUBLICATION is attached once from P committed output before S. A missing segment is NOT_READY, never an editable plan. Each phase hashes only already-frozen upstream data; no self-reference to its completion. No replacement of either segment, no new plan/G after failure.","plan_id":"H([contract_sha,\\"KOAPTIX_OFFICIAL_DAILY\\",D,scheduled_tick_utc])","plan_version":"S1_FROZEN_PLAN_V1","preparation_fields":["plan_version","contract_sha","plan_id","publication_track","D","scheduled_tick_utc","Projection_contract_sha256","preparation_policy_version","full frozen P input closure and hashes","affected staging UUIDs and predicted affected complex IDs","full target staging/map beforeimages and deterministic afterimages","frozen as_of_date","source function/query identity and selected master/household relation","generation UUID allocated once","manifest_run_id=S1:<plan_id>:S","A_run_id=S1:<plan_id>:A","B_run_id=S1:<plan_id>:B","event UUID allocated once","generated_at/verified_at/stage_created_at/event_recorded_at fixed once","frozen predecessor official D/event/version/G/time","verification_policy_version","calculation_version=v1","derivation_policy_version","full frozen earliest/prior index dependencies","max_phase_invocations=2","max_W_starts=2","admission_deadline"],"preparation_freeze_rule":"In one SERIALIZABLE admission transaction compute and persist P input closure and expected before/afterimages using established merge matching and affected dominance rules; capture non-P Projection input rows and official/index predecessor inputs as well. At P, compare current snapshot with this frozen closure, permitting only planned P target changes. Drift blocks. Read-back for equality is not recapture. P application, unchanged Projection query output capture and P COMPLETE commit together.","publication_fields":["preparation_segment_sha","P COMPLETE key and immutable Projection result hash","exact saved Projection output plus assembled full packet","input/frozen-population identity","manifest_run_id and manifest semantic hash","candidate_generation_payload_sha excluding future S stored clocks","required universe set/vector","immutable expected S/A/B/D content and deterministic rule binding S stored clocks after S"],"publication_segment_rule":"Finalize from stored P output using accepted pure Projection assembly; DB validates arrays/digests against its own saved raw result. Finalization and S admission share one transaction. A crash after P retrieves saved output; it never re-runs Projection capture. plan_id stays fixed; publication_segment_sha is a separate content identity.","uuid_policy":"Allocate G and B event UUID once during the first durable PREPARATION creation; persist unique mapping. UUID collision blocks. No retry-generated UUID. build_key=H([plan_id,manifest semantic hash,full frozen generation content without G]); full equality is still mandatory."},"full_generation_fingerprint":{"S_clock_binding":"PUBLICATION segment stores candidate_generation_payload_sha and manifest semantic hash only. After S, A phase identity computes final generation fingerprint from those immutable values plus exact stored S sealed_at/created_at. It does not UPDATE the PUBLICATION segment. V and B derive the same value from immutable rows.","algorithm":"H(canonical typed complete immutable payload)","excludes":["current pointer","later lifecycle/event observations","retry ordinals","original ACK","V observed_at"],"field_lists":{"GLOBAL_ROW_KEYS":["snapshot_date","universe_code","complex_id","apt_name_ko","address_road","address_jibun","legal_dong_name","build_year","sigungu_code","sigungu_name","rank_all","tier_code","tier_label","tier_sort","market_cap_krw","market_cap_trillion_krw","market_cap_share","market_cap_share_pct","previous_rank_all","rank_delta_1d","rank_movement","is_top1000","total_household_count","household_count","priced_household_count","priced_household_ratio","total_cluster_count","priced_cluster_count","coverage_status","is_rank_eligible","eligibility_status","latitude","longitude","recovery_52w"],"HISTORY_STAGE_KEYS":["snapshot_date","complex_id","market_cap_krw","rank_all","total_market_cap"],"SERVICE_ROW_KEYS":["snapshot_date","universe_code","universe_name","universe_scope","complex_id","apt_name_ko","sigungu_name","legal_dong_name","build_year","household_count","total_household_count","recovery_52w","rank_all","previous_rank_all","rank_delta_w","rank_movement","market_cap_krw","market_cap_trillion_krw","market_cap_share","market_cap_share_pct","tier_code","tier_label","tier_sort","is_top1000","source_previous_snapshot_date","generated_at","refresh_run_id"],"SNAPSHOT_STAGE_KEYS":["snapshot_date","universe_code","complex_id","rank_all","market_cap_krw","market_cap_share","previous_rank_all","rank_delta_1d","is_top1000","rank_method","calculation_version","created_at"]},"includes":["Every generation parent field including plan/run/G/source lineage and original generated_at/verified_at","Every surface and universe/date-vector field","Every SERVICE and GLOBAL row field","Every history-stage and snapshot-stage field","Full sealed manifest semantic fields AND original sealed_at/created_at","S1/Projection/verification policy identity and frozen predecessor"],"note":"The pre-S candidate fingerprint binds manifest semantic content; final A fingerprint additionally binds S stored original clocks. Attach that S-clock binding once in A admission from immutable S COMPLETE, never regenerate generation clocks. G binding remains unchanged.","ordering":"Parent object sorted keys; surface_code; surface_code/universe_code; SERVICE universe_code/rank_all/complex_id; GLOBAL rank_all/complex_id; history snapshot_date/rank_all/complex_id; snapshot snapshot_date/universe_code/rank_all/complex_id. Exact uniqueness and cardinality before bidirectional EXCEPT ALL."},"hardened_C4":"REFERENCE_NOT_ACTIVE","historical_authority":"PRESERVED","historical_authority_sha256":"91CB558406B04403C8014C6E49C896EE0951FE6A4418C5C62925DB17F4821E71","historical_policy":{"M906":"SEALED seed/definition/ACL corrections inherited; no reapply/reseed","backfill":false,"classification":"FAILED_RECORDED / FAILED_EVIDENCED","excluded_failed_dates":["2026-08-27","2026-08-28","2026-08-29","2026-08-30","2026-08-31","2026-09-01","2026-09-02","2026-09-03"],"legacy_dispositions":{"append_daily_rank_history(date)":"REPLACE_IN_DAILY_PATH_WITH_NEW_PUBLISHER","run_koaptix_safe_finalize(date)":"DEPRECATE_FROM_SCHEDULER_BUT_RETAIN","sync_rank_snapshot_from_history(date)":"VERIFY_ONLY_POST_PUBLISH"},"old_consumed_authorities_retryable":false,"relabel_AS_PUBLISHED":false,"replay":false},"observability":{"durable_fields":["plan_id","phase","D","admission ordinal/run ID","input identity/hash","G","started_at","finished_at when observed","result class","original ACK known/unknown/unobserved","reconciliation class","output/content fingerprint","actual actor","sanitized error class/message"],"effect_audit":"COMPLETE row commits with each P/S/A/B/D effect; it records durable completion, never a fabricated client ACK. V verdict has actual actor.","historical_classification":"Operational results are separate from AS_PUBLISHED/FAILED_RECORDED/FAILED_EVIDENCED and Projection accounted observations.","observed_ack":"One bounded append-only observation batch at normal finish; unresolved crash leaves original ACK UNOBSERVED, not false success. A later recovery adds a separate observation; previous error/unknown record never overwritten.","results":["SUCCESS_NEW","SUCCESS_EXISTING","RECOVERED_COMMITTED","NOOP_ALREADY_COMPLETE","BLOCK_CONFLICT","BLOCK_PARTIAL","BLOCK_VERIFICATION","BLOCK_PREDECESSOR","BLOCK_BUDGET","BLOCK_EXPIRED","FAIL_PRECOMMIT","ACK_UNKNOWN"]},"phase_contracts":{"A":{"conflict":"Any natural/UUID/run/source-manifest/combined-digest collision resolves to a different G or any immutable value differs. New UUID/version is not an escape.","current_source":["supabase/migrations/202607310903_latest_board_atomic_generation.sql:413-806","supabase/migrations/202607310903_latest_board_atomic_generation.sql:2347-2753","supabase/migrations/202607310906_bootstrap_v2_compatibility_definition.sql:931-1340"],"durable_effect_key":"generation_id and unique source_authority_kind/source_authority_key and run_id","existing_success":"All parent/surface/universe/SERVICE/GLOBAL/history-stage/snapshot-stage rows equal the frozen complete payload, with exact lengths and bidirectional EXCEPT ALL after uniqueness checks; COMPLETE fingerprint matches. Return actual lifecycle: INACTIVE, PUBLISHED_CURRENT or PUBLISHED_NOT_CURRENT.","idempotency_key":["plan_id","build_key"],"new_effect":"Versioned entry reuses M903 full-array comparison and atomic insertion, moves existing recognition before mutable pointer/date checks and removes historical approval literals only in S1. Exact P Projection arrays and all validators remain required.","partial":"Any missing/extra row, absent parent/COMPLETE, malformed surface coverage or fingerprint mismatch; row count alone never suffices.","phase_plan_identity":"H([contract_sha,plan_id,\\"A\\",publication_segment_sha,manifest_semantic_sha,generation_fingerprint])","proposed_entry":"koaptix_s1.build(plan_id text, admission_ordinal smallint)","reconciliation":"Fresh V RR READ ONLY all seven generation relations, manifest, A COMPLETE and frozen plan; full typed equality/fingerprint. Mutable pointer read classifies lifecycle separately.","retry":"One extra identical G/payload only if wholly absent/rolled back and still eligible. Never complete/replace a committed partial G.","terminal_success":"COMPLETE_INACTIVE or exact existing completed lifecycle; this is not independent V PASS."},"B":{"conflict":"Any same GLOBAL or universe slot bound to a different plan/event/G/content, or any official row differs; caller-supplied G/hash/version never changes slot.","current_source":["supabase/migrations/202607310903_latest_board_atomic_generation.sql:2756-2979","supabase/migrations/202607310903_latest_board_atomic_generation.sql:778-806","supabase/migrations/202607310906_bootstrap_v2_compatibility_definition.sql:1341-1429"],"durable_effect_key":"GLOBAL publication_slot plus existing immutable event version/ID and complete required universe slots","existing_success":"Complete exact B tuple predicate below succeeds. Current head=requested event => ALREADY_PUBLISHED_CURRENT; continuous valid later PUBLISH descendant => ALREADY_PUBLISHED_NOT_CURRENT. Zero canonical/clock/version writes.","idempotency_key":["fixed publication_track","D"],"new_effect":"SERIALIZABLE transaction locks plan, publication pointer and manifest eligibility, checks V, reserves global/all universe slots, inserts full official history/snapshots, existing immutable PUBLISH event and B COMPLETE, updates pointer last via frozen full predecessor CAS, forces deferred constraints, commits together.","partial":"Any event/slot/official history/snapshot/COMPLETE component is absent or inconsistent; no event-only or pointer-only proof.","phase_plan_identity":"H([contract_sha,plan_id,\\"B\\",publication_segment_sha,expected_event_id,predecessor_tuple,generation_fingerprint])","proposed_entry":"koaptix_s1.publish(plan_id text, admission_ordinal smallint)","reconciliation":"Fresh V RR READ ONLY full event, G/manifest/full fingerprint, protected PASS, all slots, official whole-date row sets, B COMPLETE and current pointer ancestry. Original ACK remains UNKNOWN when unobserved.","retry":"Only exact absent/aborted B, budget/deadline available, same frozen predecessor, exact V PASS and still nonrevoked. SERIALIZABLE singleton lock/CAS arbitrates overlap. No rebase.","terminal_success":"PUBLISHED_NEW or exact prior canonical publication with explicit currentness; RECOVERED_COMMITTED is a separate operational recovery class."},"D":{"conflict":"Existing dated output or earliest-baseline/predecessor dependency differs; no UPSERT overwrite and no changed derivation version bypass of dated natural key.","current_source":[".handoff/runs/P-KOAPTIX-DATA-CLOCK-CANONICAL-DAILY-PUBLICATION-ORCHESTRATION-DESIGN.0/execution_evidence.json#/captured_catalog/helper_gap_definitions","supabase/migrations/202607310904_rank_canonical_publisher_binding.sql:1742-1976","supabase/migrations/202607310905_home_payload_publication_identity.sql"],"durable_effect_key":"summary(run_date,KOREA_ALL); index(snapshot_date,index_code) and unique(snapshot_date,universe_code,index_code); D COMPLETE","existing_success":"Exact stored complete summary/index rows including original clocks/IDs equal frozen expected results and D COMPLETE. Compare both natural keys. Current head alone proves nothing about old D.","idempotency_key":["B_event_id","derivation_policy_version"],"new_effect":"One transaction computes exact summary/index using existing arithmetic and fixed macro-set intersection; INSERT absent rows and COMPLETE together. No current-cache mutation: existing published views/Home derive from canonical pointer and dated data.","partial":"Only some expected summary/index outputs or missing D COMPLETE; block without repair.","phase_plan_identity":"H([contract_sha,plan_id,\\"D\\",B_event_id,B_version,G,derivation_policy_version,frozen_index_dependencies_sha])","proposed_entry":"koaptix_s1.derive(plan_id text, admission_ordinal smallint)","reconciliation":"Fresh V RR READ ONLY exact B tuple, full dated summary/index outputs, frozen baseline/prior inputs and D COMPLETE. Ordinary views are derived, not another completion marker.","retry":"One extra same B/dependencies after absent/abort; require frozen prior index dependency equality and completed relevant predecessor D. Conflict/partial/expired block.","terminal_success":"DERIVATION_COMPLETE; if absent/failed after B, B remains published and day is PUBLISHED_DERIVATION_PENDING."},"P":{"conflict":"Any alternate plan/input for track,D; changed target-row population, master selection/output, aliases/as-of date, map beforeimage, required history or Projection input versus the admitted freeze; ambiguous best-match/geography tie with different outputs.","current_source":["supabase/migrations/202607310900_rank_recovery_roles_and_acl.sql:75","supabase/migrations/202607310904_rank_canonical_publisher_binding.sql:75",".handoff/runs/P-KOAPTIX-DATA-CLOCK-CANONICAL-DAILY-PUBLICATION-ORCHESTRATION-DESIGN.0/execution_evidence.json#/captured_catalog/helper_gap_definitions","C:\\\\tmp\\\\koaptix_r51_wave001c_reference_regeneration_006\\\\sql\\\\010_application_schema_core.sql:1288"],"durable_effect_key":"koaptix_s1.phase_record(plan_id,P,COMPLETE,0)","existing_success":"Immutable PREPARATION segment and COMPLETE record resolve to one exact plan; stored full before/after images, affected IDs and fixed Projection result/fingerprint agree. Return original preparation timestamps/counters, zero business writes.","idempotency_key":["publication_track","D","P"],"new_effect":"Apply precomputed deterministic target-staging and affected-map changes, including one observation_count increment, with full beforeimage CAS. Run the unchanged Projection query against the verified post-P snapshot; store its raw complete output and source/preparation postimage evidence with P COMPLETE. Rollback all if capture or comparison fails.","partial":"COMPLETE without exact frozen result, or any plan-owned durable preparation footprint without COMPLETE. No repair.","phase_plan_identity":"H([contract_sha,plan_id,\\"P\\",preparation_input_sha,preparation_policy_version])","proposed_entry":"koaptix_s1.prepare(plan_id text, admission_ordinal smallint)","reconciliation":"Fresh V RR READ ONLY reads PREPARATION/phase records and complete stored postimages/Projection fragment. These were committed atomically with P; later mutable master/map rows are not evidence of the old effect. Downstream consumes the saved result, not current mutable rows.","retry":"One extra same preparation segment after definite precommit abort or independent ABSENT. Revalidate full frozen beforeimages in the new business snapshot; changed input blocks. No legacy helper call.","terminal_success":"PREPARED_FROZEN with complete Projection output saved in the same transaction."},"S":{"conflict":"Same natural slot or run_id with any different semantic manifest field, owner plan or input hash. S1 contract version does not create a new rank-input-v1 slot.","current_source":["supabase/migrations/202607310901_rank_canonical_input_contract.sql:27-160","supabase/migrations/202607310904_rank_canonical_publisher_binding.sql:939-1109"],"durable_effect_key":"koaptix_rank_input_authority_manifest(snapshot_date,authority_contract_version) plus unique run_id","existing_success":"Resolve run_id AND natural key to the same row; compare every non-clock manifest field against frozen manifest packet, and stored sealed_at=created_at against the S COMPLETE result. Stored original timestamps remain unchanged.","idempotency_key":["snapshot_date","authority_contract_version=rank-input-v1"],"new_effect":"Existing branch BEFORE forward-date/current-input admission. New branch reuses all M904 key/type/zero-error/same-transaction authority checks and exact immutable INSERT, plus S COMPLETE atomically.","partial":"Manifest/COMPLETE only one present for an S1 plan, duplicate/corrupt immutable state or incoherent clock fields.","phase_plan_identity":"H([contract_sha,plan_id,\\"S\\",publication_segment_sha,manifest_semantic_sha])","proposed_entry":"koaptix_s1.seal(plan_id text, admission_ordinal smallint)","reconciliation":"Fresh V RR READ ONLY full manifest plus immutable S COMPLETE, frozen publication segment and full semantic equality; do not require mutable current inputs for historical effect recognition.","retry":"Only exact absent/aborted plan under remaining budget/deadline, current source authority still equals original freeze. No re-seal overwrite.","terminal_success":"SEALED exact stored manifest; eligibility/revocation is a separate progression predicate."},"V":{"conflict":"Different policy, G, fingerprint, manifest, actor or verdict for the same plan,V; changing policy cannot replace FAIL.","current_source":["supabase/migrations/202607310906_bootstrap_v2_compatibility_definition.sql:931","supabase/migrations/202607310903_latest_board_atomic_generation.sql:2458-2730",".handoff/runs/P-KOAPTIX-DATA-CLOCK-FORWARD-PROJECTION-POLICY-CANONICALIZATION-AND-QUALIFICATION.0/source_candidates/tooling/koaptix/rank_publication/forward_projection_contract.py"],"durable_effect_key":"koaptix_s1.phase_record(plan_id,V,VERDICT,0)","existing_success":"Actual V login recorded exact complete immutable PASS/FAIL identity; duplicate identical append returns stored result and observed_at. Final FAIL stays FAIL.","idempotency_key":["plan_id","V"],"new_effect":"Admission audit transaction, fresh RR READ ONLY observation transaction, then one narrow append transaction on the same independent V connection. Caller must be actual session_user=koaptix_publication_verifier. No publication DML or W EXECUTE.","partial":"Incomplete/unreadable observed state is no PASS; transient connection failure is not a completed validation FAIL.","phase_plan_identity":"H([contract_sha,plan_id,\\"V\\",G,manifest_semantic_sha,generation_fingerprint,verification_policy_version])","proposed_entry":"koaptix_s1.record_verification(plan_id text, verdict jsonb)","reconciliation":"Fresh independent RR READ ONLY snapshot rechecks exact frozen plan and complete committed G. Protected DB record authenticates V, not W HTTP/JSON.","retry":"One extra only for transient pre-verdict transport/read failure or unknown append ACK; exact existing verdict resolves append ambiguity. Completed FAIL is terminal.","terminal_success":"Immutable protected PASS for exact expected fingerprint/policy; B rechecks eligibility and canonical state."}},"preparation_policy":{"as_of_date":"Fix client/DB TimeZone=UTC in the new runtime; freeze CURRENT_DATE and all semantic clocks at first admission. At the inherited 15:05 UTC tick this as_of_date equals D. Alias valid_to is compared to that frozen date, not a recaptured retry clock.","geography":"Apply merge newest target-row effect once, then affected-only all-history dominant location by count DESC, last_trade_date DESC NULLS LAST, lawd_cd ASC; preserve coalesce/greatest/least. Ties across sgg/umd producing different geography BLOCK_CONFLICT. No global backfill call.","master":"Reuse source selection order apt_complex first; full normalized master output from koaptix_build_master_source_sql, selected physical relation/column map and household aggregation are frozen, not silently switched on retry. Freeze normalized name/dong and household/build fields used by matching.","matching":"Preserve strict_exact, exact_unique, fuzzy_dong>=0.74, fuzzy_region>=0.80, non-Seoul alias-lawd unique fallback and existing tie order/ambiguity behavior. If source ranking leaves identical ordering keys with different resulting values, BLOCK_CONFLICT; do not choose a new policy.","other_inputs":"Freeze relevant complex_name_alias including valid_to evaluated against frozen as_of_date; map rows used by master; all historical staging observations for predicted affected complex IDs required for dominance; existing map full beforeimages. Also freeze exact Projection M/E, active master metadata, membership/region leaves and bounded prior official rows.","source_fact":"Legacy merge increments observation_count and uses current_date and now(); legacy global backfill sweeps all history. Both are reference semantics, not retry entrypoints. New P applies frozen exact patches with source-compatible fixed timestamps.","target_population":"All staging_market_raw rows WHERE run_date=D, identified by exact UUID set; merge match candidates require name and amount and accepted source_dataset predicate. Affected complex set is all nonnull complex IDs in predicted post-merge target rows.","version":"S1_AFFECTED_PREPARATION_V1"},"principals":{"DB_secret_count":2,"TCB":"DB durability, fixed DB definitions/owners and independent V implementation are trusted. Owner/superuser compromise or W+V collusion is outside the two-principal guarantee.","V":{"W_membership":false,"execute":["koaptix_s1.admit_phase(text,text) restricted to V/RECONCILE","koaptix_s1.read_evidence(text,text) read-only fixed modes","koaptix_s1.record_verification(text,jsonb)"],"login":"koaptix_publication_verifier","max_connections":1,"publication_mutation":false,"raw_DML":false,"read_surface":"read_evidence returns exact committed plan/manifest/revocation/all seven G tables/slots/event/official rows/current ancestry/dated outputs; no arbitrary query, relation or role argument. No direct public table grants needed."},"W":{"V_membership":false,"execute":["koaptix_s1.admit_due_occurrence()","koaptix_s1.admit_phase(text,text)","koaptix_s1.prepare(text,smallint)","koaptix_s1.seal(text,smallint)","koaptix_s1.build(text,smallint)","koaptix_s1.publish(text,smallint)","koaptix_s1.derive(text,smallint)","koaptix_s1.read_evidence(text,text)","koaptix_s1.append_observations(text,jsonb)"],"login":"koaptix_publication_writer","max_connections":2,"owner_membership":false,"raw_DML":false},"additional_non_DB_ingress_secrets":["W CRON_SECRET","W-to-V request credential; authenticates request only, cannot assert PASS"],"db_login_count":2,"deny":"PUBLIC default EXECUTE on new APIs revoked; default privileges corrected for new functions; W/V have no CREATE schema/TEMP arbitrary helper route, no old action role membership, seed/rollback/finalize/append access. Same fixed API checks actual session_user, typed key sets and installed S1 hash. Read_evidence has no hidden canonical write.","internal_owner":"koaptix_s1_owner NOLOGIN; only exact required underlying privileges. Existing canonical owners remain NOLOGIN; no runtime inherits/SETs them.","secret_boundary_count":2,"worker_project_count":2},"privilege_matrix":{"V":"CONNECT and USAGE koaptix_s1 plus role-constrained admit_phase/read_evidence/record_verification EXECUTE; no other action, table DML or W/owner membership.","W":"CONNECT and USAGE koaptix_s1 plus only W API EXECUTE list; no direct table/sequence DML or SELECT needed outside fixed read_evidence; no public schema CREATE or action/owner/V membership.","dated_output_guard":"For S1 dates, INSERT only through the fixed S1 owner entry; UPDATE/DELETE rejected, including legacy SECURITY DEFINER upserts. Preserve earlier rows. Add a statement-level BEFORE TRUNCATE rejection once S1 data exists, because row triggers alone cannot prevent a whole-table wipe. No change to historical row content or broad grant to runtime actors.","dynamic_read_binding":"Only the exact selected master/household relation from the source-proven finite selector is additionally readable; its resolved relation/column/body identity is installation-bound and frozen in the plan. No broad schema-wide SELECT/EXECUTE. Caller cannot select the relation or supply SQL.","immutable_source_policy":"The old NOLOGIN owners and their immutable guards stay. New S1 owner receives exactly required grants under an approved install; temporary administrative owner edges must be removed before activation. W/V receive no postgres/service_role/owner credential.","owner_A":"SELECT/INSERT on the generation parent, surface, universe, SERVICE, GLOBAL and two stage tables; EXECUTE exact existing typed digest/insert/verification/authority utilities; no generation UPDATE/DELETE.","owner_B":"SELECT/INSERT complex_rank_history, koaptix_rank_snapshot and immutable publication_event; SELECT/UPDATE singleton publication; required table-identified sequence privilege only if INSERT default requires it; no broad sequence grant. S1 API must preserve existing constraints and pointer trigger.","owner_D":"SELECT/INSERT koaptix_market_daily_summary and koaptix_index_snapshot; SELECT exact B and baseline/predecessor inputs. No dated-output UPDATE/DELETE; explicit insertion IDs/times frozen once.","owner_P":"SELECT on exact frozen source closure; UPDATE only explicit target staging columns, SELECT/INSERT/UPDATE on affected region-map rows through fixed P. Required typed columns come from source body/manifest; no arbitrary table parameter.","owner_S":"SELECT/INSERT on koaptix_rank_input_authority_manifest; SELECT revocation; EXECUTE compute_rank_input_authority and existing pure key/hash utilities. No manifest UPDATE/DELETE.","owner_control":"koaptix_s1_owner NOLOGIN owns the four private control tables and fixed S1 API functions. No runtime SET/ADMIN/INHERIT edge.","source_read_relations":["staging_market_raw","complex_name_alias","apt_complex","koaptix_complex_region_map","region_dim","apt_market_cap_snapshot","complex_eligibility_snapshot","v_koaptix_canonical_rank_input_u","v_koaptix_rank_membership_authority_u","v_koaptix_universe_membership_u","complex_rank_history","koaptix_rank_snapshot","koaptix_market_daily_summary","koaptix_index_snapshot"]},"projection":{"calculation_version":"v1","field_policy_count":173,"identity":"DCE7FA4FB351BD21DA1AB9B941234205A84108CA029FFE89A2B7A88D421D360A","policy":"PD01 NULL tier triple; PD02-PD10 and Dual Clock unchanged. Frozen source rows and prior-date vectors, never current-D official outputs.","query_sha256":"3DA412DFFD746141B505E5B7D1877618852443C5FA3FD0B7C5C0073C52EDD6E5","reference_days":"NO_NEW_SOURCE_INPUT / VERIFIED_NO_OUTPUT_CHANGE remain distinct accounted observations under the accepted complete-evidence rule. They create no fresh target-D S/A/B rows, slots or AS_PUBLISHED classification; inability to prove the reference condition blocks, never fabricates publication.","reference_record_contract":{"effective_boundary":"No claim that reference alone activates the first Projection publication; first accepted fresh published generation is still the activation boundary.","evidence":"Use the unchanged accepted reference validator plus complete stored comparison/input inventory and verified prior G/packet/vector bytes; never accept only a SHA-shaped string or Boolean. V independently validates and appends through the same V-only record_verification interface with mode=REFERENCE.","exact_keys":["expected_kst_day","observed_at","classification","observation_evidence_sha256","source_inventory_complete","prior_generation_id","prior_packet_sha256","prior_projection_contract_sha256","projection_contract_sha256","prior_business_sha256","current_business_sha256","prior_input_identity_sha256","current_input_identity_sha256","affected_universe_set_sha256","prior_date_vector_sha256"],"mode":"REFERENCE, distinct from GENERATION verification","separation":"B only accepts mode=GENERATION PASS for its exact fresh G. A reference verdict cannot satisfy B. Reference success skips S/A/B/D new effects and keeps original business dates. expected_kst_day is the occurrence KST accountability day; observed_at belongs to that day, distinct from D."},"source_path":".handoff/runs/P-KOAPTIX-DATA-CLOCK-FORWARD-PROJECTION-POLICY-CANONICALIZATION-AND-QUALIFICATION.0/explicit_forward_projection_candidate.sql","status":"UNCHANGED"},"proportionality_status":"CLOSED_BY_CTO_ACCEPTED_MATERIAL_SIMPLIFICATION","publication_identity":{"bundle_key":["publication_track","D"],"excluded_key_fields":["G","input_hash","calculation_version","contract_version","attempt_id","manifest_hash"],"expected_content_fields":["G","manifest identity/full semantic hash","Projection identity","full generation fingerprint","frozen predecessor","complete universe vector","event ID/version/time","verification policy/PASS"],"global_key":["publication_track","D","GLOBAL"],"required_universe_rule":"Exact sorted affected_universe_codes and full coverage vector from accepted Projection/M904 authority; KOREA_ALL must agree with GLOBAL. No caller subset.","track":"KOAPTIX_OFFICIAL_DAILY","track_allowlist":["KOAPTIX_OFFICIAL_DAILY"],"universe_key":["publication_track","D","U:<universe_code>"]},"qualification_scope":"This lane performs source reading and artifact integrity checks only; no SQL/model/application tests executed, no DB connection. G1-G18 PASS means contract and source qualification PLAN ready, not implemented/deployed/restored.","reconciliation":{"ack_rule":"Original ACK remains ACK_UNKNOWN/UNOBSERVED unless actually observed; later durable state proves commit, never receipt of the original ACK. RECOVERED_COMMITTED accompanies the exact effect identity and separate currentness.","admission_accounting":"The observation itself is read-only. A separate narrow control transaction may reserve the bounded observation ordinal; it is counted, not represented as a read-only transaction.","classes":["EXACT_COMMITTED","ABSENT_AT_SNAPSHOT","PARTIAL","CONFLICT","UNVERIFIABLE"],"isolation":"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY on fresh independent V connection; all relevant objects from one snapshot; COMMIT and close; evidence queries contain no writes/volatile mutator calls.","writes":0},"retry":{"bounds":{"child_request_seconds":60,"connect_seconds":5,"lock_seconds":1,"max_additional_business_per_phase":1,"max_reconciliation_reads_per_phase":2,"occurrence_seconds":300,"statement_seconds":20},"identity":"Same immutable phase plan and expected effect; durable admission ordinal=1 or2, allocated under plan row lock in a separate committed transaction; no ordinal3 or reset after rollback/restart.","max_W_starts":2,"max_phase_invocations":2,"no_hidden_retries":"Trusted W/V make at most one business submission for each admitted ordinal. Driver/HTTP automatic retry disabled. This is a durable admission/resource budget, not a C4 proof that a hostile actor cannot resubmit SQL after rollback. Canonical idempotence independently protects such resubmission.","overlap":"Old ambiguous backend may remain alive. Plan row locks, manifest/generation natural keys, immutable completion, GLOBAL/U slots and singleton CAS ensure overlapping same-plan requests cannot create conflicting canonical effects. Busy/unavailable is a safe bounded failure.","policy":{"V_FAIL":"BLOCK_VERIFICATION; no automatic retry","budget_exhausted":"BLOCK_BUDGET; no reset/reissue","conflict":"BLOCK_CONFLICT; no overwrite","expiry":"no new business invocation; exact committed read-only reconciliation remains allowed","original_ACK_unknown":"independent read-only reconcile first; exact committed => RECOVERED_COMMITTED; absent => at most one same-plan extra","partial":"BLOCK_PARTIAL; no continuation","precommit_transient_error":"one extra if exact plan still eligible and wholly absent","reconciliation_absent":"snapshot absence is not rollback proof; original and retry arbitrate same DB keys/locks"},"serialization_errors":"40001, 40P01, lock/timeout or connection errors are never generic loop triggers. Classify precommit versus commit unknown, independently reconcile if needed and consume at most the remaining ordinal."},"safety":["At least once delivery allowed, at most one canonical meaning per official identity","No partial/unverified/wrong-lineage official generation","Official history/snapshots/event/slots/pointer/audit atomic","No same-slot conflict treated as retry success","No delayed current-pointer/read-model regression","No historical failure relabeling"],"scheduler":{"carrier":"Existing Vercel platform, two isolated new W/V projects; platform cron wakes W directly. This is a proposed deployment binding, not a statement a worker exists.","current_job_evidence":".handoff/carrier_attempt1/native_pgcron_findings.md","date_mapping_evidence":".handoff/carrier_attempt1/readonly_query_manifest.json:18; inherited job command uses ((now() at time zone Asia/Seoul)::date - 1).","migration":"Q5 disables old job1 koaptix-daily-snapshot publication invocation, retaining its identity/history/definition, before enabling W schedule. No pg_net/dblink/http/queue/dispatcher provision; prior capture says these HTTP extensions absent.","occurrence":"Immutable scheduled tick and D stored on first admission. Only the [tick,tick+300 seconds) window may create new occurrence; D>installed activation boundary and official predecessor. Exact-plan resumes always name the existing plan; never remap a failed old plan to today. Late undated wakeup outside a due window creates nothing.","readiness":"Q4 must prove selected project timing, packaging/driver, direct DB connection and two secret scopes. Insufficient schedule precision or duration is a rollout qualification failure, not permission to widen dates/retries or create a broker.","schedule_utc":"5 15 * * *","source":"C07/C09","wakeup":"GET /api/index authenticated with CRON_SECRET; no caller-selected D/G/track/SQL. Wakeup is an undated signal. The DB fixed admission function selects only its current eligible schedule tick and assigns D=KST schedule date minus1."},"status":"PROSPECTIVE_LOCAL_NORMATIVE_CANDIDATE","verification_policy":{"failure":"Final FAIL immutable; new hash/version cannot replace it for same plan,V. Transport error has no final verdict. B cannot publish solely because its own internal verifier passed.","observed_state_identity":"H([plan/publication segment,S COMPLETE,A COMPLETE,full G/manifest fingerprint]); report snapshot xid for diagnostics only","trusted_append":"Actual session_user must equal koaptix_publication_verifier; owner validates all typed bindings and immutable observed-state identity before append; W has no append grant or membership. DB-protected verdict required, copied unsigned JSON insufficient.","verdict_fields":["contract_sha","plan_id","verification_policy_version","D","G","manifest_run_id","manifest semantic hash","Projection identity","full generation fingerprint including stored manifest clocks","verifier_session_user","PASS or FAIL","observed immutable state identity","observed_at"],"version":"S1_FULL_GENERATION_V1"}}'

SURFACE_CODES = ("GLOBAL_LATEST", "UNIVERSE_SERVICE")


SHA256_RE = re.compile(r"^[0-9A-F]{64}$")


SURFACE_COMPONENT_KEYS = (
    "surface_code",
    "snapshot_date",
    "previous_snapshot_date",
    "date_vector_sha256",
    "universe_count",
    "row_count",
    "full_row_digest_sha256",
    "component_manifest_sha256",
)


SERVICE_UNIVERSE_KEYS = (
    "universe_code",
    "snapshot_date",
    "previous_snapshot_date",
    "expected_row_count",
    "row_digest_sha256",
)


SERVICE_ROW_KEYS = (
    "snapshot_date",
    "universe_code",
    "universe_name",
    "universe_scope",
    "complex_id",
    "apt_name_ko",
    "sigungu_name",
    "legal_dong_name",
    "build_year",
    "household_count",
    "total_household_count",
    "recovery_52w",
    "rank_all",
    "previous_rank_all",
    "rank_delta_w",
    "rank_movement",
    "market_cap_krw",
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
    "tier_code",
    "tier_label",
    "tier_sort",
    "is_top1000",
    "source_previous_snapshot_date",
    "generated_at",
    "refresh_run_id",
)


SERVICE_DIGEST_KEYS = SERVICE_ROW_KEYS[:24]


GLOBAL_ROW_KEYS = (
    "snapshot_date",
    "universe_code",
    "complex_id",
    "apt_name_ko",
    "address_road",
    "address_jibun",
    "legal_dong_name",
    "build_year",
    "sigungu_code",
    "sigungu_name",
    "rank_all",
    "tier_code",
    "tier_label",
    "tier_sort",
    "market_cap_krw",
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
    "previous_rank_all",
    "rank_delta_1d",
    "rank_movement",
    "is_top1000",
    "total_household_count",
    "household_count",
    "priced_household_count",
    "priced_household_ratio",
    "total_cluster_count",
    "priced_cluster_count",
    "coverage_status",
    "is_rank_eligible",
    "eligibility_status",
    "latitude",
    "longitude",
    "recovery_52w",
)


HISTORY_STAGE_KEYS = (
    "snapshot_date",
    "complex_id",
    "market_cap_krw",
    "rank_all",
    "total_market_cap",
)


SNAPSHOT_STAGE_KEYS = (
    "snapshot_date",
    "universe_code",
    "complex_id",
    "rank_all",
    "market_cap_krw",
    "market_cap_share",
    "previous_rank_all",
    "rank_delta_1d",
    "is_top1000",
    "rank_method",
    "calculation_version",
    "created_at",
)


SERVICE_NUMERIC_TEXT_KEYS = {
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
}


GLOBAL_NUMERIC_TEXT_KEYS = {
    "market_cap_trillion_krw",
    "market_cap_share",
    "market_cap_share_pct",
    "priced_household_ratio",
    "latitude",
    "longitude",
}


DIGEST_INTEGER_KEYS = {
    "complex_id",
    "build_year",
    "household_count",
    "total_household_count",
    "rank_all",
    "previous_rank_all",
    "rank_delta_w",
    "rank_delta_1d",
    "market_cap_krw",
    "tier_sort",
    "priced_household_count",
    "total_cluster_count",
    "priced_cluster_count",
}


DIGEST_BOOLEAN_KEYS = {"is_top1000", "is_rank_eligible"}


class ContractError(ValueError):
    """Raised before any database action when a packet or query is invalid."""


def _decimal_json_text(value: Decimal) -> str:
    if not value.is_finite():
        raise ContractError("non-finite JSON numbers are prohibited")
    rendered = format(value, "f")
    if value.is_zero() and rendered.startswith("-"):
        rendered = rendered[1:]
    return rendered


def canonical_json(value: object) -> str:
    """Serialize exactly, retaining JSON decimal scale and rejecting floats."""

    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, Decimal):
        return _decimal_json_text(value)
    if isinstance(value, float):
        raise ContractError("binary floating-point JSON values are prohibited")
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, allow_nan=False)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, Mapping):
        if any(not isinstance(key, str) for key in value):
            raise ContractError("JSON object keys must be strings")
        return "{" + ",".join(
            canonical_json(key) + ":" + canonical_json(value[key])
            for key in sorted(value)
        ) + "}"
    raise ContractError(f"unsupported JSON value type: {type(value).__name__}")


def sha256_json(value: object) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest().upper()


def _exact_object(value: object, keys: Sequence[str], label: str) -> Mapping[str, Any]:
    if not isinstance(value, dict) or set(value) != set(keys):
        missing = sorted(set(keys) - set(value) if isinstance(value, dict) else set(keys))
        extra = sorted(set(value) - set(keys) if isinstance(value, dict) else set())
        raise ContractError(f"{label} exact key mismatch; missing={missing}, extra={extra}")
    return value


def _exact_object_array(
    packet: Mapping[str, Any], key: str, keys: Sequence[str], *, nonempty: bool = True
) -> list[Mapping[str, Any]]:
    value = packet.get(key)
    if not isinstance(value, list) or (nonempty and not value):
        raise ContractError(f"{key} must be a nonempty array")
    return [_exact_object(item, keys, f"{key}[{index}]") for index, item in enumerate(value)]


def _canonical_date_value(value: object, label: str, *, nullable: bool = False) -> str | None:
    if value is None and nullable:
        return None
    if not isinstance(value, str):
        raise ContractError(f"{label} must be a canonical date string")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ContractError(f"{label} must be a canonical date string") from exc
    if parsed.isoformat() != value:
        raise ContractError(f"{label} must be a canonical date string")
    return value


def _canonical_timestamp_value(value: object, label: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise ContractError(f"{label} must be an ISO-8601 timestamptz")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ContractError(f"{label} must be an ISO-8601 timestamptz") from exc
    if parsed.tzinfo is None:
        raise ContractError(f"{label} must include a timezone")
    return parsed


def _integer_value(value: object, label: str, *, minimum: int = 0) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum:
        raise ContractError(f"{label} must be an integer >= {minimum}")
    return value


def _postgres_numeric_text(value: object, label: str) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool) or isinstance(value, float):
        raise ContractError(f"{label} must be an exact JSON decimal or integer")
    try:
        number = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ContractError(f"{label} must be an exact PostgreSQL numeric") from exc
    return _decimal_json_text(number)


def _row_digest(
    rows: Sequence[Mapping[str, Any]],
    keys: Sequence[str],
    numeric_text_keys: set[str],
) -> str:
    rendered: list[tuple[tuple[object, ...], str]] = []
    for index, row in enumerate(rows):
        snapshot_date = _canonical_date_value(row.get("snapshot_date"), f"row[{index}].snapshot_date")
        universe_code = row.get("universe_code")
        if not isinstance(universe_code, str) or not universe_code:
            raise ContractError(f"row[{index}].universe_code must be nonblank")
        rank_all = _integer_value(row.get("rank_all"), f"row[{index}].rank_all", minimum=1)
        complex_id = _integer_value(row.get("complex_id"), f"row[{index}].complex_id", minimum=1)
        values: list[object] = []
        for key in keys:
            item = row.get(key)
            if key == "snapshot_date":
                item = snapshot_date
            elif key in numeric_text_keys:
                item = _postgres_numeric_text(item, f"row[{index}].{key}")
            elif key in DIGEST_INTEGER_KEYS:
                if item is not None and (
                    not isinstance(item, int) or isinstance(item, bool)
                ):
                    raise ContractError(f"row[{index}].{key} must be an integer or null")
            elif key in DIGEST_BOOLEAN_KEYS:
                if item is not None and not isinstance(item, bool):
                    raise ContractError(f"row[{index}].{key} must be boolean or null")
            values.append(item)
        rendered.append(((snapshot_date, universe_code, rank_all, complex_id), canonical_json(values)))
    ordered = sorted(rendered, key=lambda item: item[0])
    if len({item[0] for item in ordered}) != len(ordered):
        raise ContractError("surface rows contain a duplicate canonical row identity")
    material = canonical_json(list(keys)) + "\n" + "".join(
        row_json + "\n" for _, row_json in ordered
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest().upper()


def _ordered_row_array_digest(
    rows: Sequence[Mapping[str, Any]], sort_keys: Sequence[str]
) -> str:
    try:
        ordered = sorted(rows, key=lambda row: tuple(row[key] for key in sort_keys))
    except (KeyError, TypeError) as exc:
        raise ContractError("candidate stage rows cannot be deterministically ordered") from exc
    identities = [tuple(row[key] for key in sort_keys) for row in ordered]
    if len(identities) != len(set(identities)):
        raise ContractError("candidate stage rows contain duplicate canonical identities")
    return sha256_json(ordered)


def _component_manifest(component: Mapping[str, Any]) -> str:
    material = {
        "date_vector_sha256": component["date_vector_sha256"],
        "full_row_digest_sha256": component["full_row_digest_sha256"],
        "row_count": component["row_count"],
        "snapshot_date": component["snapshot_date"],
        "surface_code": component["surface_code"],
        "universe_count": component["universe_count"],
    }
    return sha256_json(material)


def _combined_surface_manifest(components: Sequence[Mapping[str, Any]]) -> str:
    material = [
        {
            "date_vector_sha256": component["date_vector_sha256"],
            "full_row_digest_sha256": component["full_row_digest_sha256"],
            "row_count": component["row_count"],
            "snapshot_date": component["snapshot_date"],
            "surface_code": component["surface_code"],
            "universe_count": component["universe_count"],
        }
        for component in sorted(components, key=lambda item: str(item["surface_code"]))
    ]
    return sha256_json(material)


def _require_string(packet: Mapping[str, Any], key: str) -> str:
    value = packet.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{key} must be a nonblank string")
    return value


def _require_uuid(packet: Mapping[str, Any], key: str) -> str:
    value = _require_string(packet, key)
    try:
        parsed = uuid.UUID(value)
    except ValueError as exc:
        raise ContractError(f"{key} must be a canonical UUID") from exc
    if str(parsed) != value:
        raise ContractError(f"{key} must use canonical lowercase UUID text")
    return value


def _require_sha256(packet: Mapping[str, Any], key: str) -> str:
    value = _require_string(packet, key)
    if not SHA256_RE.fullmatch(value):
        raise ContractError(f"{key} must be an uppercase SHA-256 digest")
    return value


def validate_generation_inputs(
    packet: Mapping[str, Any],
    *,
    expected_initial_seed_vector_rows: Sequence[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    """Recompute every surface digest and manifest from the supplied rows.

    Normal BUILD/PUBLISH callers retain the original behavior by omitting
    ``expected_initial_seed_vector_rows``.  The bootstrap runner supplies the
    exact immutable vector to additionally close the three initial-seed
    provenance fields without widening normal publication authority.
    """

    components = _exact_object_array(
        packet, "surface_components", SURFACE_COMPONENT_KEYS
    )
    if [item.get("surface_code") for item in components] != list(SURFACE_CODES):
        raise ContractError("surface_components must be sorted exactly by required surface code")
    universes = _exact_object_array(
        packet, "service_universes", SERVICE_UNIVERSE_KEYS
    )
    service_rows = _exact_object_array(packet, "service_rows", SERVICE_ROW_KEYS)
    global_rows = _exact_object_array(packet, "global_rows", GLOBAL_ROW_KEYS)

    # PD01: normal forward packets have no stored tier authority. The existing
    # explicit immutable bootstrap-vector path remains historical compatibility.
    if expected_initial_seed_vector_rows is None:
        for surface_name, rows in (("service_rows", service_rows), ("global_rows", global_rows)):
            for index, row in enumerate(rows):
                if any(row[key] is not None for key in ("tier_code", "tier_label", "tier_sort")):
                    raise ContractError(
                        f"{surface_name}[{index}] forward tier triple must be null (PD01)"
                    )

    if expected_initial_seed_vector_rows is not None:
        packet_generated_at = packet.get("generated_at")
        _canonical_timestamp_value(
            packet_generated_at, "initial_seed.generated_at"
        )
        execution_run_id = _require_string(packet, "execution_run_id")
        for index, row in enumerate(service_rows):
            row_generated_at = row.get("generated_at")
            _canonical_timestamp_value(
                row_generated_at,
                f"initial_seed.service_rows[{index}].generated_at",
            )
            if row_generated_at != packet_generated_at:
                raise ContractError(
                    "initial-seed service row generated_at differs from packet generated_at"
                )
            if row.get("refresh_run_id") != execution_run_id:
                raise ContractError(
                    "initial-seed service row refresh_run_id differs from packet execution_run_id"
                )

    service_digest = _row_digest(
        service_rows, SERVICE_DIGEST_KEYS, SERVICE_NUMERIC_TEXT_KEYS
    )
    global_digest = _row_digest(global_rows, GLOBAL_ROW_KEYS, GLOBAL_NUMERIC_TEXT_KEYS)

    universe_codes = [item.get("universe_code") for item in universes]
    if (
        any(not isinstance(code, str) or not code for code in universe_codes)
        or universe_codes != sorted(set(universe_codes))
    ):
        raise ContractError("service_universes must be sorted and distinct")
    rows_by_universe: dict[str, list[Mapping[str, Any]]] = {
        str(code): [] for code in universe_codes
    }
    for row in service_rows:
        code = row.get("universe_code")
        if code not in rows_by_universe:
            raise ContractError(f"service row names undeclared universe {code!r}")
        rows_by_universe[str(code)].append(row)

    vector_rows: list[dict[str, Any]] = []
    for index, universe in enumerate(universes):
        code = str(universe["universe_code"])
        rows = rows_by_universe[code]
        if not rows:
            raise ContractError(f"service universe {code} has no rows")
        dates = {
            _canonical_date_value(row.get("snapshot_date"), f"service_rows[{code}].snapshot_date")
            for row in rows
        }
        previous_dates = {
            _canonical_date_value(
                row.get("source_previous_snapshot_date"),
                f"service_rows[{code}].source_previous_snapshot_date",
                nullable=True,
            )
            for row in rows
        }
        if len(dates) != 1 or len(previous_dates) != 1:
            raise ContractError(f"service universe {code} has mixed source dates")
        snapshot_date = next(iter(dates))
        previous_date = next(iter(previous_dates))
        if previous_date is not None and previous_date >= snapshot_date:
            raise ContractError(f"service universe {code} predecessor must be earlier than its observation")
        ranks = sorted(
            _integer_value(row.get("rank_all"), f"service_rows[{code}].rank_all", minimum=1)
            for row in rows
        )
        if ranks != list(range(1, len(rows) + 1)):
            raise ContractError(f"service universe {code} has a rank gap")
        if universe.get("snapshot_date") != snapshot_date:
            raise ContractError(f"service universe {code} snapshot_date differs from rows")
        if universe.get("previous_snapshot_date") != previous_date:
            raise ContractError(
                f"service universe {code} previous_snapshot_date differs from rows"
            )
        if universe.get("expected_row_count") != len(rows):
            raise ContractError(f"service universe {code} row count differs from rows")
        row_digest = _row_digest(rows, SERVICE_DIGEST_KEYS, SERVICE_NUMERIC_TEXT_KEYS)
        _require_sha256(universe, "row_digest_sha256")
        if universe["row_digest_sha256"] != row_digest:
            raise ContractError(f"service universe {code} row digest mismatch")
        vector_rows.append(
            {
                "max_rank": len(rows),
                "min_rank": 1,
                "previous_date": previous_date,
                "row_count": len(rows),
                "snapshot_date": snapshot_date,
                "universe_code": code,
            }
        )

    service_date_vector = sha256_json(vector_rows)
    if expected_initial_seed_vector_rows is not None and vector_rows != list(
        expected_initial_seed_vector_rows
    ):
        raise ContractError(
            "initial-seed source_previous_snapshot_date values differ from the exact accepted vector"
        )
    global_dates = {
        _canonical_date_value(row.get("snapshot_date"), "global_rows.snapshot_date")
        for row in global_rows
    }
    if len(global_dates) != 1:
        raise ContractError("global_rows must carry exactly one snapshot date")
    if {row.get("universe_code") for row in global_rows} != {"KOREA_ALL"}:
        raise ContractError("global_rows must use only KOREA_ALL")
    global_ranks = sorted(
        _integer_value(row.get("rank_all"), "global_rows.rank_all", minimum=1)
        for row in global_rows
    )
    if global_ranks != list(range(1, len(global_rows) + 1)):
        raise ContractError("global_rows contain a rank gap")

    component_map = {str(item["surface_code"]): item for item in components}
    derived_components = [
        {
            "surface_code": "GLOBAL_LATEST",
            "snapshot_date": next(iter(global_dates)),
            "date_vector_sha256": None,
            "universe_count": 1,
            "row_count": len(global_rows),
            "full_row_digest_sha256": global_digest,
        },
        {
            "surface_code": "UNIVERSE_SERVICE",
            "snapshot_date": None,  # PD04: the per-universe vector is the sole SERVICE date authority.
            "date_vector_sha256": service_date_vector,
            "universe_count": len(universes),
            "row_count": len(service_rows),
            "full_row_digest_sha256": service_digest,
        },
    ]
    for derived in derived_components:
        derived["component_manifest_sha256"] = _component_manifest(derived)
        supplied = component_map[str(derived["surface_code"])]
        for key, value in derived.items():
            if supplied.get(key) != value:
                raise ContractError(
                    f"{derived['surface_code']} {key} differs from recomputed rows"
                )
        previous = supplied.get("previous_snapshot_date")
        _canonical_date_value(
            previous,
            f"{derived['surface_code']}.previous_snapshot_date",
            nullable=True,
        )
        if derived["surface_code"] == "UNIVERSE_SERVICE":
            if previous is not None:
                raise ContractError(
                    "UNIVERSE_SERVICE previous_snapshot_date must be null (PD04)"
                )

    combined = _combined_surface_manifest(derived_components)
    _require_sha256(packet, "combined_surface_manifest_sha256")
    if packet["combined_surface_manifest_sha256"] != combined:
        raise ContractError("combined_surface_manifest_sha256 differs from recomputed rows")

    if "history_stage_rows" in packet:
        history_rows = _exact_object_array(
            packet, "history_stage_rows", HISTORY_STAGE_KEYS
        )
        snapshot_rows = _exact_object_array(
            packet, "snapshot_stage_rows", SNAPSHOT_STAGE_KEYS
        )
        affected = packet.get("affected_universe_codes")
        if not isinstance(affected, list) or {
            row.get("universe_code") for row in snapshot_rows
        } != set(affected):
            raise ContractError(
                "snapshot_stage_rows must cover exactly the affected universes"
            )
    else:
        history_rows = []
        snapshot_rows = []
    return {
        "surface_components": components,
        "result_surface_components": [
            {
                **derived,
                "affected_date_aligned": True,
                "cross_surface_common_fields_equal": True,
            }
            for derived in derived_components
        ],
        "combined_surface_manifest_sha256": combined,
        "service_date_vector_sha256": service_date_vector,
        "service_vector_rows": vector_rows,
        "history_stage_row_count": len(history_rows),
        "snapshot_stage_row_count": len(snapshot_rows),
        "history_stage_sha256": _ordered_row_array_digest(
            history_rows, ("snapshot_date", "rank_all", "complex_id")
        ),
        "snapshot_stage_sha256": _ordered_row_array_digest(
            snapshot_rows,
            ("snapshot_date", "universe_code", "rank_all", "complex_id"),
        ),
        "snapshot_stage_per_universe": {
            code: sum(1 for row in snapshot_rows if row.get("universe_code") == code)
            for code in packet.get("affected_universe_codes", [])
        },
    }


CONTRACT_NAME = "KOAPTIX_S1_IDEMPOTENT_FORWARD_PUBLICATION"
CONTRACT_VERSION = "1.0.0"
CONTRACT_SHA256 = "74EC0431ECD2FEE2D50AA6DC93D9464AC074EDD7DF2C5213CA0605D479BE3050"
PROJECTION_IDENTITY = "DCE7FA4FB351BD21DA1AB9B941234205A84108CA029FFE89A2B7A88D421D360A"
PROJECTION_QUERY_SHA256 = "3DA412DFFD746141B505E5B7D1877618852443C5FA3FD0B7C5C0073C52EDD6E5"
HISTORICAL_AUTHORITY_SHA256 = "91CB558406B04403C8014C6E49C896EE0951FE6A4418C5C62925DB17F4821E71"
PUBLICATION_TRACK = "KOAPTIX_OFFICIAL_DAILY"
PLAN_VERSION = "S1_FROZEN_PLAN_V1"
PREPARATION_POLICY = "S1_AFFECTED_PREPARATION_V1"
VERIFICATION_POLICY = "S1_FULL_GENERATION_V1"
DERIVATION_POLICY = "S1_DERIVED_INDEX_V1"
MAX_ADMISSIONS = 2
MAX_W_STARTS = 2
PHASES = ("W_START", "P", "S", "A", "V", "B", "D", "R_P", "R_S", "R_A", "R_B", "R_D")
W_PHASES = frozenset(("W_START", "P", "S", "A", "B", "D"))
V_PHASES = frozenset(("V", "R_P", "R_S", "R_A", "R_B", "R_D"))
RECORD_KINDS = ("ADMIT", "COMPLETE", "VERDICT", "OBSERVE")
RESULTS = frozenset((
    "SUCCESS_NEW", "SUCCESS_EXISTING", "RECOVERED_COMMITTED", "NOOP_ALREADY_COMPLETE",
    "BLOCK_CONFLICT", "BLOCK_PARTIAL", "BLOCK_VERIFICATION", "BLOCK_PREDECESSOR",
    "BLOCK_BUDGET", "BLOCK_EXPIRED", "FAIL_PRECOMMIT", "ACK_UNKNOWN",
))
EXCLUDED_FAILED_DATES = frozenset((
    "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30",
    "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03",
))
SOURCE_PATHS = (
    "supabase/migrations/202607310910_idempotent_daily_publication.sql",
    "tooling/koaptix/idempotent_publication/contracts.py",
    "tooling/koaptix/idempotent_publication/forward_projection.py",
    "tooling/koaptix/idempotent_publication/queries/forward_projection.sql",
    "tooling/koaptix/idempotent_publication/tests/test_contract.py",
    "tooling/koaptix/idempotent_publication/qualification_fixture.sql",
    "services/koaptix_daily/writer/api/index.py",
    "services/koaptix_daily/writer/requirements.txt",
    "services/koaptix_daily/writer/vercel.json",
    "services/koaptix_daily/verifier/api/index.py",
    "services/koaptix_daily/verifier/requirements.txt",
    "services/koaptix_daily/verifier/vercel.json",
)


def load_exact_json(text: str, *, contract: bool = False) -> Any:
    """Reject duplicate fields before PostgreSQL jsonb or Python dict can lose them."""
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ContractError("duplicate JSON key: " + key)
            result[key] = value
        return result

    def invalid(value):
        raise ContractError("forbidden JSON number: " + value)

    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid,
                      parse_float=invalid if contract else Decimal)


def canonical_contract() -> dict[str, Any]:
    value = load_exact_json(CANONICAL_CONTRACT_JSON, contract=True)
    if canonical_json(value) != CANONICAL_CONTRACT_JSON or sha256_json(value) != CONTRACT_SHA256:
        raise ContractError("S1 contract identity mismatch")
    return value


def utc_timestamp(value: str) -> str:
    return _canonical_timestamp_value(value, "timestamp").astimezone(timezone.utc).isoformat(
        timespec="microseconds").replace("+00:00", "Z")


def publication_key(track: str, business_date: str) -> tuple[str, str]:
    if track != PUBLICATION_TRACK:
        raise ContractError("fixed official publication track required")
    return track, _canonical_date_value(business_date, "D")


def occurrence_plan_id(business_date: str, scheduled_tick_utc: str) -> str:
    publication_key(PUBLICATION_TRACK, business_date)
    if business_date in EXCLUDED_FAILED_DATES:
        raise ContractError("historical failed date cannot be replayed")
    tick = _canonical_timestamp_value(scheduled_tick_utc, "scheduled tick")
    if scheduled_tick_utc != utc_timestamp(scheduled_tick_utc):
        raise ContractError("scheduled tick must use fixed canonical UTC")
    if (tick.hour, tick.minute, tick.second, tick.microsecond) != (15, 5, 0, 0):
        raise ContractError("unexpected scheduled tick")
    if tick.date().isoformat() != business_date:
        raise ContractError("KST occurrence date minus one must equal D")
    return sha256_json([CONTRACT_SHA256, PUBLICATION_TRACK, business_date, scheduled_tick_utc])


def validate_ordinal(phase: str, kind: str, ordinal: int, actor: str) -> None:
    if phase not in PHASES or kind not in RECORD_KINDS:
        raise ContractError("unknown phase/record kind")
    _integer_value(ordinal, "ordinal")
    if kind in ("COMPLETE", "VERDICT"):
        if ordinal != 0:
            raise ContractError("terminal record ordinal must be zero")
    elif ordinal not in (1, 2):
        raise ContractError("BLOCK_BUDGET")
    if actor not in ("koaptix_publication_writer", "koaptix_publication_verifier"):
        raise ContractError("invalid runtime principal")
    if kind == "VERDICT" and (phase != "V" or actor != "koaptix_publication_verifier"):
        raise ContractError("only independent V records a verdict")
    if kind == "ADMIT" and phase not in (W_PHASES if actor.endswith("writer") else V_PHASES):
        raise ContractError("phase belongs to the other principal")


def required_slots(universes: Sequence[str]) -> tuple[str, ...]:
    if not universes or list(universes) != sorted(set(universes)) or "KOREA_ALL" not in universes:
        raise ContractError("exact frozen universe set required")
    if any(not isinstance(x, str) or not re.fullmatch(r"[A-Z0-9_]+", x) for x in universes):
        raise ContractError("invalid universe code")
    return ("GLOBAL",) + tuple("U:" + code for code in universes)


def full_rows_equal(expected: Sequence[Mapping[str, Any]], actual: Sequence[Mapping[str, Any]],
                    fields: Sequence[str], key: Sequence[str]) -> bool:
    """Complete typed equality; count and digest alone do not establish equality."""
    def indexed(rows):
        result = {}
        for row in rows:
            _exact_object(dict(row), fields, "full row")
            identity = tuple(row[k] for k in key)
            if identity in result:
                raise ContractError("duplicate row identity")
            result[identity] = canonical_json([row[k] for k in fields])
        return result
    return indexed(expected) == indexed(actual)


def classify_effect(expected: Mapping[str, Any], actual: Mapping[str, Any] | None,
                    *, has_partial_footprint: bool = False) -> str:
    """Pure classification only; database locks and constraints enforce the effect."""
    publication_key(expected["publication_track"], expected["D"])
    if has_partial_footprint:
        return "BLOCK_PARTIAL"
    if actual is None:
        return "ABSENT_AT_SNAPSHOT"
    publication_key(actual["publication_track"], actual["D"])
    if canonical_json(expected) != canonical_json(actual):
        return "BLOCK_CONFLICT"
    return "SUCCESS_EXISTING"


def reconcile_result(committed_class: str, original_ack: str) -> dict[str, str]:
    if original_ack not in ("OBSERVED", "UNKNOWN", "UNOBSERVED"):
        raise ContractError("invalid original ACK observation")
    if committed_class not in ("EXACT_COMMITTED", "ABSENT_AT_SNAPSHOT", "PARTIAL", "CONFLICT", "UNVERIFIABLE"):
        raise ContractError("invalid reconciliation class")
    return {
        "original_ack": original_ack,
        "durable_state": committed_class,
        "result": "RECOVERED_COMMITTED" if committed_class == "EXACT_COMMITTED" else committed_class,
    }


PREPARATION_KEYS = (
    "plan_version", "contract_sha", "plan_id", "publication_track", "D", "scheduled_tick_utc",
    "as_of_date", "projection_identity", "preparation_policy_version", "verification_policy_version",
    "derivation_policy_version", "calculation_version", "G", "event_id", "summary_id", "manifest_run_id",
    "A_run_id", "B_run_id", "generated_at", "verified_at", "stage_created_at", "event_recorded_at",
    "predecessor", "inputs", "patch", "preparation_input_sha", "manual_override_allowed",
    "max_phase_invocations", "max_W_starts", "admission_deadline",
)
PREDECESSOR_KEYS = ("D", "active_event_id", "active_generation_id", "previous_generation_id", "publication_version", "published_at")
DATA_ARRAYS = {
    "surface_components": (SURFACE_COMPONENT_KEYS, ("surface_code",)),
    "service_universes": (SERVICE_UNIVERSE_KEYS, ("universe_code",)),
    "service_rows": (SERVICE_ROW_KEYS, ("universe_code", "complex_id")),
    "global_rows": (GLOBAL_ROW_KEYS, ("complex_id",)),
    "history_stage_rows": (HISTORY_STAGE_KEYS, ("snapshot_date", "complex_id")),
    "snapshot_stage_rows": (SNAPSHOT_STAGE_KEYS, ("snapshot_date", "universe_code", "complex_id")),
}


def validate_frozen_plan(p: Mapping[str, Any]) -> None:
    _exact_object(dict(p), PREPARATION_KEYS, "PREPARATION")
    expected = {
        "contract_sha": CONTRACT_SHA256, "plan_version": PLAN_VERSION,
        "publication_track": PUBLICATION_TRACK, "projection_identity": PROJECTION_IDENTITY,
        "preparation_policy_version": PREPARATION_POLICY, "verification_policy_version": VERIFICATION_POLICY,
        "derivation_policy_version": DERIVATION_POLICY, "calculation_version": "v1", "as_of_date": p["D"],
    }
    if any(p[k] != v for k, v in expected.items()):
        raise ContractError("frozen plan policy binding mismatch")
    if p["D"] <= "2026-09-03" or p["plan_id"] != occurrence_plan_id(p["D"], p["scheduled_tick_utc"]):
        raise ContractError("frozen occurrence identity mismatch")
    for k in ("G", "event_id", "summary_id"):
        _require_uuid(p, k)
    for field, phase in (("manifest_run_id", "S"), ("A_run_id", "A"), ("B_run_id", "B")):
        if p[field] != "S1:" + p["plan_id"] + ":" + phase:
            raise ContractError("fixed run identity mismatch")
    for k in ("max_phase_invocations", "max_W_starts"):
        if _integer_value(p[k], k) != 2:
            raise ContractError("bounded invocation budget mismatch")
    if type(p["manual_override_allowed"]) is not bool:
        raise ContractError("manual override policy must be explicit")
    for key in ("generated_at", "verified_at", "stage_created_at", "event_recorded_at", "admission_deadline"):
        if p[key] != utc_timestamp(p[key]):
            raise ContractError("noncanonical frozen clock")
    from datetime import timedelta
    tick = _canonical_timestamp_value(p["scheduled_tick_utc"], "tick")
    if _canonical_timestamp_value(p["admission_deadline"], "deadline") != tick + timedelta(seconds=300):
        raise ContractError("fixed deadline mismatch")
    _exact_object(dict(p["predecessor"]), PREDECESSOR_KEYS, "predecessor")
    if p["predecessor"]["D"] >= p["D"]:
        raise ContractError("predecessor must be earlier than D")
    _integer_value(p["predecessor"]["publication_version"], "predecessor version", minimum=1)
    for key in ("active_event_id", "active_generation_id"):
        _require_uuid(p["predecessor"], key)
    if p["preparation_input_sha"] != sha256_json({"inputs": p["inputs"], "patch": p["patch"]}):
        raise ContractError("frozen complete input/patch fingerprint mismatch")


def terminal_record(evidence: Mapping[str, Any], phase: str, kind: str = "COMPLETE") -> Mapping[str, Any] | None:
    found = []
    seen = set()
    for r in evidence["records"]:
        identity = (r["phase"], r["record_kind"], r["ordinal"])
        if identity in seen or r["plan_id"] != evidence["preparation"]["plan_id"]:
            raise ContractError("duplicate or foreign phase record")
        seen.add(identity)
        validate_ordinal(r["phase"], r["record_kind"], r["ordinal"], r["actor"])
        if identity == (phase, kind, 0):
            found.append(r["payload"])
    return found[0] if found else None


def verify_generation_material(expected: Mapping[str, Any], actual: Mapping[str, Any]) -> None:
    _exact_object(dict(actual), expected.keys(), "immutable generation material")
    if not expected["parent"] or not expected["manifest"]:
        raise ContractError("incomplete expected generation")
    for k in ("parent", "manifest", "contract_sha", "projection_identity", "verification_policy_version", "predecessor"):
        if canonical_json(actual[k]) != canonical_json(expected[k]):
            raise ContractError("immutable generation differs: " + k)
    _exact_object(dict(actual["data"]), expected["data"].keys(), "generation data")
    for name, (fields, keys) in DATA_ARRAYS.items():
        if not full_rows_equal(expected["data"][name], actual["data"][name], fields, keys):
            raise ContractError("full generation rows differ: " + name)
    validate_generation_inputs(actual["data"])
    if canonical_json(expected) != canonical_json(actual):
        raise ContractError("full immutable generation fingerprint differs")


def publication_currentness(e: Mapping[str, Any]) -> str:
    p, head = e["preparation"], e["head"]
    target = p["predecessor"]["publication_version"] + 1
    by_version = {r["publication_version"]: r for r in e["ancestry"]}
    if len(by_version) != len(e["ancestry"]):
        raise ContractError("duplicate event version")
    version, generation, day = head["publication_version"], head["active_generation_id"], head["D"]
    while version > target:
        event, previous = by_version.get(version), by_version.get(version - 1)
        if not event or not previous or event["event_type"] != "PUBLISH" or event["to_generation_id"] != generation:
            raise ContractError("incompatible publication ancestry")
        if event["expected_previous_version"] != version - 1 or event["from_generation_id"] != previous["to_generation_id"]:
            raise ContractError("publication ancestry tuple mismatch")
        if previous["D"] >= day or previous["recorded_at"] > event["recorded_at"]:
            raise ContractError("publication ancestry regresses")
        version, generation, day = version - 1, event["from_generation_id"], previous["D"]
    if version != target or generation != p["G"] or day != p["D"]:
        raise ContractError("completed event is not a continuous ancestor")
    return "ALREADY_PUBLISHED_CURRENT" if head["active_event_id"] == p["event_id"] else "ALREADY_PUBLISHED_NOT_CURRENT"


def verify_evidence(e: Mapping[str, Any], phase: str) -> str:
    """Classify one complete committed snapshot; never treats absence as rollback."""
    from .forward_projection import assemble_projection
    p = e["preparation"]
    validate_frozen_plan(p)
    if e["contract_sha"] != CONTRACT_SHA256 or phase not in ("P", "S", "A", "V", "B", "D"):
        raise ContractError("evidence contract/mode mismatch")
    done = terminal_record(e, phase, "VERDICT" if phase == "V" else "COMPLETE")
    if phase == "P":
        if done is None:
            if canonical_json(e["P_current_inputs"]) != canonical_json(p["inputs"]) or canonical_json(e["P_current_patch"]) != canonical_json(p["patch"]):
                return "CONFLICT"
            return "ABSENT_AT_SNAPSHOT"
        if done["patch"] != p["patch"] or done["preparation_input_sha"] != p["preparation_input_sha"]:
            return "CONFLICT"
        if sha256_json(done["projection"]) != done["projection_sha"]:
            return "PARTIAL"
        inventory = done.get("source_inventory")
        if not isinstance(inventory, dict) or sha256_json(inventory) != done.get("source_inventory_sha"):
            return "PARTIAL"
        if done["projection"] is None:
            if p["inputs"]["market"] or p["inputs"]["eligibility"]:
                return "CONFLICT"
        else:
            assemble_projection(done["projection"])
        return "EXACT_COMMITTED"
    if phase == "S":
        if done is None and not e["manifest_candidates"]:
            return "ABSENT_AT_SNAPSHOT"
        if done is None or e["manifest"] is None:
            return "PARTIAL" if done is not None else "CONFLICT"
        if e["manifest_candidates"] != [e["manifest"]] or done["manifest"] != e["manifest"]:
            return "CONFLICT"
        expected = e["publication"]["manifest_semantics"]
        actual = {k: v for k, v in e["manifest"].items() if k not in ("sealed_at", "created_at")}
        if canonical_json(expected) != canonical_json(actual) or e["manifest"]["sealed_at"] != e["manifest"]["created_at"]:
            return "CONFLICT"
        return "EXACT_COMMITTED"
    if phase in ("A", "V"):
        material = e["actual_generation"]
        footprint = material["parent"] is not None or any(material["data"][k] for k in DATA_ARRAYS)
        if not footprint and not e["generation_collisions"] and done is None:
            return "ABSENT_AT_SNAPSHOT"
        if e["generation_collisions"] != [p["G"]]:
            return "CONFLICT"
        if terminal_record(e, "A") is None or verify_evidence(e, "S") != "EXACT_COMMITTED":
            return "PARTIAL"
        if verify_evidence(e, "P") != "EXACT_COMMITTED":
            return "PARTIAL"
        q = e["publication"]
        p_done = terminal_record(e, "P")
        if (q["preparation_segment_sha"] != sha256_json(p) or q["P_complete_sha"] != sha256_json(p_done)
                or q["projection"] != p_done["projection"] or q["projection_sha"] != sha256_json(q["projection"])
                or q["manifest_semantic_sha"] != sha256_json(q["manifest_semantics"])
                or q["candidate_generation_payload_sha"] != sha256_json(q["packet"])
                or q["build_key"] != sha256_json([p["plan_id"], q["manifest_semantic_sha"],
                                                 {k: v for k, v in q["packet"].items() if k != "generation_id"}])):
            return "CONFLICT"
        if canonical_json(assemble_projection(q["projection"])) != canonical_json(q["data"]):
            return "CONFLICT"
        verify_generation_material(e["expected_generation"], material)
        fingerprint = sha256_json(material)
        if fingerprint != e["generation_fingerprint"] or terminal_record(e, "A")["generation_fingerprint"] != fingerprint:
            return "CONFLICT"
        if phase == "V":
            if done is None:
                return "ABSENT_AT_SNAPSHOT"
            if done["mode"] != "GENERATION" or done["generation_fingerprint"] != fingerprint or done["verdict"] != "PASS":
                return "CONFLICT"
        return "EXACT_COMMITTED"
    if phase == "B":
        footprint = e["slots"] or e["event_candidates"] or e["official"]["history"] or e["official"]["snapshot"]
        if not footprint and done is None:
            return "ABSENT_AT_SNAPSHOT"
        if done is None or e["event"] is None:
            return "PARTIAL"
        if verify_evidence(e, "V") != "EXACT_COMMITTED":
            return "CONFLICT"
        event = {
            "publication_version": p["predecessor"]["publication_version"] + 1, "event_id": p["event_id"],
            "event_type": "PUBLISH", "from_generation_id": p["predecessor"]["active_generation_id"],
            "to_generation_id": p["G"], "plan_run_id": p["plan_id"], "execution_run_id": p["B_run_id"],
            "expected_previous_version": p["predecessor"]["publication_version"], "recorded_at": p["event_recorded_at"],
        }
        if e["event"] != event or e["event_candidates"] != [event]:
            return "CONFLICT"
        slots = required_slots(e["publication"]["required_universes"])
        if tuple(s["slot_code"] for s in e["slots"]) != slots:
            return "PARTIAL"
        for s in e["slots"]:
            expected = {"publication_track": PUBLICATION_TRACK, "d": p["D"], "slot_code": s["slot_code"],
                        "plan_id": p["plan_id"], "publication_kind": "PUBLICATION", "event_id": p["event_id"],
                        "publication_version": event["publication_version"], "generation_id": p["G"], "recorded_at": p["event_recorded_at"]}
            if s != expected:
                return "CONFLICT"
        for official, stage in (("history", "history_stage_rows"), ("snapshot", "snapshot_stage_rows")):
            fields, keys = DATA_ARRAYS[stage]
            if not full_rows_equal(e["publication"]["data"][stage], e["official"][official], fields, keys):
                return "PARTIAL"
        if done["event_id"] != p["event_id"] or done["generation_fingerprint"] != e["generation_fingerprint"]:
            return "CONFLICT"
        if done["bundle_digest"] != sha256_json([e["publication"]["data"], p["event_id"],
                                                event["publication_version"], p["predecessor"]]):
            return "CONFLICT"
        publication_currentness(e)
        return "EXACT_COMMITTED"
    if not e["derivation"]["summary"] and not e["derivation"]["index"] and done is None:
        return "ABSENT_AT_SNAPSHOT"
    if done is None or e["expected_derivation"] is None:
        return "PARTIAL"
    if verify_evidence(e, "B") != "EXACT_COMMITTED":
        return "CONFLICT"
    if canonical_json(e["derivation"]) != canonical_json(e["expected_derivation"]) or done["outputs"] != e["expected_derivation"]:
        return "CONFLICT"
    return "EXACT_COMMITTED"


def generation_verdict(e: Mapping[str, Any]) -> dict[str, Any]:
    p, q = e["preparation"], e["publication"]
    if e["session_user"] != "koaptix_publication_verifier" or q is None:
        raise ContractError("independent V committed observation required")
    try:
        valid = verify_evidence(e, "A") == "EXACT_COMMITTED" and not e["revocations"]
        observed_identity = sha256_json([
            {"preparation": p, "publication": q}, terminal_record(e, "S"), terminal_record(e, "A"),
            sha256_json(e["actual_generation"]),
        ])
        valid = valid and observed_identity == e["observed_state_identity"]
    except (ContractError, KeyError, TypeError, ValueError):
        valid = False
    return {
        "mode": "GENERATION", "contract_sha": CONTRACT_SHA256, "plan_id": p["plan_id"], "D": p["D"], "G": p["G"],
        "manifest_run_id": p["manifest_run_id"], "manifest_semantic_sha": q["manifest_semantic_sha"],
        "projection_identity": PROJECTION_IDENTITY, "generation_fingerprint": e["generation_fingerprint"],
        "verification_policy_version": VERIFICATION_POLICY, "verifier_session_user": e["session_user"],
        "verdict": "PASS" if valid else "FAIL", "observed_state_identity": e["observed_state_identity"], "observed_at": e["observed_at"],
    }


def reference_material(e: Mapping[str, Any]) -> dict[str, Any]:
    """Full immutable comparison bytes, excluding observation time/current head."""
    prior = e["reference_prior"]
    if not isinstance(prior, dict):
        raise ContractError("first fresh Projection publication is required before reference")
    return {
        "preparation": e["preparation"], "P_complete": terminal_record(e, "P"),
        "prior_preparation": prior["preparation"], "prior_publication": prior["publication"],
        "prior_P_complete": terminal_record(prior, "P"), "prior_S_complete": terminal_record(prior, "S"),
        "prior_A_complete": terminal_record(prior, "A"), "prior_V_verdict": terminal_record(prior, "V", "VERDICT"),
        "prior_B_complete": terminal_record(prior, "B"), "prior_generation": prior["actual_generation"],
        "prior_event": prior["event"], "prior_slots": prior["slots"], "prior_official": prior["official"],
    }


def reference_candidate(e: Mapping[str, Any]) -> str | None:
    """Choose only a proved reference; changed output remains a fresh generation."""
    from . import forward_projection as fp
    if verify_evidence(e, "P") != "EXACT_COMMITTED":
        raise ContractError("reference needs coherent P completion")
    pc = terminal_record(e, "P")
    prior = e.get("reference_prior")
    if prior is None:
        if pc["projection"] is None:
            raise ContractError("empty input has no verified prior S1 reference")
        return None
    if prior["preparation"]["G"] != e["preparation"]["predecessor"]["active_generation_id"]:
        raise ContractError("reference must name the exact frozen predecessor")
    if verify_evidence(prior, "B") != "EXACT_COMMITTED" or prior["revocations"]:
        raise ContractError("reference prior bundle is not complete and verified")
    before = terminal_record(prior, "P")
    if canonical_json(pc["source_inventory"]) == canonical_json(before["source_inventory"]):
        return "NO_NEW_SOURCE_INPUT"
    if pc["projection"] is None:
        raise ContractError("input inventory changed without a complete current Projection")
    current = fp.assemble_projection(pc["projection"])
    if fp.business_sha256(current) == fp.business_sha256(prior["publication"]["data"]):
        return "VERIFIED_NO_OUTPUT_CHANGE"
    return None


def reference_verdict(e: Mapping[str, Any], *, observed_at: str | None = None) -> dict[str, Any]:
    from datetime import timedelta
    from . import forward_projection as fp
    p = e["preparation"]
    if e["session_user"] != "koaptix_publication_verifier":
        raise ContractError("reference observation requires the actual independent V subject")
    if (e["publication"] is not None or e["manifest_candidates"] or e["generation_collisions"]
            or e["event_candidates"] or e["slots"] or any(e["official"].values())
            or any(e["derivation"].values())):
        raise ContractError("reference cannot cover fresh target-D publication effects")
    classification = reference_candidate(e)
    if classification is None:
        raise ContractError("changed output cannot be a reference")
    material = reference_material(e)
    prior = e["reference_prior"]
    prior_q = prior["publication"]
    before, current = material["prior_P_complete"], material["P_complete"]
    observed = observed_at or e["observed_at"]
    if utc_timestamp(observed) != observed:
        raise ContractError("reference observation clock must be canonical UTC")
    data = fp.assemble_projection(current["projection"]) if current["projection"] is not None else prior_q["data"]
    descriptor = {
        "generation_id": prior["preparation"]["G"], "packet_sha256": sha256_json(prior_q["packet"]),
        "projection_contract_sha256": prior["preparation"]["projection_identity"], "data": prior_q["data"],
        "input_identity_sha256": sha256_json(before["source_inventory"]),
        "affected_universe_set_sha256": prior_q["manifest_semantics"]["affected_universe_set_sha256"],
    }
    receipt = {
        "expected_kst_day": (date.fromisoformat(p["D"]) + timedelta(days=1)).isoformat(),
        "observed_at": observed, "classification": classification,
        "observation_evidence_sha256": sha256_json(material), "source_inventory_complete": True,
        "prior_generation_id": descriptor["generation_id"], "prior_packet_sha256": descriptor["packet_sha256"],
        "prior_projection_contract_sha256": descriptor["projection_contract_sha256"],
        "projection_contract_sha256": PROJECTION_IDENTITY, "prior_business_sha256": fp.business_sha256(prior_q["data"]),
        "current_business_sha256": fp.business_sha256(data),
        "prior_input_identity_sha256": descriptor["input_identity_sha256"],
        "current_input_identity_sha256": sha256_json(current["source_inventory"]),
        "affected_universe_set_sha256": descriptor["affected_universe_set_sha256"],
        "prior_date_vector_sha256": prior_q["data"]["surface_components"][1]["date_vector_sha256"],
    }
    fp.validate_daily_observation_reference(receipt, descriptor, data)
    return {
        "mode": "REFERENCE", "contract_sha": CONTRACT_SHA256, "plan_id": p["plan_id"], "D": p["D"],
        "projection_identity": PROJECTION_IDENTITY, "verification_policy_version": VERIFICATION_POLICY,
        "verifier_session_user": e["session_user"], "verdict": "PASS", "observed_at": observed,
        "observed_state_identity": sha256_json(material), "reference": receipt, "comparison_evidence": material,
    }
