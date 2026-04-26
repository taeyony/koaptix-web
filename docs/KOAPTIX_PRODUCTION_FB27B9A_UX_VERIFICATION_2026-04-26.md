# KOAPTIX Production fb27b9a UX Verification - 2026-04-26

## 1. Verdict
- ACCEPT
- Primary label: UX_PROMOTED_TO_PRODUCTION
- Production can remain on fb27b9a.
- Rollback is not needed.
- Batch-32 remains paused.

## 2. Deployment Evidence
| Field | Value |
|---|---|
| Project | koaptix-web |
| Environment | Production / Current |
| Branch | main |
| Commit SHA | fb27b9a |
| Commit message | fix(koaptix): polish mobile home copy layout |
| Domains | koaptix.com, www.koaptix.com |
| Status | Ready |

## 3. Promotion Summary
- Previous production baseline: dca63d6
- Remote main promoted: dca63d6 -> fb27b9a
- Included commits:
  - 0c83395 docs(koaptix): record production dca63d6 verification
  - 5d92f87 feat(koaptix): clarify home value proposition
  - fb27b9a fix(koaptix): polish mobile home copy layout
- Push was fast-forward.
- No force push.
- No Vercel deploy command.
- Vercel auto-deploy occurred from main.

## 4. Pre-Promotion Validation
| Check | Result | Evidence |
|---|---|---|
| npm run build | PASS | Production build completed before promotion. |
| npm run smoke:regional | PASS | [regional-smoke] pass steps=69 |
| npm run smoke:browser | PASS | Browser smoke completed successfully. |
| mobile 390px overflow check | PASS | clientWidth=390, scrollWidth=390 |
| final visual review | ACCEPT | UX_MOBILE_POLISH_VISUALLY_ACCEPTED |

## 5. Production Verification Evidence
| Endpoint / check | Status | Signal | Result |
|---|---:|---|---|
| / | 200 | total about 2.208s | PASS |
| /api/rankings KOREA_ALL | 200 | ok:true, count 12 | PASS |
| /api/rankings SEOUL_ALL | 200 | ok:true, count 20 | PASS |
| /api/rankings SGG_29110 | 200 | ok:true, count 20 | PASS |
| /api/rankings SGG_29140 | 200 | ok:true, count 20 | PASS |
| /api/map KOREA_ALL | 200 | ok:true, source:dynamic | PASS |
| /api/map SEOUL_ALL | 200 | ok:true, source:dynamic | PASS |
| /api/map SGG_29110 | 200 | ok:true, count 1 | PASS |
| /api/map SGG_29140 | 200 | ok:true, count 1 | PASS |
| /api/search KOREA_ALL q=서울 | 200 | ok:true | PASS |
| /api/search SEOUL_ALL q=서울 | 200 | ok:true | PASS |
| /api/search SGG_29140 q=광주 | 200 | ok:true | PASS |

## 6. Production UX Verification
- Mobile 390px DOM check passed.
- clientWidth=390, scrollWidth=390.
- No horizontal overflow.
- First-screen value proposition visible.
- KOAPTIX 500 explanation visible.
- Search/region controls visible.
- `SGG in scope` absent.
- Human eyes-on browser confirmation is still optional but not blocking.

## 7. Interpretation
- fb27b9a UX/copy/mobile polish is production-verified.
- Production can remain on fb27b9a.
- Rollback is not indicated.
- No API/data/source-of-truth regression was observed.
- Batch-32 remains paused.
- Product UX improvement is now live after enabled-80 deployment.

## 8. Current Operational State
- Enabled SGG count: 80
- Last enabled order: 180
- Batch-31 complete
- Batch-32 paused
- No batch-32 readiness scan started
- No additional SGG opened
- Source of truth unchanged
- KOREA_ALL engine untouched

## 9. Remaining Watch Items
- Continue normal Vercel/Supabase monitoring.
- If future timeout appears, inspect Vercel/Supabase logs and delivery path before source-of-truth changes.
- `smoke:regional` can take several minutes at enabled-80; this is a harness runtime-budget watch item.
- The attached previous visual mockup can be considered later as a KOAPTIX Visual System v1 reference, not as an immediate full redesign.
- Do not resume batch-32 until explicitly requested.

## 10. What Was Not Done
- No product code changes in this docs task.
- No script changes.
- No SQL/RLS/Supabase changes.
- No Vercel settings/domain/env changes.
- No DNS changes.
- No registry edits.
- No source-of-truth changes.
- No batch-32.
- No secrets printed.

## 11. Next Recommended Step
- Keep production on fb27b9a.
- Preserve the docs checkpoint on remote checkpoint branch only.
- Recommended next workstreams:
  1. light post-UX monitoring
  2. next product UX/business planning
  3. harness observability/runtime-budget improvement
  4. later KOAPTIX Visual System v1 planning
- Batch-32 should remain paused unless explicitly restarted.
