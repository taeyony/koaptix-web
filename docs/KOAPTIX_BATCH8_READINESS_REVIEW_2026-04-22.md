# KOAPTIX Batch-8 Readiness Review - 2026-04-22

## Purpose

This document records the read-only batch-8 SGG readiness scan and the later
post-open verification result from commit `b6245f0`.

The readiness review itself did not open batch-8 and did not modify the
registry, DB, SQL, source of truth, API routes, gate scripts, package files,
components, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `d548b5a`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Gate coverage hardening commit: `d548b5a test(koaptix): tighten sgg release gate coverage`
- Batch-4 open commit: `306f3dc feat(koaptix): open batch-4 ready sgg exposure`
- Batch-5 open commit: `7cac4e8 feat(koaptix): open batch-5 ready sgg exposure`
- Batch-6 open commit: `dee214d feat(koaptix): open batch-6 ready sgg exposure`
- Batch-7 open commit: `a260e93 feat(koaptix): open batch-7 ready sgg exposure`
- Batch-8 readiness docs commit: `4eb653c docs(koaptix): add batch-8 readiness review`
- Batch-8 open commit: `b6245f0 feat(koaptix): open batch-8 ready sgg exposure`

## Current Enabled Exposure

Source reviewed: `src/lib/koaptix/universes.ts`.

Enabled macro universes: 16.

- `KOREA_ALL`
- `SEOUL_ALL`
- `BUSAN_ALL`
- `DAEGU_ALL`
- `INCHEON_ALL`
- `GWANGJU_ALL`
- `DAEJEON_ALL`
- `ULSAN_ALL`
- `SEJONG_ALL`
- `GYEONGGI_ALL`
- `CHUNGBUK_ALL`
- `CHUNGNAM_ALL`
- `JEONNAM_ALL`
- `GYEONGBUK_ALL`
- `GYEONGNAM_ALL`
- `JEJU_ALL`

Macro universes intentionally not enabled:

- `GANGWON_ALL`
- `JEONBUK_ALL`

Enabled SGG count: 32.

Enabled SGG universes:

- `SGG_11710`
- `SGG_11650`
- `SGG_11680`
- `SGG_41135`
- `SGG_11440`
- `SGG_11560`
- `SGG_11590`
- `SGG_11500`
- `SGG_11290`
- `SGG_11230`
- `SGG_11740`
- `SGG_11470`
- `SGG_11170`
- `SGG_11410`
- `SGG_11200`
- `SGG_11110`
- `SGG_11140`
- `SGG_11215`
- `SGG_11260`
- `SGG_11305`
- `SGG_11320`
- `SGG_11350`
- `SGG_11380`
- `SGG_11530`
- `SGG_11545`
- `SGG_11620`
- `SGG_41360`
- `SGG_48250`
- `SGG_41465`
- `SGG_41220`
- `SGG_41463`
- `SGG_29170`

Batch-4 is already open:

- `SGG_11545`
- `SGG_11620`

Batch-5 is already open:

- `SGG_41360`
- `SGG_48250`

Batch-6 is already open:

- `SGG_41465`
- `SGG_41220`

Batch-7 is already open:

- `SGG_41463`
- `SGG_29170`

These eight already-open batch-4 through batch-7 codes must not be treated as
batch-8 candidates.

Post-open status:

- `b6245f0 feat(koaptix): open batch-8 ready sgg exposure` opened exactly
  `SGG_28260` and `SGG_27290`.
- Current enabled SGG count after that commit: 34.
- No macro universe exposure policy changed.

## Gate Coverage Baseline

The gate coverage hardening baseline is present at `d548b5a`.

Reviewed scripts:

- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`
- `scripts/smoke-regional-identity.mjs`
- `scripts/smoke-browser-regional-identity.mjs`

Findings:

- `audit:sgg` reads enabled SGG directly from `src/lib/koaptix/universes.ts`.
- `gate:sgg` runs `audit:sgg`, `smoke:regional`, `smoke:browser`, and `build`.
- `smoke:regional` includes enabled SGG with `order >= 125` automatically.
- `smoke:browser` includes enabled SGG with `order >= 125` automatically.
- Batch-4 through batch-7 SGG are covered by the hardened smoke baseline after
  they are registry enabled.

## Whole-File Review Result

Files reviewed whole-file:

- `src/lib/koaptix/universes.ts`
- `package.json`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`
- `scripts/smoke-regional-identity.mjs`
- `scripts/smoke-browser-regional-identity.mjs`
- `docs/KOAPTIX_BATCH7_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH6_READINESS_REVIEW_2026-04-22.md`
- `docs/KOAPTIX_BATCH5_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_BATCH4_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`

Findings:

- Batch-4, batch-5, batch-6, and batch-7 are documented as already open.
- `src/lib/koaptix/universes.ts` has all batch-4 through batch-7 SGG enabled.
- The current enabled SGG count is 32.
- `package.json` still exposes the expected `audit:sgg`, `smoke:regional`,
  `smoke:browser`, and `gate:sgg` commands.
- The built-in audit candidate list is stale for discovery because its fixed
  candidates are already enabled; batch-8 candidate discovery therefore used a
  separate read-only scan from `region_dim` and source-of-truth views.

## Candidate Scan Method

Commands and files reviewed:

- `git status --short`
- `git diff --name-only`
- `git rev-parse --short HEAD`
- `git branch --show-current`
- `git log --oneline -12`
- whole-file review of the files listed above

Read-only checks executed:

- `npm run audit:sgg`
- `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run audit:sgg`
- read-only Supabase scan against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

The first audit attempt without an active default base URL failed with
`ECONNREFUSED`. A local dev server was then started on `127.0.0.1:3004` and the
audit was rerun with an explicit base URL.

Audit result:

- checked at: `2026-04-22T00:44:05.242Z`
- base URL: `http://127.0.0.1:3004`
- enabled SGG confirmed: 32
- delivery-confirmed enabled SGG: 32
- advisory direct-read misses: none
- blocking failures: none
- candidate results from the built-in audit script: none

The candidate scan avoided DB writes, migrations, snapshot rebuilds,
source-of-truth changes, registry changes, API route changes, and gate script
changes.

Read-only candidate scan summary:

- scan timestamp: `2026-04-22T00:45:26.001Z`
- active sigungu rows from `region_dim`: 308
- enabled SGG excluded: 32
- non-enabled SGG count: 276
- strongest non-enabled deferred candidates checked: 12

The scan used the existing batch-7 deferred readiness set as the priority input,
then rechecked each still non-enabled candidate against the current
source-of-truth chain.

## Candidate Readiness Criteria

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not a batch-4, batch-5, batch-6, or batch-7 code.
3. `v_koaptix_latest_universe_rank_board_u` has at least one row.
4. `koaptix_rank_snapshot` has a latest snapshot.
5. `v_koaptix_universe_rank_history_dynamic` has a row for that latest
   snapshot.
6. `region_dim` has a clear label and region identity.
7. The expected rollback scope is registry-only.

## Candidate Readiness Table

| Rank | Candidate | Region label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_28260` | 인천광역시 서구 | 167 | `2026-04-21` | true | `complex_id=162773`, rank 1, 검암역로열파크씨티푸르지오2단지 | READY |
| 2 | `SGG_27290` | 대구광역시 달서구 | 165 | `2026-04-21` | true | `complex_id=140196`, rank 1, 월드마크웨스트엔드 | READY |
| 3 | `SGG_31140` | 울산광역시 남구 | 165 | `2026-04-21` | true | `complex_id=177939`, rank 1, 대현더샵 | DEFERRED |
| 4 | `SGG_27260` | 대구광역시 수성구 | 160 | `2026-04-21` | true | `complex_id=138454`, rank 1, 두산위브더제니스 | DEFERRED |
| 5 | `SGG_41150` | 경기도 의정부시 | 154 | `2026-04-21` | true | `complex_id=192562`, rank 1, 의정부역센트럴자이앤위브캐슬 | DEFERRED |
| 6 | `SGG_41390` | 경기도 시흥시 | 154 | `2026-04-21` | true | `complex_id=237338`, rank 1, 한라비발디캠퍼스2차 | DEFERRED |
| 7 | `SGG_44133` | 충청남도 천안시 서북구 | 151 | `2026-04-21` | true | `complex_id=269628`, rank 1, 두정역효성해링턴플레이스 | DEFERRED |
| 8 | `SGG_29200` | 광주광역시 광산구 | 150 | `2026-04-21` | true | `complex_id=170113`, rank 1, 힐스테이트리버파크 | DEFERRED |
| 9 | `SGG_27230` | 대구광역시 북구 | 147 | `2026-04-21` | true | `complex_id=137330`, rank 1, 침산1차푸르지오(2-2) | DEFERRED |
| 10 | `SGG_26350` | 부산광역시 해운대구 | 141 | `2026-04-21` | true | `complex_id=121684`, rank 1, 더샵센텀파크1차 | DEFERRED |
| 11 | `SGG_41173` | 경기도 안양시 동안구 | 120 | `2026-04-21` | true | `complex_id=198411`, rank 1, 평촌센텀퍼스트 | DEFERRED |
| 12 | `SGG_41171` | 경기도 안양시 만안구 | 67 | `2026-04-21` | true | `complex_id=195794`, rank 1, 래미안안양메가트리아 | DEFERRED |

Deferred candidates are not rejected for data quality. They are deferred because
this review intentionally recommends at most two batch-8 open candidates.

## Rejected Or Deferred Candidates

Rejected from the checked readiness set:

- none

Deferred:

- `SGG_31140`
- `SGG_27260`
- `SGG_41150`
- `SGG_41390`
- `SGG_44133`
- `SGG_29200`
- `SGG_27230`
- `SGG_26350`
- `SGG_41173`
- `SGG_41171`

Reason: the review scope caps the recommended open set at two candidates.

Already-open and excluded from batch-8:

- `SGG_11545`
- `SGG_11620`
- `SGG_41360`
- `SGG_48250`
- `SGG_41465`
- `SGG_41220`
- `SGG_41463`
- `SGG_29170`

## Recommended batch-8 open set

- `SGG_28260`
- `SGG_27290`

These are the only candidates recommended for a future batch-8 open prompt.

## Expected Rollback Scope

If a future batch-8 open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_28260`
- `SGG_27290`

No DB, SQL, source-of-truth, API route, package, component, or gate script
rollback should be needed for a registry-only open.

## Actual Open Status

Batch-8 was opened later by:

- `b6245f0 feat(koaptix): open batch-8 ready sgg exposure`

That commit changed exactly one runtime file:

- `src/lib/koaptix/universes.ts`

The open exposed exactly:

- `SGG_28260`
- `SGG_27290`

The readiness review and the open result are aligned: the same two candidates
recommended by the review were the only candidates exposed.

## Post-Open Result

Open result:

- enabled SGG count after open: 34
- `npm run build`: PASS
- home URL checks: PASS
- `/ranking` URL checks: PASS
- `/api/rankings`: PASS
- `/api/map`: PASS
- same-universe delivery retained
- KOREA_ALL fallback was not used for the new SGG delivery checks
- `npm run gate:sgg`: PASS
- final gate marker: `[SGG_RELEASE_GATE_PASS]`
- `failed_command=NONE`
- `failed_universe_or_step=NONE`

Gate breakdown from the post-open run:

- `audit:sgg`: PASS, `enabled=34`, `confirmed=34`
- home, ranking, manual API checks: PASS
- `smoke:regional`: PASS
- `smoke:browser`: PASS
- build: PASS

## Current Status After Batch-8 Open

Batch-8 is open as of commit `b6245f0`.

No DB, SQL, source-of-truth, API route, gate script, package, script, component,
or docs change was part of the open commit. The open commit changed only
`src/lib/koaptix/universes.ts`.

Do not treat batch-8 as an open-ended block. Any additional SGG exposure after
`SGG_28260` and `SGG_27290` requires a separate readiness review and a separate
explicit open prompt.

## Post-Open Rollback Scope

Rollback is not needed because build, manual checks, API checks, and the SGG
release gate passed after the registry-only open.

If a later batch-8-specific regression is proven, rollback scope should be
registry-only and exactly the batch-8 block:

- `SGG_28260`
- `SGG_27290`

No DB, SQL, source-of-truth, API route, package, script, or component rollback
should be needed for a batch-8 registry-only rollback.
