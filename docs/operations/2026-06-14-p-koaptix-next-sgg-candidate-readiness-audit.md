# P-KOAPTIX-NEXT-SGG-CANDIDATE-READINESS-AUDIT

- status: NEXT_SGG_CANDIDATE_READINESS_AUDIT
- execution_type: read-only planning
- date: 2026-06-14
- target_report: `docs/operations/2026-06-14-p-koaptix-next-sgg-candidate-readiness-audit.md`
- branch: `main`
- base_head: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`
- origin_main: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`

## Document Status

This is a read-only planning audit.

It is not public exposure approval, not registry modification approval, not DB write approval, not helper/materializer approval, and not push/deploy approval.

No source code, registry flags, DB objects, helpers, materializers, package/config/env files, public assets, runtime API behavior, build/test/smoke flow, commit, push, deploy, rollback, or revert were modified or executed in this lane.

## One-Line Conclusion

No SGG candidate is READY_NOW for direct public registry exposure from repo/docs-only evidence. The best next follow-up target is `SGG_29155` / 광주광역시 남구, but only for a fresh SELECT-only DB readiness recheck; direct registry patch should wait for CTO acceptance and current source-of-truth evidence.

## Evidence Sources

Repo guard:

- `git rev-parse --abbrev-ref HEAD`: `main`
- `git rev-parse HEAD`: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`
- `git ls-remote origin refs/heads/main`: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`
- local worktree contains unrelated untracked files; no staged changes were present.

Repo/docs inspected:

- `docs/koaptix/KOAPTIX_STANDARD_SGG_ROLLOUT_PROCESS.md`
- `docs/koaptix/KOAPTIX_OPERATING_PRINCIPLES_FLEXIBILITY_UPDATE.md`
- `docs/koaptix/00_MASTER_LIVING_SOURCE_OF_TRUTH.md`
- `docs/koaptix/KOAPTIX_LOCAL_ARTIFACT_SCRIPT_INDEX.md`
- `docs/operations/2026-06-14-p-jeonbuk-sgg-52111-registry-release-completion.md`
- `docs/operations/2026-06-14-p-koaptix-command-palette-sgg-52111-region-search-discovery-completion.md`
- `docs/ops/2026-06-06-P-HOME-DELIVERY-STABILITY.5R-closeout.md`
- `docs/KOAPTIX_REGION_DIM_SGG_DISCOVERY_2026-04-22.md`
- `docs/KOAPTIX_STALLED_SGG_DISCOVERY_PATH_PLAN_2026-04-22.md`
- `docs/KOAPTIX_STALLED_SGG_PAGINATED_DISCOVERY_2026-04-22.md`
- `docs/KOAPTIX_BATCH30_READINESS_REVIEW_2026-04-25.md`
- `docs/KOAPTIX_BATCH31_READINESS_REVIEW_2026-04-25.md`
- targeted `rg` reads for `SGG_29155`, `SGG_30110`, `SGG_30140`, `SGG_28115`, `SGG_28116`, `SGG_28265`, and `SGG_28720`.

Source files inspected read-only:

- `src/lib/koaptix/universes.ts`
- `src/components/home/CommandPalette.tsx`
- `src/app/api/rankings/route.ts`
- `src/app/api/search/route.ts`
- `src/app/api/map/route.ts`

DB read-only diagnostic:

- attempted: false
- status: `DB_READ_ONLY_DIAGNOSTIC_SKIPPED_NO_SAFE_ENV_CONTEXT`
- reason: no safe DB connection environment variable was available from the current shell. `.env.local` exists but was not read because it may contain secrets.

Source of truth path:

`koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`

The audit did not treat membership-only existence as readiness.

## Current Public / Exposure Baseline

Current registry inspection found:

- total public registry objects parsed: `103`
- current SGG registry entries: `85`
- current enabled/public SGG entries: `85`
- current disabled SGG placeholders in registry: `0`
- `SGG_52111` / 전주시 완산구: enabled, home/search/ranking/map enabled, already public, already discoverable.
- `SGG_52113` / 전주시 덕진구: enabled and previously production-smoke healthy.
- `JEONBUK_ALL`: disabled, home/search/ranking/map disabled; JEONBUK_ALL remains disabled and is not a candidate.

Already public enabled SGG exclusions detected from current registry:

`SGG_11710`, `SGG_11650`, `SGG_11680`, `SGG_41135`, `SGG_11440`, `SGG_11560`, `SGG_11590`, `SGG_11500`, `SGG_11290`, `SGG_11230`, `SGG_11740`, `SGG_11470`, `SGG_11170`, `SGG_11410`, `SGG_11200`, `SGG_11110`, `SGG_11140`, `SGG_11215`, `SGG_11260`, `SGG_11305`, `SGG_11320`, `SGG_11350`, `SGG_11380`, `SGG_11530`, `SGG_11545`, `SGG_11620`, `SGG_41360`, `SGG_48250`, `SGG_41465`, `SGG_41220`, `SGG_41463`, `SGG_29170`, `SGG_28260`, `SGG_27290`, `SGG_31140`, `SGG_27260`, `SGG_41150`, `SGG_41390`, `SGG_44133`, `SGG_29200`, `SGG_27230`, `SGG_26350`, `SGG_28185`, `SGG_48330`, `SGG_41173`, `SGG_48170`, `SGG_48310`, `SGG_26410`, `SGG_26290`, `SGG_48123`, `SGG_50110`, `SGG_41171`, `SGG_26110`, `SGG_26140`, `SGG_26170`, `SGG_26200`, `SGG_26230`, `SGG_26260`, `SGG_26320`, `SGG_26380`, `SGG_26440`, `SGG_26470`, `SGG_26500`, `SGG_26530`, `SGG_26710`, `SGG_27110`, `SGG_27140`, `SGG_27170`, `SGG_27200`, `SGG_27710`, `SGG_27720`, `SGG_28110`, `SGG_28140`, `SGG_28177`, `SGG_28200`, `SGG_28237`, `SGG_28245`, `SGG_28710`, `SGG_29110`, `SGG_29140`, `SGG_51110`, `SGG_51150`, `SGG_51820`, `SGG_52113`, `SGG_52111`.

## Candidate Matrix

Classification vocabulary: READY_NOW / NEAR_READY / HOLD / BLOCKED / ALREADY_PUBLIC.

There are `0` READY_NOW public-exposure candidates from repo/docs-only evidence. The matrix below ranks candidates for a follow-up read-only DB audit, not for immediate exposure.

| Rank | universe_code | Korean label | lawd/sigungu code | Registry status | Latest board row_count | Latest board date / snapshot date | Source-gap / data-quality notes | Rollout simplicity notes | Business/product notes | Safety/regression notes | Score | Classification | Recommended next action |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| 1 | `SGG_29155` | 광주광역시 남구 | `29155` | absent from current registry | full row_count not captured; historical rank-1 sample existed | historical `2026-04-24`; sample `포스코더샵`, `complex_id=168923`, `rank_all=1` | Evidence-positive in batch-31, but stale and not freshly rechecked; full latest-board count, snapshot consistency, dynamic sample, null/zero quality checks unavailable in this lane. | Requires new registry entry if later approved; label/search aliases must be checked because current registry has duplicate short district labels such as `남구`. | Best continuity after `SGG_29110` and `SGG_29140` Gwangju public exposure. | Low expected regression if exact DB evidence passes; hard blocker remains fresh source-of-truth verification. | 70 | NEAR_READY | Run `P-KOAPTIX-NEXT-SGG-CANDIDATE-DB-READONLY-AUDIT.0`; make `SGG_29155` first exact-read target. |
| 2 | `SGG_30110` | 대전광역시 동구 | `30110` | absent from current registry | full row_count not captured; historical rank-1 sample existed | historical `2026-04-24`; sample `e편한세상대전에코포레`, `complex_id=170429`, `rank_all=1` | Evidence-positive in batch-31 but stale; needs fresh latest snapshot, latest board, dynamic board, and data-quality check. | Requires new registry entry and search label/alias review; short `동구` label is ambiguous across cities. | Strong next regional expansion alternative after Gwangju continuity. | Low expected regression if exact DB evidence passes; no macro dependency. | 66 | NEAR_READY | Include in same DB read-only follow-up as second target. |
| 3 | `SGG_30140` | 대전광역시 중구 | `30140` | absent from current registry | full row_count not captured; historical rank-1 sample existed | historical `2026-04-24`; sample `삼성`, `complex_id=171789`, `rank_all=1` | Evidence-positive in batch-31 but stale; needs fresh latest snapshot, latest board, dynamic board, and data-quality check. | Requires new registry entry and search label/alias review; short `중구` label is highly ambiguous. | Useful Daejeon pair with `SGG_30110`, but behind Gwangju continuity. | Low expected regression if exact DB evidence passes; no macro dependency. | 65 | NEAR_READY | Include in same DB read-only follow-up as third target. |
| 4 | `SGG_28115` | 인천광역시 중구영종출장 | `28115` | absent from current registry | none observed in reviewed docs | none observed | Repeated batch/stalled audits reported missing latest board row, snapshot date, sample, and dynamic board evidence. | Registry addition would be premature. | User value possible, but source evidence absent. | High public exposure risk due no board evidence. | 20 | BLOCKED | Do not expose; only revisit after source-of-truth evidence appears. |
| 5 | `SGG_28116` | 인천광역시 중구용유출장 | `28116` | absent from current registry | none observed in reviewed docs | none observed | Repeated batch/stalled audits reported missing latest board row, snapshot date, sample, and dynamic board evidence. | Registry addition would be premature. | User value possible, but source evidence absent. | High public exposure risk due no board evidence. | 20 | BLOCKED | Do not expose; only revisit after source-of-truth evidence appears. |
| 6 | `SGG_28265` | 인천광역시 서구검단출장 | `28265` | absent from current registry | none observed in reviewed docs | none observed | Repeated batch/stalled audits reported missing latest board row, snapshot date, sample, and dynamic board evidence. | Registry addition would be premature. | User value possible, but source evidence absent. | High public exposure risk due no board evidence. | 20 | BLOCKED | Do not expose; only revisit after source-of-truth evidence appears. |
| 7 | `SGG_28720` | 인천광역시 옹진군 | `28720` | absent from current registry | none observed in reviewed docs | none observed | Repeated batch/stalled audits reported missing latest board row, snapshot date, sample, and dynamic board evidence. | Registry addition would be premature. | Lower immediate rollout value than city-district candidates. | High public exposure risk due no board evidence. | 18 | BLOCKED | Do not expose; only revisit after source-of-truth evidence appears. |

## Top Recommendation

Recommended next target for read-only verification: `SGG_29155` / 광주광역시 남구.

Why this candidate:

- It is the strongest non-public follow-up candidate in repo-local historical evidence.
- Batch-31 recorded evidence-positive latest-board and dynamic-board signals for `SGG_29155`, with snapshot date `2026-04-24`, sample `포스코더샵`, `complex_id=168923`, and `rank_all=1`.
- It preserves regional continuity after current public `SGG_29110` and `SGG_29140`.
- It does not require JEONBUK_ALL, any macro universe, or fallback-based evidence.

Why it is not READY_NOW:

- Current DB evidence was not available in this lane.
- Historical evidence is stale for a 2026-06-14 decision.
- Full latest-board row_count, latest snapshot consistency, dynamic-board sample, null/zero market-cap indicators, and API post-open behavior were not freshly verified.
- Current registry has no disabled SGG placeholder for `SGG_29155`; later exposure would add a new registry entry rather than flip an existing disabled flag.

Expected code files if later approved:

- `src/lib/koaptix/universes.ts` for the public registry entry.
- `src/components/home/CommandPalette.tsx` only if search-discovery behavior or aliases need targeted adjustment; the current component already uses enabled SIGUNGU entries from `getSearchUniverseRegistry`.

Expected manual QA search terms if later approved:

- `광주`
- `광주광역시`
- `남구`
- `광주 남구`
- `광주광역시 남구`
- `포스코더샵`

Expected smoke endpoints if later approved:

- home page
- ranking page with `SGG_29155`
- rankings API with `SGG_29155`
- search API with `SGG_29155`
- full-board API with `SGG_29155`
- map API with `SGG_29155` if map is part of the exposure surface
- guard/regression checks for `KOREA_ALL`, major macro universes, invalid universe fallback, and disabled `JEONBUK_ALL`

Approval gates required next:

1. CTO accepts this audit or requests a patch.
2. Separate `P-KOAPTIX-NEXT-SGG-CANDIDATE-DB-READONLY-AUDIT.0` lane runs SELECT-only exact reads.
3. Only if DB evidence passes, a separate code-patch planning or public-exposure lane can be proposed.
4. Actual code patch, build, audit, smoke, manual QA, commit, push, and completion notes remain separate approved steps according to risk.

Blockers to resolve before public exposure:

- Fresh exact-read DB proof for `koaptix_rank_snapshot`, `v_koaptix_universe_rank_history_dynamic`, and `v_koaptix_latest_universe_rank_board_u`.
- Full row_count and latest snapshot date.
- Data quality checks for rank fields, complex identifiers, market-cap fields if present, and fallback absence.
- Label/search discovery review for duplicated short labels.

## Alternatives

`SGG_30110` / 대전광역시 동구 is the best alternative. It has historical evidence-positive rank-1 sample data from batch-31, but it is behind `SGG_29155` because Gwangju continuity is stronger immediately after current Gwangju public SGGs.

`SGG_30140` / 대전광역시 중구 is close behind `SGG_30110`. It should be checked in the same read-only DB follow-up, but the short `중구` label is highly ambiguous and needs careful search-discovery handling if later approved.

`SGG_29155`, `SGG_30110`, and `SGG_30140` should be treated as a small exact-read target set, not as approval to expose all three.

## Hold / Block List

Do not expose:

- `SGG_52111`: already public and already discoverable.
- `SGG_52113`: already public/staged exposed and previously production-smoke healthy.
- any of the 85 current enabled SGGs listed above: already public; not next-candidate work.
- `JEONBUK_ALL`: disabled macro universe; remains separate macro-readiness work.
- `SGG_28115`, `SGG_28116`, `SGG_28265`, `SGG_28720`: repeated missing latest-board/snapshot/dynamic evidence.
- `SGG_11710` 2026-05-31 public expansion: already-public universe with documented source-gap blockers; not a next public SGG candidate.

Hard blockers:

- no current DB diagnostic evidence in this lane
- no current latest-board full row_count for non-public candidates
- historical evidence-positive rows are stale
- registry has no disabled SGG placeholders to flip
- direct exposure would require code/registry addition
- no candidate may rely on membership-only evidence
- no candidate may depend on JEONBUK_ALL or any macro universe enablement
- no DB write/helper/materializer/latest-board refresh is approved here

## Next Lane Recommendation

Recommended next lane:

`P-KOAPTIX-NEXT-SGG-CANDIDATE-DB-READONLY-AUDIT.0`

Scope:

- read-only DB diagnostic only
- no registry/code/source modification
- no DB write
- no helper/materializer/latest-board refresh
- no production smoke
- no commit/push/deploy
- enumerate or confirm candidates through `region_dim` active sigungu rows
- exclude current enabled registry SGGs
- run bounded exact per-code SELECT reads for:
  - `SGG_29155`
  - `SGG_30110`
  - `SGG_30140`
  - optionally the first next canonical candidates after current registry exclusions

Recommended exact-read path:

1. Use `region_dim` as the candidate enumeration source.
2. Exclude current enabled registry codes from `src/lib/koaptix/universes.ts`.
3. For each target, run exact `universe_code = <code>` SELECT-only checks against:
   - `koaptix_rank_snapshot`
   - `v_koaptix_universe_rank_history_dynamic`
   - `v_koaptix_latest_universe_rank_board_u`
4. Stop after enough current READY evidence is found or after a bounded HOLD result.

Do not recommend direct registry patch without CTO review.

## Explicit Do-Not-Run List

- no DB write
- no INSERT / UPDATE / DELETE / UPSERT / MERGE / TRUNCATE / ALTER / CREATE / DROP / GRANT / REVOKE
- no REFRESH MATERIALIZED VIEW
- no helper/materializer execution
- no `sync_rank_snapshot_from_history`
- no `append_daily_rank_history`
- no market-cap, price snapshot, eligibility, rank snapshot, index snapshot, or latest-board writer
- no sealed wrappers
- no registry exposure
- no source code modification
- no JEONBUK_ALL exposure
- no macro universe exposure
- no build/test/smoke
- no production smoke
- no deploy
- no rollback/revert
- no git add/commit/push

## Non-Developer Korean Summary

다음 공개 후보를 데이터 기준으로 고르기 위한 읽기 전용 점검을 했습니다. 이미 공개된 85개 SGG와 `SGG_52111` 전주시 완산구는 후보에서 제외했습니다.

지금 문서와 코드만으로는 바로 공개해도 된다고 말할 수 있는 새 SGG는 없습니다. 다만 과거 점검 기록상 `SGG_29155` 광주광역시 남구가 가장 좋은 다음 확인 후보입니다.

이 후보도 실제 보드에 최신 데이터가 남아 있는지 다시 확인해야 합니다. 전북 전체 같은 큰 단위는 아직 별도 의사결정 대상이고, 이번 감사에서는 계속 비공개로 유지합니다.

다음 단계는 CTO가 이 감사 내용을 본 뒤, 별도 lane에서 DB를 SELECT-only로만 읽어 `SGG_29155`, `SGG_30110`, `SGG_30140`의 최신 보드 증거를 확인하는 것입니다. 그 전에는 registry 공개나 코드 패치를 하지 않는 것이 안전합니다.
