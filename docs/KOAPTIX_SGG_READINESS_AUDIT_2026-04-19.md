# KOAPTIX SGG Readiness Audit - 2026-04-19

## Scope

This document records the current SGG staged exposure operating baseline. It
does not change source of truth, DB schema, SQL functions, snapshot chain,
route logic, scripts, or registry state.

## Enabled SGG Baseline

Current enabled SGG count: 24.

Initial enabled set:

| code | label | audit sample |
| --- | --- | --- |
| `SGG_11710` | Songpa-gu | Heliocity |
| `SGG_11650` | Seocho-gu | Banpo Xi |
| `SGG_11680` | Gangnam-gu | Eunma |
| `SGG_41135` | Bundang-gu | Sibeom Woosung |
| `SGG_11440` | Mapo-gu | Mapo Prestige Xi |
| `SGG_11560` | Yeongdeungpo-gu | Sibeom |
| `SGG_11590` | Dongjak-gu | Hillstate Sangdo Central Park |
| `SGG_11500` | Gangseo-gu | Gangseo Hillstate |
| `SGG_11290` | Seongbuk-gu | Raemian Gireum Centerpiece |
| `SGG_11230` | Dongdaemun-gu | Raemian Crecity |
| `SGG_11740` | Gangdong-gu | Olympic Park Foreon |
| `SGG_11470` | Yangcheon-gu | Mokdong New Town 7 |
| `SGG_11170` | Yongsan-gu | Hangaram |
| `SGG_11410` | Seodaemun-gu | DMC Raemian e-Pyunhansesang |
| `SGG_11200` | Seongdong-gu | Centlas |

Batch-1:

| code | label | audit sample |
| --- | --- | --- |
| `SGG_11110` | Jongno-gu | Gyeonghuigung Xi 2 |
| `SGG_11140` | Jung-gu | Namsan Town |
| `SGG_11215` | Gwangjin-gu | Hyundai Prime |

Batch-2:

| code | label | audit sample |
| --- | --- | --- |
| `SGG_11260` | Jungnang-gu | Sagajeong Central I-Park |
| `SGG_11305` | Gangbuk-gu | SK Bukhansan City |
| `SGG_11320` | Dobong-gu | Bukhansan I-Park 5 |

Batch-3:

| code | label | audit sample |
| --- | --- | --- |
| `SGG_11350` | Nowon-gu | Hanjin Hanhwa Grand Ville |
| `SGG_11380` | Eunpyeong-gu | Nokbeon Station e-Pyunhansesang Castle |
| `SGG_11530` | Guro-gu | Hyundai |

Batch-1, batch-2, and batch-3 remain open.

## Audit Command

Run:

```bash
npm run audit:sgg
```

The audit checks enabled registry entries for:

- latest `koaptix_rank_snapshot` row
- latest `v_koaptix_latest_universe_rank_board_u` row
- `/api/rankings?universe_code=<SGG_CODE>`
- `/api/map?universe_code=<SGG_CODE>`
- `/api/search?universe_code=<SGG_CODE>&q=<sample>`
- `/ranking?universe=<SGG_CODE>`

Candidate SGG entries are DB-readiness signals only until they are deliberately
enabled in the registry.

## Release Gate

Run before and after every SGG exposure patch:

```bash
npm run gate:sgg
```

Gate order:

1. `npm run audit:sgg`
2. `npm run smoke:regional`
3. `npm run smoke:browser`
4. `npm run build`

The gate prints:

- `[SGG_RELEASE_GATE_PASS]` or `[SGG_RELEASE_GATE_FAIL]`
- `failed_command`
- `failed_universe_or_step`
- `rerun_recommended`
- `rollback_decision_note`

## Direct-Read Miss Policy

Direct snapshot/latest-board reads are readiness diagnostics. They are not the
same as user-facing delivery failure.

Gate behavior:

- If direct `snapshotOk` or `latestBoardOk` misses appear, rerun
  `audit:sgg` once.
- If route/API checks pass and only direct reads continue to miss, record the
  issue as advisory and continue.
- If `/api/rankings`, `/api/map`, `/api/search`, or `/ranking` fails, treat the
  result as blocking.

For repeat direct-read diagnosis:

```bash
npm run diagnose:sgg-direct
```

Optional environment variables:

```bash
KOAPTIX_DIRECT_READ_CODES=SGG_11110,SGG_11260
KOAPTIX_DIRECT_READ_REPEATS=10
```

## Blocking Vs Advisory

Blocking:

- `/api/rankings` identity/readiness failure
- `/api/map` identity/readiness failure
- `/api/search` current-universe priority failure or regional global fallback
  regression
- `/ranking` TOP1000 identity failure
- `smoke:regional` failure
- `smoke:browser` failure
- `npm run build` failure

Advisory:

- direct `koaptix_rank_snapshot` read miss
- direct `v_koaptix_latest_universe_rank_board_u` read miss
- only when the same universe passes the user-facing delivery path

## Rollback Scope

Rollback should be scoped to the latest staged registry batch that introduced a
confirmed blocking regression.

- Batch-1 rollback scope: `SGG_11110`, `SGG_11140`, `SGG_11215`
- Batch-2 rollback scope: `SGG_11260`, `SGG_11305`, `SGG_11320`
- Batch-3 rollback scope: `SGG_11350`, `SGG_11380`, `SGG_11530`

Do not rollback solely because of advisory direct-read diagnostics.

## Batch-3 Result

Batch-3 opened on 2026-04-20 as a controlled staged exposure:

- `SGG_11350`
- `SGG_11380`
- `SGG_11530`

Post-exposure `npm run gate:sgg` passed. The next candidateReady set is:

- `SGG_11545`
- `SGG_11620`

Batch-4 remains closed.

## Smoke Coverage

`npm run smoke:regional` covers macro round trip plus selected SGG samples:

- `SGG_11710`
- `SGG_41135`
- `SGG_11110`
- `SGG_11140`
- `SGG_11215`
- `SGG_11260`
- `SGG_11305`
- `SGG_11320`

`npm run smoke:browser` covers browser click transitions for:

- `SGG_11110`
- `SGG_11140`
- `SGG_11260`
- `SGG_11305`
