# P-KOAPTIX-NEXT-SGG-CANDIDATE-DB-READONLY-AUDIT

- status: NEXT_SGG_CANDIDATE_DB_READONLY_AUDIT
- execution_type: SELECT-only DB readiness audit
- date: 2026-06-14
- branch: `main`
- base_head: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`
- origin_main: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`
- target_report: `docs/operations/2026-06-14-p-koaptix-next-sgg-candidate-db-readonly-audit.md`

## Document Status

This is a SELECT-only DB readiness audit.

It is not public exposure approval, not registry modification approval, not DB write approval, not helper/materializer approval, and not commit/push/deploy approval.

No source code, registry flags, DB data, schema, helpers, materializers, latest-board jobs, package/config/env files, public assets, runtime API behavior, build/test/smoke flow, production smoke, commit, push, deploy, rollback, or revert were modified or executed in this lane.

## One-Line Conclusion

`SGG_29155` / 광주광역시 남구 is READY_NOW for a separate public-exposure planning lane: latest board and rank snapshot both have `76` rows at `2026-06-13`, ranks `1..76`, `76` distinct complexes, and `0` null/zero market-cap rows. `SGG_30140` and `SGG_30110` also pass DB readiness checks, but trail `SGG_29155` on regional continuity and candidate priority.

## DB Safety Statement

- DB access method: local `.env.local` / existing environment, using `DATABASE_URL` only in process memory.
- Secrets printed or written: false.
- DB writes attempted: false.
- Helper/materializer/latest-board execution attempted: false.
- SQL mutation attempted: false.
- Query class used for evidence: SELECT-only and information_schema SELECTs.
- Transaction handling: evidence queries were rolled back; an explicit psycopg read-only transaction check returned `transaction_read_only=on` and confirmed `SGG_29155` latest-board row_count `76`.
- Bounded optional joined source-gap diagnostics against market/price/region-map tables timed out and are recorded as `NOT_CONFIRMED_TIMEOUT`; no unsafe workaround was attempted.

## Repo And Origin Guard

- branch: `main`
- local_head: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`
- origin_main: `f4caf4f9379305c21ba00a3bdaebebacc9375e23`
- guard_passed: true
- git_status_summary: branch matches `origin/main`; unrelated untracked local files remain untouched.

## DB Connection Status

- db_connection_status: CONNECTED
- db_readonly_transaction_used: true for verification/top-row checks; all evidence queries were SELECT-only and rolled back.
- connection_secret_handling: `.env.local` was loaded locally without printing values. Reports contain no DB URL, Supabase URL, key, token, or credential.

## Schema Discovery Summary

`public.v_koaptix_latest_universe_rank_board_u` relevant columns found:

- `snapshot_date`
- `universe_code`
- `universe_name`
- `universe_scope`
- `complex_id`
- `apt_name_ko`
- `sigungu_name`
- `legal_dong_name`
- `rank_all`
- `previous_rank_all`
- `rank_delta_w`
- `rank_movement`
- `market_cap_krw`
- `market_cap_trillion_krw`
- `market_cap_share`
- `market_cap_share_pct`
- `tier_code`
- `tier_label`
- `is_top1000`

`public.koaptix_rank_snapshot` relevant columns found:

- `snapshot_date`
- `universe_code`
- `complex_id`
- `rank_all`
- `market_cap_krw`
- `market_cap_share`
- `previous_rank_all`
- `rank_delta_1d`
- `is_top1000`
- `rank_method`
- `calculation_version`
- `created_at`

Optional source-gap tables were visible but not directly keyed by `universe_code`:

- `public.koaptix_complex_region_map`
- `public.apt_market_cap_snapshot`
- `public.apt_area_cluster_price_snapshot`

Because they require joined or per-complex diagnostics, bounded optional coverage checks were attempted but timed out. This audit therefore treats optional source-gap coverage as `NOT_CONFIRMED_TIMEOUT`, while source-of-truth readiness is based on:

`koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`

## Candidate DB Evidence Table

Classification vocabulary: READY_NOW / NEAR_READY / HOLD / BLOCKED / ALREADY_PUBLIC.

| universe_code | Korean label | latest board row_count | latest board date | rank snapshot latest date | rank snapshot row_count | non-null market_cap count | null/zero market_cap count | top rank sample summary | registry status | source-gap/data-quality notes | score | classification | recommended next action |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- | ---: | --- | --- |
| `SGG_29155` | 광주광역시 남구 | 76 | `2026-06-13` | `2026-06-13` | 76 | 76 / 76 | 0 / 76 | rank 1 `포스코더샵`, `complex_id=168923`, market_cap `1,265,400,000,000` | absent from registry | Latest board and rank snapshot agree; rank range `1..76`; optional joined source-gap coverage not confirmed due timeout; no macro dependency. | 92 | READY_NOW | Recommend `P-KOAPTIX-SGG_29155-PUBLIC-EXPOSURE-PLAN.0` after CTO acceptance. |
| `SGG_30140` | 대전광역시 중구 | 61 | `2026-06-13` | `2026-06-13` | 61 | 61 / 61 | 0 / 61 | rank 1 `삼성`, `complex_id=171789`, market_cap `884,100,000,000` | absent from registry | Latest board and rank snapshot agree; rank range `1..61`; short label `중구` needs careful search disambiguation. | 88 | READY_NOW | Keep as second-choice public-exposure candidate or paired later Daejeon lane. |
| `SGG_30110` | 대전광역시 동구 | 53 | `2026-06-13` | `2026-06-13` | 53 | 53 / 53 | 0 / 53 | rank 1 `e편한세상대전에코포레`, `complex_id=170429`, market_cap `803,998,000,000` | absent from registry | Latest board and rank snapshot agree; rank range `1..53`; short label `동구` needs careful search disambiguation. | 86 | READY_NOW | Keep as third-choice public-exposure candidate or paired later Daejeon lane. |
| `SGG_52111` | 전주시 완산구 | 55 | `2026-04-30` | `2026-04-30` | 55 | 55 / 55 | 0 / 55 | rank 1 `힐스테이트어울림효자`, `complex_id=306626`, market_cap `656,467,666,670` | enabled/public | Known successful reference; production smoke and Command Palette discovery previously passed. | reference | ALREADY_PUBLIC | Reference only; do not select again. |

## Candidate Deep Dives

### `SGG_29155` / 광주광역시 남구

Board evidence:

- latest board row_count: `76`
- latest board date: `2026-06-13`
- rank range: `1..76`
- distinct complex count: `76`
- non-null complex_id count: `76`
- non-null market_cap count: `76`
- null/zero market_cap count: `0`
- top 5 board rows:
  - rank 1: `포스코더샵`, `complex_id=168923`, market_cap `1,265,400,000,000`
  - rank 2: `쌍용스윗닷홈`, `complex_id=168895`, market_cap `607,750,000,000`
  - rank 3: `효천시티프라디움`, `complex_id=168828`, market_cap `535,440,000,000`
  - rank 4: `효천1중흥에스-클래스에코시티`, `complex_id=168832`, market_cap `378,560,000,000`
  - rank 5: `무등산센트럴파크`, `complex_id=168884`, market_cap `374,850,000,000`

Snapshot evidence:

- `koaptix_rank_snapshot` latest date: `2026-06-13`
- latest snapshot row_count: `76`
- rank range: `1..76`
- distinct complex count: `76`
- non-null market_cap count: `76`
- null/zero market_cap count: `0`

Consistency check:

- latest board row_count matches rank snapshot latest row_count: pass
- latest board date matches rank snapshot latest date: pass
- top rank sample matches the previous historical batch-31 rank-1 sample: pass
- no KOREA_ALL fallback used as evidence: pass

Label/search terms for a later approved exposure:

- `광주`
- `광주광역시`
- `남구`
- `광주 남구`
- `광주광역시 남구`
- `포스코더샵`

Blockers:

- No DB/source-of-truth blocker found.
- Registry entry is absent, so a later exposure lane would add a new SGG entry rather than flip an existing disabled placeholder.
- Search discovery should avoid ambiguous short-label behavior because `남구` exists across multiple cities.

Expected smoke endpoints if later approved:

- home page
- ranking page with `SGG_29155`
- rankings API with `SGG_29155`
- search API with `SGG_29155`
- full-board API with `SGG_29155`
- map API with `SGG_29155` if map remains part of the SGG exposure surface
- disabled `JEONBUK_ALL` guard
- KOREA_ALL and major macro regression checks

### `SGG_30110` / 대전광역시 동구

Board evidence:

- latest board row_count: `53`
- latest board date: `2026-06-13`
- rank range: `1..53`
- distinct complex count: `53`
- non-null market_cap count: `53`
- null/zero market_cap count: `0`
- top 5 board rows:
  - rank 1: `e편한세상대전에코포레`, `complex_id=170429`, market_cap `803,998,000,000`
  - rank 2: `이스트시티1단지`, `complex_id=170477`, market_cap `659,050,000,000`
  - rank 3: `신흥SKVIEW`, `complex_id=170328`, market_cap `630,436,000,000`
  - rank 4: `은어송마을2단지(코오롱하늘채)`, `complex_id=171214`, market_cap `558,450,000,000`
  - rank 5: `리더스시티4BL`, `complex_id=170270`, market_cap `533,856,000,000`

Snapshot evidence:

- `koaptix_rank_snapshot` latest date: `2026-06-13`
- latest snapshot row_count: `53`
- rank range: `1..53`
- distinct complex count: `53`
- non-null market_cap count: `53`
- null/zero market_cap count: `0`

Consistency check:

- latest board row_count matches rank snapshot latest row_count: pass
- latest board date matches rank snapshot latest date: pass
- top rank sample matches the previous historical batch-31 rank-1 sample: pass
- no macro dependency: pass

Label/search terms for a later approved exposure:

- `대전`
- `대전광역시`
- `동구`
- `대전 동구`
- `대전광역시 동구`
- `e편한세상대전에코포레`

Blockers:

- No DB/source-of-truth blocker found.
- Registry entry is absent.
- Short label `동구` is ambiguous across current registry entries and requires careful Command Palette discovery QA.

### `SGG_30140` / 대전광역시 중구

Board evidence:

- latest board row_count: `61`
- latest board date: `2026-06-13`
- rank range: `1..61`
- distinct complex count: `61`
- non-null market_cap count: `61`
- null/zero market_cap count: `0`
- top 5 board rows:
  - rank 1: `삼성`, `complex_id=171789`, market_cap `884,100,000,000`
  - rank 2: `버드내1`, `complex_id=171866`, market_cap `694,080,000,000`
  - rank 3: `목동더샵리슈빌`, `complex_id=171297`, market_cap `625,590,000,000`
  - rank 4: `목양마을`, `complex_id=171285`, market_cap `570,000,000,000`
  - rank 5: `대전센트럴자이1단지`, `complex_id=171357`, market_cap `569,848,000,000`

Snapshot evidence:

- `koaptix_rank_snapshot` latest date: `2026-06-13`
- latest snapshot row_count: `61`
- rank range: `1..61`
- distinct complex count: `61`
- non-null market_cap count: `61`
- null/zero market_cap count: `0`

Consistency check:

- latest board row_count matches rank snapshot latest row_count: pass
- latest board date matches rank snapshot latest date: pass
- top rank sample matches the previous historical batch-31 rank-1 sample: pass
- no macro dependency: pass

Label/search terms for a later approved exposure:

- `대전`
- `대전광역시`
- `중구`
- `대전 중구`
- `대전광역시 중구`
- `삼성`

Blockers:

- No DB/source-of-truth blocker found.
- Registry entry is absent.
- Short label `중구` is highly ambiguous and requires careful Command Palette discovery QA.

## Reference Comparison

`SGG_52111` / 전주시 완산구 was the recent successful public reference:

- latest board row_count: `55`
- latest board date: `2026-04-30`
- rank snapshot latest date: `2026-04-30`
- rank snapshot row_count: `55`
- non-null market_cap count: `55 / 55`
- null/zero market_cap count: `0 / 55`
- top sample: `힐스테이트어울림효자`, `complex_id=306626`, market_cap `656,467,666,670`
- registry status: enabled/public
- prior production and Command Palette evidence: pass

Comparison:

- `SGG_29155` is fresher than the `SGG_52111` reference (`2026-06-13` vs `2026-04-30`), has more rows (`76` vs `55`), and has a larger top market-cap sample.
- `SGG_30140` is also fresher and slightly larger than the `SGG_52111` reference (`61` rows vs `55`).
- `SGG_30110` is fresher but slightly smaller than the `SGG_52111` reference (`53` rows vs `55`).
- All three candidates match the `SGG_52111` reference on core source-of-truth consistency: latest board date equals latest rank snapshot date, row_count matches, ranks are continuous, complex_id is present, and market_cap is non-null.

## Recommendation

Recommended next lane:

`P-KOAPTIX-SGG_29155-PUBLIC-EXPOSURE-PLAN.0`

Scope:

- code-patch planning only after CTO acceptance
- no DB write
- no helper/materializer/latest-board execution
- no JEONBUK_ALL or macro exposure
- additive public SGG registry entry for `SGG_29155` if approved
- explicit Command Palette discovery plan for ambiguous short label `남구`
- expected follow-up gates: source diff review, build/lint if approved, API/page/local checks if approved, production smoke only in a later approved release/smoke lane

Why `SGG_29155` first:

- Best row_count among the three candidates.
- Highest top market-cap sample.
- Preserves Gwangju continuity after existing public `SGG_29110` and `SGG_29140`.
- Same source-of-truth pass pattern as the successful `SGG_52111` reference.
- No dependency on JEONBUK_ALL or any macro universe.

Secondary candidates:

- `SGG_30140` is READY_NOW and should be kept as the second-choice candidate.
- `SGG_30110` is READY_NOW and should be kept as the third-choice candidate.
- A later Daejeon paired exposure lane could bundle `SGG_30110` and `SGG_30140` if CTO accepts the flexible low-risk batching standard, but that should be a separate decision.

## Explicit Do-Not-Run List

- no DB write
- no INSERT / UPDATE / DELETE / UPSERT / MERGE / TRUNCATE / ALTER / CREATE / DROP / GRANT / REVOKE
- no REFRESH MATERIALIZED VIEW
- no helper/materializer/latest-board execution
- no `sync_rank_snapshot_from_history`
- no `append_daily_rank_history`
- no market-cap, price snapshot, eligibility, rank snapshot, index snapshot, or latest-board writer
- no sealed wrappers
- no source code modification
- no registry exposure
- no JEONBUK_ALL exposure
- no macro universe exposure
- no build/test/smoke
- no production smoke
- no deploy
- no rollback/revert
- no git add/commit/push

## Non-Developer Korean Summary

DB에서 실제 보드가 있는지 읽기 전용으로 확인했습니다. 새 공개 후보 3개 모두 실제 최신 보드와 rank snapshot이 있고, 날짜와 row 수가 서로 맞았습니다.

가장 준비가 잘 된 후보는 `SGG_29155` 광주광역시 남구입니다. 최신 보드는 `2026-06-13` 기준 76개 단지이고, 시가총액 값이 비어 있거나 0인 행은 없었습니다.

`SGG_30140` 대전광역시 중구와 `SGG_30110` 대전광역시 동구도 데이터 기준으로는 준비되어 있습니다. 다만 다음 공개 계획은 광주 남구를 먼저 검토하는 것이 좋습니다.

이번 lane에서는 공개하지 않았고, 코드나 registry도 바꾸지 않았습니다. 공개는 CTO 검토 후 별도 public exposure planning lane에서만 진행해야 합니다. 전북 전체 같은 큰 단위는 계속 별도 의사결정 대상입니다.
