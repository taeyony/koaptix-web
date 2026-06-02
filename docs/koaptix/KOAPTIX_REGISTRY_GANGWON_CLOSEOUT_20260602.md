# KOAPTIX Registry Closeout - Gangwon Macro Universe Exposure

One-line verdict:
GANGWON_ALL is production-verified as a public macro universe; JEONBUK_ALL remains disabled pending latest-board source-chain evidence.

## Current Status

- Lane group: P-REGISTRY.0 through P-REGISTRY.3.
- P-REGISTRY.1 enabled GANGWON_ALL only in the universe registry.
- P-REGISTRY.1 left JEONBUK_ALL disabled.
- P-REGISTRY.1 build passed.
- P-REGISTRY.1 commit: 9f23b24df0c10b319f88ebef926ba7c795670e9d, Enable Gangwon macro universe.
- P-REGISTRY.2 production verification succeeded.
- Current GANGWON_ALL public baseline: 2026-06-01 / 71 rows / 71 distinct complexes / duplicate_complex_rows=0.
- JEONBUK_ALL remains disabled and blocked pending latest-board source-chain evidence.

## Manual Source-Chain Evidence

Universe board source of truth remains:
koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u

| Source | Universe | Board date | Rows | Distinct complexes | Notes |
| --- | --- | --- | ---: | ---: | --- |
| koaptix_rank_snapshot | GANGWON_ALL | 2026-06-01 | 71 | 71 | Manual SQL evidence supplied by user |
| koaptix_rank_snapshot | GANGWON_ALL | 2026-05-31 | 71 | 71 | Manual SQL evidence supplied by user |
| koaptix_rank_snapshot | GANGWON_ALL | 2026-05-29 | 71 | 71 | Manual SQL evidence supplied by user |
| v_koaptix_universe_rank_history_dynamic | GANGWON_ALL | 2026-06-01 | 71 | 71 | Manual SQL evidence supplied by user |
| v_koaptix_universe_rank_history_dynamic | GANGWON_ALL | 2026-05-31 | 71 | 71 | Manual SQL evidence supplied by user |
| v_koaptix_universe_rank_history_dynamic | GANGWON_ALL | 2026-05-29 | 71 | 71 | Manual SQL evidence supplied by user |
| v_koaptix_latest_universe_rank_board_u | GANGWON_ALL | 2026-06-01 | 71 | 71 | Manual SQL evidence supplied by user |

Duplicate guard:

| Universe | Rows | Distinct complexes | duplicate_complex_rows |
| --- | ---: | ---: | ---: |
| GANGWON_ALL | 71 | 71 | 0 |

## Production Verification

P-REGISTRY.2 ran bounded read-only public GET checks after the GANGWON_ALL registry commit was pushed.

| Target | HTTP | Identity / latest board evidence | Fallback evidence | Decision |
| --- | ---: | --- | --- | --- |
| rankings_gangwon | 200 | requestedUniverseCode=GANGWON_ALL, renderedUniverseCode=GANGWON_ALL, universeCode=GANGWON_ALL, count=20, items=20 | fallbackMode=none, no KOREA_ALL substitution, no cross-universe fallback | PASS |
| ranking_gangwon_full | 200 | universeCode=GANGWON_ALL, latestBoardDate=2026-06-01, count=71, items=71, distinct complex ids=71, duplicate_complex_rows=0 | no KOREA_ALL substitution, no cross-universe fallback | PASS |
| map_gangwon | 200 | requestedUniverseCode=GANGWON_ALL, renderedUniverseCode=GANGWON_ALL, universeCode=GANGWON_ALL, count=0 | fallbackMode=none, no KOREA_ALL substitution, no cross-universe fallback | PASS as route identity/read-path check |
| home_static_optional | 200 | GANGWON_ALL and Gangwon label observed in initial HTML | Informational only | INFO_PASS |

## Final Classification

- GANGWON_ALL: PRODUCTION_VERIFIED_PUBLIC_MACRO_UNIVERSE.
- JEONBUK_ALL: BLOCKED_NO_LATEST_BOARD_EVIDENCE.

## Do Not Run / Do Not Change

- No DB write.
- No DB helper execution.
- No source-of-truth bypass.
- No membership-only readiness decision.
- No JEONBUK_ALL enablement until source-chain latest-board evidence exists.
- No production mutation.
- No deploy without explicit approval.

## Future Resume Condition

If JEONBUK_ALL is reconsidered, first verify source-chain evidence across koaptix_rank_snapshot, v_koaptix_universe_rank_history_dynamic, and v_koaptix_latest_universe_rank_board_u. Then run a separate registry patch lane only if the latest-board evidence proves readiness.

## Marker

P-REGISTRY.3_GANGWON_CLOSEOUT_ACCEPTED
