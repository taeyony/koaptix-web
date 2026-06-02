# KOAPTIX Production Smoke Closeout 2026-06-02

## Verdict

P-PRODSMOKE closeout: SGG_11710 production full-board smoke baseline is now accepted as 2026-06-01 / 177 rows / 177 distinct complexes after production latestBoardDate propagation and manual source-chain evidence.

Current accepted SGG_11710 public latest baseline: 2026-06-01 / 177 rows / 177 distinct complexes.

Previous smoke expectation 2026-05-29 / 177 rows is superseded for current production smoke; P-PRODSMOKE.8D remains a failure under the old expectation but is operationally resolved by accepted source-chain evidence.

## Lane Timeline

- P-PRODSMOKE.4 prepared production smoke follow-up scope.
- P-PRODSMOKE.5 production smoke passed required public GET targets.
- P-PRODSMOKE.6 full-board GET confirmed SGG_11710 count 177 and no 2026-05-31 public exposure, but remained inconclusive because no public board date was exposed.
- P-PRODSMOKE.7 classified the missing board-date proof as ROUTE_SERIALIZATION_GAP.
- P-PRODSMOKE.8A patched `/api/ranking` to expose top-level latestBoardDate derived from row snapshot_date or snapshotDate.
- P-PRODSMOKE.8B committed the code patch as `5f033e89a43c95a55e74e905eb6be4541bf39b96` with title `Expose latest board date in ranking API`.
- P-PRODSMOKE.8C pushed that commit to origin/main.
- P-PRODSMOKE.8D confirmed production response shape had propagated, but failed under the old expected latestBoardDate=2026-05-29 invariant.
- P-PRODSMOKE.8E Codex DB read was blocked because no approved safe local DB read path was available without reading or exposing secrets.
- P-PRODSMOKE.8F records the CTO-accepted manual source-chain evidence and updates the current production smoke baseline.

## Production Evidence

P-PRODSMOKE.8D observed the production full-board endpoint:

- latestBoardDate=2026-06-01
- count=177
- items length=177
- universeCode=SGG_11710
- distinct row universe codes=SGG_11710 only
- 2026-05-31 appeared=false
- KOREA_ALL substitution=false
- cross-universe fallback=false

## Manual Source-Chain Evidence

The user supplied sanitized manual SQL source-chain evidence, and CTO accepted it.

| Source object | snapshot_date | rows | distinct_complexes |
| --- | --- | ---: | ---: |
| koaptix_rank_snapshot | 2026-05-29 | 177 | 177 |
| koaptix_rank_snapshot | 2026-05-31 | 177 | 177 |
| koaptix_rank_snapshot | 2026-06-01 | 177 | 177 |
| v_koaptix_universe_rank_history_dynamic | 2026-06-01 | 177 | 177 |
| v_koaptix_universe_rank_history_dynamic | 2026-05-31 | 177 | 177 |
| v_koaptix_universe_rank_history_dynamic | 2026-05-29 | 177 | 177 |
| v_koaptix_latest_universe_rank_board_u | 2026-06-01 | 177 | 177 |

## Classification

EXPECTATION_STALE_BUT_CTO_ACCEPTED

The old smoke expectation was stale. The production latestBoardDate=2026-06-01 aligns with the accepted source-of-truth chain, and the latest board view selects 2026-06-01 with 177 rows and 177 distinct complexes.

This closeout does not retroactively relabel P-PRODSMOKE.8D as success. P-PRODSMOKE.8D failed under the old 2026-05-29 expectation, then the evidence gap was resolved by manual source-chain proof and CTO acceptance.

## Safety Notes

- No DB write.
- No helper.
- No code patch.
- No production HTTP.
- No deploy.
- No npm/script/build/lint/audit/test/smoke.
- Do not infer future board readiness from membership or row count alone.
- Future baseline changes must verify the source chain:
  `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`.

## Future Resume Condition

If a future production smoke observes a new latestBoardDate, do not hardcode or patch first; verify source chain date/count across koaptix_rank_snapshot, v_koaptix_universe_rank_history_dynamic, and v_koaptix_latest_universe_rank_board_u, then update docs only after CTO acceptance.

Marker: P-PRODSMOKE.8F_BASELINE_ACCEPTED
