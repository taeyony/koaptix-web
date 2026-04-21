# KOAPTIX Batch-6 Readiness Review - 2026-04-22

## Purpose

This document records a read-only batch-6 SGG readiness scan. It does not open
batch-6 and does not modify the registry, DB, SQL, source of truth, API routes,
gate scripts, package files, or runtime code.

The source of truth remains:

```text
koaptix_rank_snapshot
-> v_koaptix_universe_rank_history_dynamic
-> v_koaptix_latest_universe_rank_board_u
```

## Baseline

- HEAD: `1690a2b`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Batch-4 open commit: `306f3dc feat(koaptix): open batch-4 ready sgg exposure`
- Batch-5 open commit: `7cac4e8 feat(koaptix): open batch-5 ready sgg exposure`
- Batch-5 post-open docs commit: `1690a2b docs(koaptix): record batch-5 open verification`

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

Enabled SGG count: 28.

Batch-4 is already open:

- `SGG_11545`
- `SGG_11620`

Batch-5 is already open:

- `SGG_41360`
- `SGG_48250`

These four codes must not be treated as batch-6 candidates.

## Candidate Scan Method

Commands and files reviewed:

- `git status --short`
- `git diff --name-only`
- `git rev-parse --short HEAD`
- `git branch --show-current`
- `git log --oneline -12`
- `src/lib/koaptix/universes.ts`
- `package.json`
- `docs/KOAPTIX_BATCH5_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_BATCH4_READINESS_REVIEW_2026-04-21.md`
- `docs/KOAPTIX_FEATURE_IMPROVEMENT_HANDOFF_2026-04-21.md`
- `docs/KOAPTIX_SGG_READINESS_AUDIT_2026-04-19.md`
- `scripts/audit-sgg-readiness.mjs`
- `scripts/sgg-release-gate.ps1`

Read-only checks executed:

- `npm run audit:sgg`
- read-only Supabase scan against:
  - `region_dim`
  - `koaptix_rank_snapshot`
  - `v_koaptix_universe_rank_history_dynamic`
  - `v_koaptix_latest_universe_rank_board_u`

`npm run audit:sgg` was run with:

```powershell
$env:KOAPTIX_SMOKE_BASE_URL='http://127.0.0.1:3004'; npm run audit:sgg
```

The first audit attempt without an active base URL failed with `ECONNREFUSED`;
after starting the local dev server on port 3004, the audit passed.

Audit result:

- checked at: `2026-04-21T15:10:43.894Z`
- enabled SGG confirmed: 28
- delivery-confirmed enabled SGG: 28
- advisory direct-read misses: none
- blocking failures: none
- candidate results from the built-in audit script: none

The built-in audit script has a fixed candidate list that is now fully exposed
through batch-4 and batch-5, so batch-6 candidate discovery used a separate
read-only per-SGG scan from `region_dim`.

The read-only candidate scan checked 280 currently non-enabled active sigungu
codes. It avoided registry changes and did not run DB writes, migrations,
snapshot rebuilds, or source-of-truth changes.

## Candidate Readiness Criteria

READY requires:

1. The SGG is not currently registry enabled.
2. The SGG is not a batch-4 or batch-5 code.
3. `v_koaptix_latest_universe_rank_board_u` has at least one row.
4. `koaptix_rank_snapshot` has a latest snapshot.
5. `v_koaptix_universe_rank_history_dynamic` has a row for that latest
   snapshot.
6. `region_dim` has a clear label/identity.
7. The expected rollback scope is registry-only.

## Candidate Readiness Table

Read-only scan timestamp: `2026-04-21T15:12:35.199Z`.

| Rank | Candidate | Region label | latest board rows | snapshot | dynamic | Sample | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SGG_41465` | 경기도 용인시 수지구 | 175 | `2026-04-21` | true | `complex_id=244476`, rank 1, 성복역롯데캐슬골드타운 | READY |
| 2 | `SGG_41220` | 경기도 평택시 | 171 | `2026-04-21` | true | `complex_id=212774`, rank 1, 지제역더샵센트럴시티 | READY |
| 3 | `SGG_41463` | 경기도 용인시 기흥구 | 171 | `2026-04-21` | true | `complex_id=244018`, rank 1, 행원마을동아솔레시티 | DEFERRED |
| 4 | `SGG_29170` | 광주광역시 북구 | 169 | `2026-04-21` | true | `complex_id=169040`, rank 1, S-클래스더제니스 | DEFERRED |
| 5 | `SGG_28260` | 인천광역시 서구 | 167 | `2026-04-21` | true | `complex_id=162773`, rank 1, 검암역로열파크씨티푸르지오2단지 | DEFERRED |
| 6 | `SGG_27290` | 대구광역시 달서구 | 165 | `2026-04-21` | true | `complex_id=140196`, rank 1, 월드마크웨스트엔드 | DEFERRED |
| 7 | `SGG_31140` | 울산광역시 남구 | 165 | `2026-04-21` | true | `complex_id=177939`, rank 1, 대현더샵 | DEFERRED |
| 8 | `SGG_27260` | 대구광역시 수성구 | 160 | `2026-04-21` | true | `complex_id=138454`, rank 1, 두산위브더제니스 | DEFERRED |
| 9 | `SGG_41150` | 경기도 의정부시 | 154 | `2026-04-21` | true | `complex_id=192562`, rank 1, 의정부역센트럴자이앤위브캐슬 | DEFERRED |
| 10 | `SGG_41390` | 경기도 시흥시 | 154 | `2026-04-21` | true | `complex_id=237338`, rank 1, 한라비발디캠퍼스2차 | DEFERRED |
| 11 | `SGG_44133` | 충청남도 천안시 서북구 | 151 | `2026-04-21` | true | `complex_id=269628`, rank 1, 두정역효성해링턴플레이스 | DEFERRED |
| 12 | `SGG_29200` | 광주광역시 광산구 | 150 | `2026-04-21` | true | `complex_id=170113`, rank 1, 힐스테이트리버파크 | DEFERRED |

Deferred candidates are not rejected for data quality. They are deferred because
this review intentionally recommends at most two batch-6 open candidates.

## Recommended batch-6 open set

- `SGG_41465`
- `SGG_41220`

These are the only candidates recommended for a future batch-6 open prompt.

## Rejected Or Deferred Candidates

Rejected from the top scanned readiness set:

- none

Deferred:

- `SGG_41463`
- `SGG_29170`
- `SGG_28260`
- `SGG_27290`
- `SGG_31140`
- `SGG_27260`
- `SGG_41150`
- `SGG_41390`
- `SGG_44133`
- `SGG_29200`

Reason: the review scope caps the recommended open set at two candidates.

Not-ready examples observed during the non-enabled SGG scan:

- `SGG_28115`
- `SGG_28116`
- `SGG_28265`
- `SGG_28720`
- `SGG_41110`
- `SGG_41130`
- `SGG_41170`
- `SGG_41190`

Reason: no latest board rows, no latest snapshot, and no dynamic sample were
observed for these examples during the read-only scan.

## Expected Rollback Scope

If a future batch-6 open prompt exposes only the recommended candidates,
rollback scope should be registry-only and exactly:

- `SGG_41465`
- `SGG_41220`

No DB, SQL, source-of-truth, API route, package, component, or gate script
rollback should be needed for a registry-only open.

## Actual Open Status

Batch-6 was not opened in this turn.

No registry exposure was changed. No code, API route, DB, SQL, source-of-truth,
package, component, or gate script was changed.

## Next Turn Exact Target

If approved, the next actual open prompt should expose exactly:

- `SGG_41465`
- `SGG_41220`

After that registry-only open, run full post-open validation:

1. `npm run build`
2. `npm run dev -- --hostname 127.0.0.1 --port 3004 --webpack`
3. `KOAPTIX_SMOKE_BASE_URL=http://127.0.0.1:3004 npm run gate:sgg`
