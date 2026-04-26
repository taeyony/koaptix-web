# KOAPTIX Production dca63d6 Post-Deploy Verification - 2026-04-26

## 1. Verdict
- ACCEPT
- Primary label: PRODUCTION_DCA63D6_VERIFIED
- Production can remain on dca63d6.
- Rollback is not indicated.
- Batch-32 remains paused.

## 2. Deployment Evidence
| Field | Value |
| --- | --- |
| Project | koaptix-web |
| Deployment | 45Y6zwn6L |
| Status | Ready Latest |
| Environment | Production / Current |
| Branch | main |
| Commit SHA | dca63d6 |
| Commit message | docs(koaptix): add domain health check |
| Domains | www.koaptix.com +2 |

## 3. Promotion Summary
- Previous production was main / ab79523 / Apr 10.
- Remote main was promoted to dca63d6 by controlled fast-forward push.
- Local rollback anchor existed: rollback/prod-main-before-enabled80-2026-04-26.
- No rollback was performed.

## 4. Pre-Deploy Gate Evidence
| Gate | Result | Evidence |
| --- | --- | --- |
| npm run build | PASS | Production build completed successfully. |
| npm run audit:sgg | PASS | enabledResults=80, deliveryConfirmed=80, blockingFailed=[] |
| npm run gate:sgg | PASS | [SGG_RELEASE_GATE_PASS] |
| npm run smoke:regional | PASS | Regional smoke completed successfully. |
| npm run smoke:browser | PASS | Browser smoke completed successfully. |

## 5. Production Probe Evidence
| Probe | Status | Timing | Signal | Result |
| --- | ---: | --- | --- | --- |
| / | 200 | TTFB 1.547s, total 1.548s | HTML response | PASS |
| /api/rankings KOREA_ALL | 200 | total 0.277s | ok:true, count 12 | PASS |
| /api/rankings SEOUL_ALL | 200 | total 1.873s | ok:true, count 20 | PASS |
| /api/rankings SGG_29110 | 200 | total 1.336s | ok:true, count 20 | PASS |
| /api/rankings SGG_29140 | 200 | total 1.245s | ok:true, count 20 | PASS |
| /api/map KOREA_ALL | 200 | total 1.779s | isFallback:false, source:dynamic | PASS |
| /api/map SEOUL_ALL | 200 | total 0.878s | isFallback:false, source:dynamic | PASS |
| /api/map SGG_29110 | 200 | total 0.837s | isFallback:false, source:dynamic | PASS |
| /api/map SGG_29140 | 200 | total 0.842s | isFallback:false, source:dynamic | PASS |
| /api/search KOREA_ALL | 200 | total 1.124s | ok:true | PASS |
| /api/search SEOUL_ALL | 200 | total 2.229s | ok:true | PASS |
| /api/search SGG_29140 | 200 | total 1.772s | ok:true | PASS |

## 6. Interpretation
- The earlier koaptix.com slowness and API timeout evidence belonged to stale production ab79523 and must not be used as evidence against dca63d6.
- dca63d6 production passed low-volume verification.
- Homepage, rankings, map, and search are production-healthy in the sampled checks.
- Macro universes and latest enabled SGGs passed.
- No rollback is indicated.
- No immediate production performance diagnostics are required from this verification set.

## 7. Current Operational State
- enabled SGG count: 80
- last enabled order: 180
- batch-31 complete
- batch-32 paused
- no batch-32 readiness scan started
- no additional SGGs opened
- source-of-truth unchanged

## 8. Remaining Watch Items
- audit:sgg is broad at enabled-80 and may take several minutes; this is a harness runtime-budget/watch item, not a deployment blocker after successful gate completion.
- Continue normal Vercel/Supabase monitoring.
- If future production timeout appears, diagnose Vercel/Supabase logs and delivery path without rolling back source of truth.
- Do not resume batch-32 until explicitly requested.

## 9. What Was Not Done
- no product code changes
- no script changes
- no SQL/RLS/Supabase changes
- no Vercel settings/domain/env changes
- no DNS changes
- no KOREA_ALL/source-of-truth changes
- no registry edits
- no batch-32
- no secrets printed

## 10. Next Recommended Step
- Keep production on dca63d6.
- Stop expansion loop at enabled-80 for now.
- Recommended next workstream: light post-deploy monitoring, separate harness observability/runtime-budget improvement, or business/product UX improvement planning.
- Do not resume batch-32 unless explicitly restarted.
