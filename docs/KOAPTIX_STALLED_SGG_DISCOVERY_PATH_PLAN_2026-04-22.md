# KOAPTIX Stalled SGG Discovery Path Plan - 2026-04-22

## Purpose / Baseline

This document records a discovery-path investigation for stalled SGG staged exposure after repeated batch-18 HOLD results.

- Branch checked: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- HEAD checked: `9149efa`
- Latest relevant commit: `9149efa docs(koaptix): add stalled sgg paginated discovery audit`
- Current enabled SGG count baseline: 52
- Current last enabled SGG order baseline: 152
- Batch-17: fully complete
- Batch-18 readiness, evidence refresh, readonly audit, wide sweep, and paginated discovery: HOLD
- Batch-18 actual open: not performed

## Current Stall Summary

The stall is not proven evidence absence across all possible non-enabled SGGs. It is a discovery-path failure:

- Exact direct reads for the known stalled target set completed without DB errors but returned no evidence.
- Live enumeration against `v_koaptix_latest_universe_rank_board_u` timed out.
- Prefix-bounded enumeration against `v_koaptix_latest_universe_rank_board_u` also timed out on active SGG-heavy prefixes.

Therefore:

- For the nine previously stalled targets, current evidence is absent.
- For the broader non-enabled SGG universe, the current query shape times out before an exhaustive candidate pool can be produced.

## What Was Already Attempted

- Batch-18 readiness review: HOLD / `NONE`.
- Batch-18 evidence refresh: HOLD / `NONE`.
- Batch-18 readonly audit: HOLD after exact direct diagnostics for the nine known stalled targets returned no latest board rows, snapshot dates, or dynamic samples.
- Wide sweep: timed out querying all `SGG_%` rows from `v_koaptix_latest_universe_rank_board_u`.
- Paginated discovery: avoided the all-SGG sweep, but `LIKE 'SGG_XX%'` chunks still timed out for active prefixes including `SGG_11%`, `SGG_26%`, `SGG_27%`, `SGG_28%`, `SGG_29%`, `SGG_30%`, `SGG_31%`, `SGG_32%`, `SGG_33%`, `SGG_36%`, `SGG_41%`, `SGG_43%`, `SGG_44%`, `SGG_46%`, `SGG_47%`, `SGG_48%`, and `SGG_50%`.

## Existing Repo / Ops Assets Reviewed

- `src/lib/koaptix/universes.ts`
- `src/lib/koaptix/queries.ts`
- `src/app/api/rankings/route.ts`
- `src/app/api/map/route.ts`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/diagnose-sgg-direct-read.mjs`
- `docs/sql/KOAPTIX_universe_readiness_audit_2026-04-13.sql`
- `docs/sql/KOAPTIX_sgg_batch2_candidate_audit_2026-04-14.sql`
- `docs/KOAPTIX_BATCH18_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH18_EVIDENCE_REFRESH_2026-04-22.md`
- `docs/KOAPTIX_BATCH18_READONLY_AUDIT_2026-04-22.md`
- `docs/KOAPTIX_STALLED_SGG_WIDE_SWEEP_2026-04-22.md`
- `docs/KOAPTIX_STALLED_SGG_PAGINATED_DISCOVERY_2026-04-22.md`
- Prior batch readiness docs from batch-6 through batch-17
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`

## Discovery-Path Findings

Existing lighter source/path found:

- Prior successful readiness flows used `region_dim` as the active sigungu enumeration source, then excluded currently enabled SGGs from `src/lib/koaptix/universes.ts`.
- Batch-7 documented a completed `region_dim`-based scan of 308 active sigungu rows, 278 non-enabled SGGs, and 173 source-of-truth READY candidates.
- Batch-9 and batch-10 documented later bounded scans from `region_dim` plus source-of-truth views, sampling priority and not-ready non-enabled candidates instead of sweeping the latest board view directly.
- `scripts/diagnose-sgg-direct-read.mjs` already provides exact per-code read-only evidence checks against:
  - `koaptix_rank_snapshot`
  - `v_koaptix_latest_universe_rank_board_u`
  - `v_koaptix_universe_rank_history_dynamic`

What is too heavy:

- Discovery by scanning `v_koaptix_latest_universe_rank_board_u` with broad `SGG_%` filters is too heavy.
- Prefix `LIKE` filters are still too heavy for active SGG-heavy prefixes.
- The old docs SQL candidate audit groups all SGG rows from `v_koaptix_latest_universe_rank_board_u`; it is useful as historical shape, but should not be rerun as the next stalled-discovery step because it resembles the timed-out board-view sweep.

Exact read-only path to use next:

1. Enumerate candidate universe codes from `region_dim` only:
   - `select 'SGG_' || region_code as universe_code, full_name_ko, region_name_ko from region_dim where region_type = 'sigungu'`
2. Exclude currently enabled registry codes from `src/lib/koaptix/universes.ts`.
3. Process remaining codes in small bounded batches, using exact equality reads per code:
   - latest snapshot: `koaptix_rank_snapshot.eq('universe_code', code).order('snapshot_date', descending).limit(1)`
   - latest board sample: `v_koaptix_latest_universe_rank_board_u.eq('universe_code', code).order('rank_all').limit(1)`
   - dynamic sample: `v_koaptix_universe_rank_history_dynamic.eq('universe_code', code).eq('snapshot_date', latestSnapshot).order('rank_all').limit(1)`
4. Prefer bounded chunks and early stop after enough READY candidates are found for the next staged batch.

Why this should avoid the current timeout behavior:

- `region_dim` is the candidate-code source, not the heavy latest-board source.
- Board and dynamic reads happen only after a concrete code is selected.
- Exact `universe_code = <code>` reads match the direct diagnostic path that completed for the stalled targets.
- The next operation can stop after finding a small READY set rather than requiring exhaustive board-view enumeration.

No existing permanent materialized candidate table or repo-local generated candidate artifact was found. The lighter path exists as an ops pattern plus reusable exact-read diagnostic shape, not as a finished one-command discovery script.

## Final Decision

EXISTING_LIGHTWEIGHT_PATH_FOUND

Use the existing `region_dim` active-sigungu enumeration path with registry exclusion and bounded exact per-code source-of-truth evidence reads. Do not retry wide or prefix scans against `v_koaptix_latest_universe_rank_board_u`.

## Recommended Next Step

Run a read-only `region_dim`-seeded SGG candidate discovery prompt:

- no actual open
- no registry/code/API/SQL/source-of-truth changes
- enumerate active sigungu codes from `region_dim`
- exclude the 52 enabled SGGs from `src/lib/koaptix/universes.ts`
- check small chunks with exact per-code reads
- stop once the prompt has a concrete READY set or a documented bounded HOLD

## Explicit Non-Action Statement

- Actual open performed: no
- Registry edit performed: no
- `src/lib/koaptix/universes.ts` modified: no
- Code, API routes, SQL, source-of-truth, components, scripts, package, env, test/gate, and generated artifacts modified: no
- DB evidence fabricated: no
